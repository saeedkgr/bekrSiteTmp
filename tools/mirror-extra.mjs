// Second pass: assets referenced on the old bekrpardazan.net/.ir domains and WordPress emoji SVGs.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
const M = join(import.meta.dirname, '..', 'mirror')
async function* walk(d) { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); e.isDirectory() ? yield* walk(p) : yield p } }
const refs = new Set(), emoji = new Set()
for (const dir of ['html', 'api']) for await (const f of walk(join(M, dir))) {
  const t = (await readFile(f, 'utf8')).replace(/\\\//g, '/')
  for (const m of t.matchAll(/https?:\/\/(?:www\.)?bekrpardazan\.(?:net|ir)(\/wp-content\/[^"' )<\\]+)/g)) refs.add(m[1].split('&quot;')[0].replace(/&amp;/g, '&'))
  for (const m of t.matchAll(/https:\/\/s\.w\.org\/images\/core\/emoji\/[\d.]+\/svg\/([\w-]+)\.svg/g)) emoji.add(m[0])
}
const out = [], fail = []
async function dl(urls, dest) {
  if (existsSync(dest)) return
  for (const u of urls) {
    try { const r = await fetch(u); if (r.ok) { await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, Buffer.from(await r.arrayBuffer())); out.push(u); return } } catch {}
  }
  fail.push(urls[0])
}
for (const p of refs) await dl(['https://www.bekrpardazan.com' + p, 'https://www.bekrpardazan.net' + p, 'https://www.bekrpardazan.ir' + p], join(M, 'files', decodeURIComponent(p.split('?')[0])))
for (const u of emoji) await dl([u], join(M, 'files', 'emoji', u.split('/').pop()))
console.log('downloaded', out.length, 'failed', fail.length); fail.forEach(f => console.log('fail', f))
