// Lists every public URL, like the original wp-sitemap.xml.
export default defineEventHandler(async (event) => {
  const origin = getRequestURL(event).origin
  const paths = Object.keys(await routeIndex()).sort()
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    paths.map(p => `<url><loc>${origin}${encodeURI(p)}</loc></url>`).join('\n')}\n</urlset>\n`
})
