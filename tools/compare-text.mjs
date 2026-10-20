// Compares the visible text of #content on every mirrored WordPress page with the generated static page.
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
const ROOT = join(import.meta.dirname, '..')
const index = JSON.parse(await readFile(join(ROOT, 'data/index.json'), 'utf8'))
const text = html => {
  const s = html.indexOf('<div id="content">'), e = [html.indexOf('<div id="secondary"'), html.indexOf('<footer id="colophon"'), html.indexOf('<footer class="bg-white')].filter(i => i > 0).sort((x, y) => x - y)[0]
  return html.slice(s, e > s ? e : undefined)
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&hellip;/g, '…').replace(/&[lr]aquo;/g, '').replace(/&[lr]arr;/g, '')
    .replace(/[«»←→]/g, '').replace(/\s+/g, ' ').trim()
}
let same = 0; const diffs = []
for (const [path, { type }] of Object.entries(index)) {
  if (type === 'home') continue
  const live = join(ROOT, 'mirror/html', (path.replace(/\/$/, '') || '/index') + '.html')
  const ours = join(ROOT, '.output/public', path, 'index.html')
  if (!existsSync(live) || !existsSync(ours)) continue
  const a = text(await readFile(live, 'utf8')), b = text(await readFile(ours, 'utf8'))
  if (a === b) same++
  else { let i = 0; while (a[i] === b[i]) i++; diffs.push([path, a.slice(Math.max(0, i - 40), i + 60), '|||', b.slice(Math.max(0, i - 40), i + 60)]) }
}
console.log('identical text:', same, 'different:', diffs.length)
for (const d of diffs.slice(0, 15)) console.log(d.join('\n  '), '\n')
