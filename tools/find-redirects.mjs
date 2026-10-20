// Finds internal links in the mirrored content that point at URLs WordPress answered with a redirect
// (Redirection plugin rules, renamed slugs) and records where they lead, in mirror/redirects.json.
// Run after tools/mirror.mjs; tools/import.mjs turns the result into Nuxt route rules.
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
const M = join(import.meta.dirname, '..', 'mirror')
const BASE = 'https://www.bekrpardazan.com'
async function* walk(d) { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); e.isDirectory() ? yield* walk(p) : yield p } }
const known = new Set((JSON.parse(await readFile(join(M, 'urls.json'), 'utf8'))).map(u => decodeURIComponent(new URL(u).pathname)))
const candidates = new Set()
for await (const f of walk(join(M, 'html'))) {
  const html = await readFile(f, 'utf8')
  for (const m of html.matchAll(/href="(?:https?:)?\/\/(?:www\.)?bekrpardazan\.(?:com|net|ir)(\/[^"#?]*)"/g)) {
    let p; try { p = decodeURIComponent(m[1]) } catch { continue }
    if (/^\/(wp-|feed|comments|xmlrpc)/.test(p) || /\.\w{2,4}$/.test(p)) continue
    if (!p.endsWith('/')) p += '/'
    if (!known.has(p)) candidates.add(p)
  }
}
const redirects = {}
for (const p of candidates) {
  const r = await fetch(BASE + encodeURI(p), { redirect: 'manual' }).catch(() => null)
  if (!r) continue
  let to = null
  if (r.status >= 300 && r.status < 400) to = decodeURIComponent(new URL(r.headers.get('location'), BASE).pathname)
  else if (r.ok) {
    const canon = /<link rel="canonical" href="([^"]+)"/.exec(await r.text())?.[1]
    if (canon) to = decodeURIComponent(new URL(canon).pathname)
  }
  if (to && to !== p) redirects[p] = to
  console.log(r.status, p, '->', to)
}
await writeFile(join(M, 'redirects.json'), JSON.stringify(redirects, null, 1))
console.log(Object.keys(redirects).length, 'redirects')
