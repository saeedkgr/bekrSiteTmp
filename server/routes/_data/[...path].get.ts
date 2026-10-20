// Serves /_data/** (generated JSON in public/_data) to server-side rendering and prerendering.
// Static hosts serve the same files straight from public/, so the client fetches them without a server.
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  if (!/^[\w/-]+\.json$/.test(path)) throw createError({ statusCode: 404 })
  const data = await useStorage('assets:data').getItem(path.replaceAll('/', ':'))
  if (data == null) throw createError({ statusCode: 404 })
  return data
})
