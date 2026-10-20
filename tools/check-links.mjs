// Checks every internal link and asset referenced from the generated static site (.output/public).
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
const PUB = join(import.meta.dirname, '..', '.output', 'public')
async function* walk(d) { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); e.isDirectory() ? yield* walk(p) : yield p } }
const missing = new Map()
let pages = 0
for await (const f of walk(PUB)) {
  if (!f.endsWith('.html')) continue
  pages++
  const html = await readFile(f, 'utf8')
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"|srcset="([^"]+)"|url\(&#39;([^&]+)&#39;\)|url\('([^']+)'\)/g)) {
    const urls = m[2] ? m[2].split(',').map(s => s.trim().split(/\s+/)[0]) : [m[1] || m[3] || m[4]]
    for (let u of urls) {
      if (!u || !u.startsWith('/') || u.startsWith('//') || u.startsWith('/_nuxt/')) continue
      u = u.split('#')[0].split('?')[0].replace(/&amp;/g, '&')
      let p; try { p = decodeURIComponent(u) } catch { p = u }
      const ok = existsSync(join(PUB, p)) && (!p.endsWith('/') || existsSync(join(PUB, p, 'index.html')))
      if (!ok && !existsSync(join(PUB, p, 'index.html'))) {
        if (!missing.has(p)) missing.set(p, new Set())
        missing.get(p).add(f.slice(PUB.length).replaceAll('\\', '/'))
      }
    }
  }
}
console.log(`checked ${pages} pages, ${missing.size} missing targets`)
for (const [p, from] of [...missing].sort()) console.log(p, '<-', [...from].slice(0, 2).join(', '), from.size > 2 ? `(+${from.size - 2})` : '')
