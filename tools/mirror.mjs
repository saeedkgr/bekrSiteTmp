// Mirrors the public content of bekrpardazan.com into ./mirror
//   mirror/api/*.json        WordPress REST data (pages, posts, media, taxonomies, users, comments)
//   mirror/html/<path>.html  rendered HTML for every public URL (sitemap + archives)
//   mirror/files/<path>      every wp-content / wp-includes asset referenced (uploads, css, js, fonts)
// Usage: node tools/mirror.mjs
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const BASE = 'https://www.bekrpardazan.com'
const OUT = join(import.meta.dirname, '..', 'mirror')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

const exists = p => access(p).then(() => true, () => false)
async function save(p, data) { await mkdir(dirname(p), { recursive: true }); await writeFile(p, data) }

async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA } })
      if (r.status === 404 || r.status === 403) return r
      if (r.ok) return r
    } catch {}
    await new Promise(res => setTimeout(res, 1000 * 2 ** i))
  }
  return null
}

async function pool(items, n, fn) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]) }))
}

async function collection(name, extra = '') {
  const all = []
  for (let page = 1; ; page++) {
    const r = await get(`${BASE}/wp-json/wp/v2/${name}?per_page=100&page=${page}${extra}`)
    if (!r || !r.ok) break
    const items = await r.json()
    all.push(...items)
    if (page >= Number(r.headers.get('x-wp-totalpages') || 1)) break
  }
  await save(join(OUT, 'api', `${name}.json`), JSON.stringify(all, null, 1))
  console.log(`api ${name}: ${all.length}`)
  return all
}

const assets = new Set()
const ASSET_RE = /https?:\/\/(?:www\.)?bekrpardazan\.com\/(?:wp-content|wp-includes)\/[^\s"'()<>\\]+/g
const REL_RE = /(?<=["'(])\/(?:wp-content|wp-includes)\/[^\s"'()<>\\]+/g
function collectAssets(text) {
  const t = text.replace(/\\\//g, '/')
  for (const m of t.matchAll(ASSET_RE)) assets.add(m[0].replace(/^https?:\/\/bekrpardazan/, 'https://www.bekrpardazan').replace(/&#0?38;|&amp;/g, '&'))
  for (const m of t.matchAll(REL_RE)) assets.add(BASE + m[0].replace(/&#0?38;|&amp;/g, '&'))
}

function localPath(url) {
  const u = new URL(url)
  return join(OUT, 'files', decodeURIComponent(u.pathname))
}

function htmlPath(url) {
  let p = decodeURIComponent(new URL(url).pathname).replace(/\/$/, '')
  return join(OUT, 'html', (p || '/index') + '.html')
}

// 1. REST data
const types = ['pages', 'posts', 'media', 'categories', 'tags', 'users', 'comments']
const data = {}
for (const t of types) data[t] = await collection(t, t === 'pages' || t === 'posts' ? '&_embed=1' : '')
for (const ep of ['', 'settings']) {
  const r = await get(`${BASE}/wp-json/${ep}`); if (r?.ok) await save(join(OUT, 'api', `root${ep ? '-' + ep : ''}.json`), await r.text())
}
for (const t of types) collectAssets(JSON.stringify(data[t]))
for (const m of data.media) {
  assets.add(m.source_url)
  for (const s of Object.values(m.media_details?.sizes || {})) assets.add(s.source_url)
}

// 2. Rendered HTML for every public URL
const urls = new Set([BASE + '/'])
const idx = await (await get(`${BASE}/wp-sitemap.xml`)).text()
for (const sm of idx.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const x = await (await get(sm[1])).text()
  for (const m of x.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1])
}
for (const t of data.tags) urls.add(t.link)
for (const c of data.categories) urls.add(c.link)
// paginated archives
const htmlFetch = async url => {
  const r = await get(url)
  if (!r || !r.ok) { console.log('html fail', r?.status, url); return }
  const html = await r.text()
  await save(htmlPath(url), html)
  collectAssets(html)
  for (const m of html.matchAll(/href="(https:\/\/www\.bekrpardazan\.com\/[^"#?]*\/page\/\d+\/)"/g)) {
    if (!urls.has(m[1])) { urls.add(m[1]); queue.push(m[1]) }
  }
}
const queue = [...urls]
await pool(queue, 6, htmlFetch)
await save(join(OUT, 'urls.json'), JSON.stringify([...urls].sort(), null, 1))
console.log(`html: ${urls.size}`)

// 3. Assets (and assets referenced from CSS: fonts, background images)
const done = new Set()
let round = 0
while (true) {
  const todo = [...assets].filter(a => !done.has(a))
  if (!todo.length) break
  console.log(`assets round ${++round}: ${todo.length}`)
  await pool(todo, 8, async url => {
    done.add(url)
    const clean = url.split('#')[0]
    const p = localPath(clean)
    const isCss = /\.css(\?|$)/.test(clean)
    if (!isCss && await exists(p)) return
    const r = await get(clean)
    if (!r || !r.ok) { console.log('asset fail', r?.status, clean); return }
    const buf = Buffer.from(await r.arrayBuffer())
    await save(p, buf)
    if (isCss) {
      const css = buf.toString('utf8')
      for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        if (m[1].startsWith('data:')) continue
        try { const abs = new URL(m[1], clean).href; if (abs.includes('bekrpardazan.com/wp-')) assets.add(abs) } catch {}
      }
      collectAssets(css)
    }
  })
}
await save(join(OUT, 'assets.json'), JSON.stringify([...done].sort(), null, 1))
console.log('done')
