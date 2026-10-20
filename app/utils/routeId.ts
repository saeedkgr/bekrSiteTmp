// Same FNV-1a id that tools/import.mjs uses to name /_data/routes/<id>.json.
export function routeId(path: string) {
  let h = 0x811C9DC5
  for (const b of new TextEncoder().encode(path)) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// WordPress-style path: decoded, with a trailing slash.
export function normalizePath(path: string) {
  let p = path.split('?')[0]!.split('#')[0]!
  try { p = decodeURIComponent(p) } catch {}
  if (!p.startsWith('/')) p = '/' + p
  if (!p.endsWith('/')) p += '/'
  return p
}
