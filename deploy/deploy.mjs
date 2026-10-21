#!/usr/bin/env node
// Deploys the static Nuxt build to cPanel (see DEPLOY.md).
//
//   pnpm run deploy                 build, pack, upload, swap in
//   pnpm run deploy --skip-build    reuse the current .output/public
//   pnpm run deploy --dry-run       build and pack only, never contact the server
//   pnpm run deploy --rollback      swap the previous build back in
//
// The build is packed without wp-uploads/ (the root .htaccess serves /wp-uploads/ from
// /old/wp-content/uploads), uploaded in one request, and unpacked into ~/deploy/new, outside
// public_html. Then public_html/new moves to ~/deploy-prev/new and ~/deploy/new moves to
// public_html/new, so the live site only changes in that last pair of moves.
// The host's firewall blocks IPs that send bursts of requests, so every call here is sequential
// with a pause, and the whole deploy is about a dozen requests.

import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const root = path.resolve(import.meta.dirname, '..')
const buildDir = path.join(root, '.output', 'public')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const skipBuild = args.has('--skip-build')
const rollback = args.has('--rollback')

const log = (msg) => console.log(`[deploy] ${msg}`)
const fail = (msg) => { console.error(`[deploy] ERROR: ${msg}`); process.exit(1) }

// ---------- settings ----------

function loadEnv(file) {
  if (!existsSync(file)) return {}
  const env = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return env
}

const env = { ...loadEnv(path.join(import.meta.dirname, '.env.deploy')), ...process.env }
const cfg = {
  host: env.CPANEL_HOST,
  port: Number(env.CPANEL_PORT || 2083),
  servername: env.CPANEL_SERVERNAME || 'bekrpardazan.com',
  user: env.CPANEL_USER,
  token: env.CPANEL_TOKEN,
  siteUrl: env.SITE_URL || 'https://www.bekrpardazan.com/',
  pause: Number(env.DEPLOY_PAUSE_MS || 1500),
}
const home = `/home/${cfg.user}`
const live = `${home}/public_html/new`
const work = `${home}/deploy`
const prev = `${home}/deploy-prev`

if (!dryRun) {
  for (const key of ['CPANEL_HOST', 'CPANEL_USER', 'CPANEL_TOKEN'])
    if (!env[key]) fail(`${key} is missing. Copy deploy/.env.deploy.example to deploy/.env.deploy and fill it in.`)
}

// ---------- cPanel API ----------

let lastCall = 0
function request(method, apiPath, { query = {}, body, headers = {} } = {}) {
  const qs = new URLSearchParams(query).toString()
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: cfg.host,
      port: cfg.port,
      servername: cfg.servername, // cPanel's certificate is for the domain, not the IP
      method,
      path: apiPath + (qs ? `?${qs}` : ''),
      headers: { Authorization: `cpanel ${cfg.user}:${cfg.token}`, ...headers },
      timeout: 300_000,
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`${apiPath} returned HTTP ${res.statusCode}: ${data.slice(0, 300)}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`${apiPath} did not return JSON: ${data.slice(0, 300)}`)) }
      })
    })
    req.on('timeout', () => req.destroy(new Error(`${apiPath} timed out`)))
    req.on('error', reject)
    if (body && typeof body.pipe === 'function') body.pipe(req)
    else req.end(body)
  })
}

// One call at a time, with a pause in between, so the firewall doesn't see a burst.
async function call(method, apiPath, opts) {
  const wait = lastCall + cfg.pause - Date.now()
  if (wait > 0) await sleep(wait)
  try { return await request(method, apiPath, opts) } finally { lastCall = Date.now() }
}

async function uapi(module, fn, query = {}) {
  const res = await call('GET', `/execute/${module}/${fn}`, { query })
  if (!res.status) throw new Error(`${module}::${fn} failed: ${(res.errors || []).join('; ')}`)
  return res.data
}

async function api2(module, fn, query = {}) {
  const res = await call('GET', '/json-api/cpanel', {
    query: { cpanel_jsonapi_user: cfg.user, cpanel_jsonapi_apiversion: 2, cpanel_jsonapi_module: module, cpanel_jsonapi_func: fn, ...query },
  })
  const r = res.cpanelresult || {}
  const bad = r.error || r.event?.result === 0 || (r.data || []).find((d) => d && d.result === 0)
  if (bad) throw new Error(`${module}::${fn} failed: ${r.error || bad.reason || JSON.stringify(r.data)}`)
  return r.data
}

// API 2 fileop: move and unlink take comma separated paths; move puts sources inside destfiles.
const move = (src, destDir) => api2('Fileman', 'fileop', { op: 'move', sourcefiles: src, destfiles: destDir, doubledecode: 0 })
const unlink = (paths) => api2('Fileman', 'fileop', { op: 'unlink', sourcefiles: paths.join(','), doubledecode: 0 })

async function listDir(dir) {
  const data = await uapi('Fileman', 'list_files', { dir, include_mime: 0, include_permissions: 0 })
  return new Map(data.map((f) => [f.file, f]))
}

async function ensureDir(dir) {
  const parent = path.posix.dirname(dir)
  const name = path.posix.basename(dir)
  const entries = await listDir(parent)
  if (entries.has(name)) return listDir(dir)
  await api2('Fileman', 'mkdir', { path: parent, name, permissions: '0755' })
  return new Map()
}

async function upload(file, dir) {
  const boundary = `----bekrdeploy${Date.now().toString(16)}`
  const field = (name, value) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
  const head = field('dir', dir) + field('overwrite', '1')
    + `--${boundary}\r\nContent-Disposition: form-data; name="file-1"; filename="${path.basename(file)}"\r\nContent-Type: application/gzip\r\n\r\n`
  const tail = `\r\n--${boundary}--\r\n`
  const size = Buffer.byteLength(head) + statSync(file).size + Buffer.byteLength(tail)
  const { Readable } = await import('node:stream')
  const body = Readable.from((async function* () {
    yield Buffer.from(head)
    yield* createReadStream(file)
    yield Buffer.from(tail)
  })())
  const res = await call('POST', '/execute/Fileman/upload_files', {
    body,
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': size },
  })
  if (!res.status || res.data?.failed) throw new Error(`upload failed: ${JSON.stringify(res.errors || res.data)}`)
}

// ---------- local build ----------

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' && cmd === 'pnpm', ...opts })
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} exited with ${r.status ?? r.error}`)
}

function dirSize(dir) {
  let total = 0
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    total += e.isDirectory() ? dirSize(p) : statSync(p).size
  }
  return total
}

// GNU tar, which keeps the Persian file names as UTF-8. Windows' own tar.exe (bsdtar) fails on
// them, so on Windows this uses the tar that comes with Git for Windows.
function findTar() {
  if (process.platform !== 'win32') return 'tar'
  const gitDirs = (spawnSync('where', ['git'], { encoding: 'utf8' }).stdout || '').split(/\r?\n/).filter(Boolean)
    .map((git) => path.resolve(path.dirname(git), '..'))
  const candidates = [env.GNU_TAR, ...gitDirs.map((d) => path.join(d, 'usr', 'bin', 'tar.exe')), 'C:\\Program Files\\Git\\usr\\bin\\tar.exe']
  const tar = candidates.find((p) => p && existsSync(p))
  if (!tar) throw new Error('GNU tar not found; install Git for Windows or set GNU_TAR in deploy/.env.deploy')
  return tar
}

// Packs .output/public, minus wp-uploads/, as a .tar.gz.
function pack(out) {
  // --force-local stops GNU tar from reading "C:" in the output path as a remote host.
  run(findTar(), ['--force-local', '-czf', out, '--exclude=./wp-uploads', '.'], { cwd: buildDir })
}

// ---------- steps ----------

async function deploy() {
  if (!skipBuild) {
    log('building with nuxt generate ...')
    run('pnpm', ['generate'])
  }
  if (!existsSync(path.join(buildDir, 'index.html'))) fail(`${buildDir} has no index.html; run without --skip-build`)

  const name = `nuxt-site-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.tar.gz`
  const archive = path.join(os.tmpdir(), name)
  try {
    const uploadsDir = path.join(buildDir, 'wp-uploads')
    const siteMb = (dirSize(buildDir) - (existsSync(uploadsDir) ? dirSize(uploadsDir) : 0)) / 1048576
    pack(archive)
    const archiveMb = statSync(archive).size / 1048576
    log(`packed ${siteMb.toFixed(1)} MB of site into ${archiveMb.toFixed(1)} MB (${archive})`)
    if (dryRun) return log('dry run: stopping before contacting the server')

    // The build before the current one is deleted first: the disk is nearly full.
    log(`preparing ~/deploy and ~/deploy-prev on ${cfg.host} ...`)
    const workEntries = await ensureDir(work)
    const prevEntries = await ensureDir(prev)
    const stale = [...[...workEntries.keys()].map((f) => `${work}/${f}`), ...[...prevEntries.keys()].map((f) => `${prev}/${f}`)]
    if (stale.length) { log(`removing ${stale.length} old entries: ${stale.join(', ')}`); await unlink(stale) }

    const q = await uapi('Quota', 'get_quota_info')
    const limit = Number(q.megabyte_limit) || 0
    if (limit > 0) {
      const free = q.megabytes_remain != null ? Number(q.megabytes_remain) : limit - Number(q.megabytes_used)
      const need = siteMb + archiveMb + 5
      log(`disk: ${free.toFixed(0)} MB free, about ${need.toFixed(0)} MB needed`)
      if (free < need) throw new Error('not enough disk space on the server; the live site was not touched')
    }

    log(`uploading ${name} ...`)
    await upload(archive, work)

    log('extracting into ~/deploy/new ...')
    await ensureDir(`${work}/new`)
    await api2('Fileman', 'fileop', { op: 'extract', sourcefiles: `${work}/${name}`, destfiles: `${work}/new`, doubledecode: 0 })
    const staged = await listDir(`${work}/new`)
    if (!staged.has('index.html') || !staged.has('_nuxt')) throw new Error('the extracted build has no index.html or _nuxt/; the live site was not touched')
    log(`extracted ${staged.size} top-level entries`)

    log('swapping: public_html/new -> ~/deploy-prev/new, ~/deploy/new -> public_html/new ...')
    await move(live, prev)
    try {
      await move(`${work}/new`, `${home}/public_html`)
    } catch (err) {
      log('second move failed, putting the previous build back ...')
      await move(`${prev}/new`, `${home}/public_html`)
      throw err
    }

    log('removing the uploaded archive ...')
    await unlink([`${work}/${name}`])

    await checkSite()
    log('done. The previous build is in ~/deploy-prev/new; `pnpm run deploy --rollback` swaps it back.')
  } finally {
    rmSync(archive, { force: true })
  }
}

async function doRollback() {
  const prevEntries = await listDir(prev)
  if (!prevEntries.has('new')) fail('~/deploy-prev/new does not exist, so there is nothing to roll back to')
  const workEntries = await ensureDir(work)
  if (workEntries.has('new')) await unlink([`${work}/new`])
  log('moving public_html/new -> ~/deploy/new, ~/deploy-prev/new -> public_html/new ...')
  await move(live, work)
  await move(`${prev}/new`, `${home}/public_html`)
  log('keeping the build that was rolled back as ~/deploy-prev/new ...')
  await move(`${work}/new`, prev)
  await checkSite()
  log('rolled back')
}

async function checkSite() {
  await sleep(cfg.pause)
  const res = await fetch(cfg.siteUrl, { redirect: 'manual' }).catch((err) => ({ status: err.message }))
  log(`${cfg.siteUrl} -> ${res.status}`)
  if (res.status !== 200) log('WARNING: the home page did not return 200; check the site in a browser')
}

try {
  await (rollback ? doRollback() : deploy())
} catch (err) {
  fail(err.message)
}
