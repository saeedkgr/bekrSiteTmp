// Minimal static file server for checking the generated site (.output/public) the way a static host serves it.
// Usage: node tools/serve-static.mjs [port]
import { createServer } from 'node:http'
import { createReadStream, statSync, existsSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
const ROOT = join(import.meta.dirname, '..', '.output', 'public')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.xml': 'application/xml', '.ico': 'image/x-icon' }
const port = Number(process.env.PORT || process.argv[2] || 4000)
createServer((req, res) => {
  let p
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname) } catch { res.writeHead(400).end(); return }
  let f = normalize(join(ROOT, p))
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return }
  if (existsSync(f) && statSync(f).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { location: req.url.replace(/(\?|$)/, '/$1') }).end(); return }
    f = join(f, 'index.html')
  }
  let status = 200
  if (!existsSync(f)) { f = join(ROOT, '404.html'); status = 404 }
  res.writeHead(status, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream' })
  createReadStream(f).pipe(res)
}).listen(port, () => console.log(`Serving ${ROOT} on http://localhost:${port}`))
