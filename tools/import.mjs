// Converts the raw mirror (./mirror) into the data and static files the Nuxt app uses.
//   public/_data/routes/<id>.json  one file per public URL (page, post, archive), fetched by the app
//   data/index.json         path -> route id + type (prerender list, sitemap)
//   public/_data/site.json  menu and footer widgets; public/_data/search.json: search index
//   public/wp-content/...   uploads, theme/plugin css, fonts, images
//   public/legacy.css       original WordPress/Elementor/theme CSS wrapped in the low-priority "legacy" cascade layer
// Usage: node tools/import.mjs
import { readFile, writeFile, mkdir, cp, rm, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { transform } from 'lightningcss'

const ROOT = join(import.meta.dirname, '..')
const M = join(ROOT, 'mirror')
const DATA = join(ROOT, 'data')
const BASE = 'https://www.bekrpardazan.com'

const read = async p => readFile(p, 'utf8')
const json = async p => JSON.parse(await read(p))
async function save(p, d) { await mkdir(dirname(p), { recursive: true }); await writeFile(p, typeof d === 'string' ? d : JSON.stringify(d)) }
// Route data file name: FNV-1a of the decoded path. app/utils/routeId.ts computes the same id in the browser.
const hash = s => { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0 } return h.toString(16).padStart(8, '0') }
const OUT = join(ROOT, 'public', '_data')

// ---------- helpers ----------
const decodePath = p => { try { return decodeURIComponent(p) } catch { return p } }
const toPath = url => {
  const u = new URL(url, BASE)
  let p = decodePath(u.pathname)
  if (!p.endsWith('/')) p += '/'
  return p
}

function fileExists(urlPath) {
  return existsSync(join(M, 'files', decodePath(urlPath.split('?')[0].split('#')[0])))
}

// Rewrites absolute site URLs to root-relative ones. Assets on the old .net domain are served locally when mirrored.
function rewrite(html) {
  return html
    .replace(/https?:(?:\\\/\\\/|\/\/)(?:www\.)?bekrpardazan\.(?:com|net|ir)(?=[\/\\"'\s<])/g, '')
    .replace(/(^|["'(\s,])\/\/(?:www\.)?bekrpardazan\.(?:com|net|ir)(?=\/)/g, '$1')
    .replace(/https:\/\/s\.w\.org\/images\/core\/emoji\/[\d.]+\/svg\/([\w-]+)\.svg/g, '/emoji/$1.svg')
}

function between(html, start, endMarkers) {
  const s = html.indexOf(start)
  if (s < 0) return null
  return html.slice(s, html.length)
}

// Extracts the inner HTML of the first element matching an opening tag, honoring nested <div>s / <section>s.
function innerOf(html, openRe, tag = 'div') {
  const m = openRe.exec(html)
  if (!m) return null
  let i = m.index + m[0].length
  let depth = 1
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi')
  re.lastIndex = i
  let t
  while ((t = re.exec(html))) {
    if (t[0].endsWith('/>')) continue
    depth += t[1] ? -1 : 1
    if (depth === 0) return html.slice(i, t.index)
  }
  return html.slice(i)
}

function attr(tag, name) {
  const m = new RegExp(`${name}=(["'])(.*?)\\1`, 's').exec(tag)
  return m ? m[2] : null
}

const decodeEntities = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const strip = s => decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

// WordPress plugins the rebuild does not use: their files are not copied and their stylesheets are not loaded.
const UNUSED_PLUGINS = ['animate-it', 'carousel-slider', 'post-slider-and-carousel', 'smart-slider-3', 'persian-elementor']
const UNUSED_PLUGIN = new RegExp(`^/wp-content/plugins/(${UNUSED_PLUGINS.join('|')})(/|$)`)

// Per-page styles: stylesheet links (local path) and inline <style> blocks, minus the globally bundled ones.
const GLOBAL_STYLE_IDS = new Set(['wp-emoji-styles-inline-css', 'classic-theme-styles-inline-css', 'global-styles-inline-css'])
function pageStyles(html, globalLinks) {
  const links = []
  for (const m of html.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*>/g)) {
    const href = attr(m[0], 'href')
    if (!href || !/bekrpardazan/.test(href)) continue
    const p = new URL(href, BASE).pathname
    if (globalLinks.has(p) || UNUSED_PLUGIN.test(p)) continue
    links.push(decodePath(p))
  }
  const inline = []
  for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    const id = attr(m[1], 'id')
    if (id && GLOBAL_STYLE_IDS.has(id)) continue
    // Smart Slider 3 writes each slider's CSS inline; the home page slider is now HomePage.vue.
    if (/^n2-ss-/.test(attr(m[1], 'data-related') || '')) continue
    if (/img:is\(\[sizes="auto"/.test(m[2])) continue
    inline.push(rewrite(m[2].trim()))
  }
  return { links: [...new Set(links)], inline }
}

function meta(html) {
  const title = decodeEntities((/<title>([\s\S]*?)<\/title>/.exec(html) || [])[1] || '').trim()
  const description = decodeEntities(attr((/<meta name=["']description["'][^>]*>/.exec(html) || [''])[0], 'content') || '')
  const bodyClass = attr((/<body[^>]*>/.exec(html) || [''])[0], 'class') || ''
  return { title, description, bodyClass: bodyClass.trim().replace(/\s+/g, ' ') }
}

// ---------- load raw data ----------
const pages = await json(join(M, 'api/pages.json'))
const posts = await json(join(M, 'api/posts.json'))
const media = await json(join(M, 'api/media.json'))
const categories = await json(join(M, 'api/categories.json'))
const tags = await json(join(M, 'api/tags.json'))
const users = await json(join(M, 'api/users.json'))
const root = await json(join(M, 'api/root.json'))
const urls = await json(join(M, 'urls.json'))

const htmlFile = url => {
  let p = decodePath(new URL(url).pathname).replace(/\/$/, '')
  return join(M, 'html', (p || '/index') + '.html')
}

// ---------- global stylesheets (bundled into legacy.css) ----------
const home = await read(htmlFile(BASE + '/'))
const GLOBAL_LINK_ORDER = []
for (const m of home.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*>/g)) {
  const href = attr(m[0], 'href')
  if (!href || !/bekrpardazan/.test(href)) continue
  const p = new URL(href, BASE).pathname
  if (!UNUSED_PLUGIN.test(p)) GLOBAL_LINK_ORDER.push(p)
}
// Elementor base styles are used by almost every inner page; bundle them too.
const sample = await read(htmlFile(posts[0].link))
for (const m of sample.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*>/g)) {
  const href = attr(m[0], 'href')
  if (!href || !/bekrpardazan/.test(href)) continue
  const p = new URL(href, BASE).pathname
  // Per-post Elementor CSS stays per page, except the site-wide kit (post-2602).
  if (/\/uploads\/elementor\/css\/post-\d+\.css$/.test(p) && !/post-2602\.css$/.test(p)) continue
  if (UNUSED_PLUGIN.test(p)) continue
  if (!GLOBAL_LINK_ORDER.includes(p)) GLOBAL_LINK_ORDER.push(p)
}
const globalLinks = new Set(GLOBAL_LINK_ORDER)

let legacy = '/* Generated by tools/import.mjs from the original WordPress stylesheets. Do not edit by hand. */\n'
for (const p of GLOBAL_LINK_ORDER) {
  const f = join(M, 'files', decodePath(p))
  if (!existsSync(f)) { console.warn('missing css', p); continue }
  let css = await read(f)
  const dir = dirname(decodePath(p)) + '/'
  css = css.replace(/@charset[^;]+;/g, '')
  // Absolute-ize relative url()s so they resolve against /public
  css = css.replace(/url\(\s*(['"]?)(?!data:|https?:|\/)([^'")]+)\1\s*\)/g, (_, q, u) => `url("${new URL(u, 'http://x' + dir).pathname}")`)
  css = rewrite(css)
  // Fix broken font format hints in the child theme so browsers pick the right file
  css = css.replace(/format\('otf'\)/g, "format('opentype')").replace(/format\('ttf'\)/g, "format('truetype')")
  // @import inside a file cannot be layered; inline-drop them (only google fonts in practice)
  css = css.replace(/@import[^;]+;/g, '')
  legacy += `\n/* ${p} */\n${css}\n`
}
for (const m of home.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
  const id = attr(m[1], 'id')
  if (id && GLOBAL_STYLE_IDS.has(id)) legacy += `\n/* inline #${id} */\n${rewrite(m[2])}\n`
}
// Browsers silently skip the theme's malformed rules; Tailwind's parser does not, so drop them the same way here.
const cleaned = transform({ filename: 'legacy.css', code: Buffer.from(legacy), errorRecovery: true, minify: false })
console.log('legacy css warnings dropped:', cleaned.warnings.length)
// PostCSS (used by Tailwind) is stricter still: drop each line it rejects, as a browser drops the invalid declaration.
{
  const { default: postcss } = await import('postcss')
  let lines = cleaned.code.toString().split('\n')
  for (let i = 0; i < 100; i++) {
    try { postcss.parse(lines.join('\n')); break } catch (e) {
      console.log('dropping invalid css line', e.line, lines[e.line - 1].trim().slice(0, 80))
      lines.splice(e.line - 1, 1)
    }
  }
  cleaned.code = Buffer.from(lines.join('\n'))
}
await save(join(ROOT, 'public/legacy.css'),
  `/* Generated by tools/import.mjs from the original WordPress stylesheets. Do not edit by hand. */\n@layer legacy {\n${cleaned.code}\n}\n`)

// ---------- lookups ----------
const mediaById = new Map(media.map(m => [m.id, m]))
const catById = new Map(categories.map(c => [c.id, c]))
const tagById = new Map(tags.map(t => [t.id, t]))
const userById = new Map(users.map(u => [u.id, u]))
const linkOf = x => toPath(x.link)

const index = {}
const addRoute = async (path, type, data) => {
  const id = hash(path)
  index[path] = { id, type }
  await save(join(OUT, 'routes', id + '.json'), { path, type, ...data })
}

// Shared extraction of a singular page/post from its rendered HTML.
async function singular(item, type) {
  const f = htmlFile(item.link)
  if (!existsSync(f)) { console.warn('no html', item.link); return null }
  const html = await read(f)
  const content = innerOf(html, /<div class="entry-content clearfix">/g) ?? ''
  const titleHtml = (/<h[12] class="entry-title">([\s\S]*?)<\/h[12]>/.exec(html) || [])[1]
  return {
    ...meta(html),
    id: item.id,
    heading: titleHtml ? strip(titleHtml) : null,
    html: rewrite(content.trim()),
    styles: pageStyles(html, globalLinks),
    hasSidebar: /<div id="secondary"[^>]*>\s*<aside/.test(html),
    sidebar: (() => { const s = innerOf(html, /<div id="secondary"[^>]*>/g); return s && s.trim() ? rewrite(s.trim()) : null })(),
  }
}

const featured = p => {
  const m = mediaById.get(p.featured_media) || p._embedded?.['wp:featuredmedia']?.[0]
  if (!m || !m.source_url) return null
  const sizes = m.media_details?.sizes || {}
  const pick = s => sizes[s]?.source_url
  return {
    src: rewrite(m.source_url),
    medium: rewrite(pick('medium_large') || pick('large') || m.source_url),
    thumb: rewrite(pick('thumbnail') || m.source_url),
    alt: m.alt_text || '',
    width: m.media_details?.width, height: m.media_details?.height,
  }
}

// The theme prints its own excerpt, featured crop (670x300) and localized date in archives; take them from the rendered archives.
const archiveBits = new Map()
for (const u of urls) {
  if (!/\/(category|tag|author)\//.test(u)) continue
  const f = htmlFile(u)
  if (!existsSync(f)) continue
  const html = await read(f)
  for (const m of html.matchAll(/<section id="post-(\d+)"[^>]*>([\s\S]*?)<!-- \.post -->/g)) {
    const id = +m[1]
    if (archiveBits.has(id)) continue
    const img = /<figure class="post-featured-image">[\s\S]*?(<img[^>]*>)/.exec(m[2])?.[1]
    const date = /<div class="date updated"><a[^>]*title="([^"]*)">\s*([^<]*?)\s*<\/a>/.exec(m[2])
    archiveBits.set(id, {
      excerpt: rewrite((innerOf(m[2], /<div class="entry-content clearfix">/g) || '').trim()),
      thumb: img ? { src: rewrite(attr(img, 'src')), width: +attr(img, 'width'), height: +attr(img, 'height') } : null,
      dateText: date ? date[2] : null, timeText: date ? decodeEntities(date[1]) : null,
    })
  }
}

const postCard = p => ({
  id: p.id,
  title: decodeEntities(p.title.rendered),
  path: linkOf(p),
  date: p.date,
  dateText: archiveBits.get(p.id)?.dateText ?? null,
  timeText: archiveBits.get(p.id)?.timeText ?? null,
  thumb: archiveBits.get(p.id)?.thumb ?? null,
  excerpt: archiveBits.get(p.id)?.excerpt || rewrite(p.excerpt.rendered),
  author: userById.get(p.author) ? { name: userById.get(p.author).name, path: toPath(userById.get(p.author).link) } : null,
  categories: p.categories.map(id => catById.get(id)).filter(Boolean).map(c => ({ name: decodeEntities(c.name), path: linkOf(c) })),
  tags: p.tags.map(id => tagById.get(id)).filter(Boolean).map(t => ({ name: decodeEntities(t.name), path: linkOf(t) })),
  featured: featured(p),
})

// ---------- pages ----------
const standalone = []
for (const p of pages) {
  // Pages on the "page-sideBar.php" template are bare HTML documents without the theme (shown inside the desktop app).
  const raw = existsSync(htmlFile(p.link)) ? await read(htmlFile(p.link)) : ''
  if (raw && !raw.includes('<div id="main">')) { standalone.push([linkOf(p), rewrite(raw)]); continue }
  const s = await singular(p, 'page')
  if (!s) continue
  await addRoute(linkOf(p), linkOf(p) === '/' ? 'home' : 'page', { ...s, title: decodeEntities(p.title.rendered), seo: { title: s.title, description: s.description }, template: p.template, slug: p.slug })
}

// ---------- posts ----------
for (const p of posts) {
  const s = await singular(p, 'post')
  if (!s) continue
  const html = await read(htmlFile(p.link))
  const nav = cls => {
    const m = new RegExp(`<li class="${cls}">\\s*<a href="([^"]+)"[^>]*>([\\s\\S]*?)</a>`).exec(html)
    return m ? { path: toPath(m[1]), html: m[2].trim() } : null
  }
  await addRoute(linkOf(p), 'post', { ...s, ...postCard(p), prev: nav('previous'), next: nav('next'), seo: { title: s.title, description: s.description }, slug: p.slug })
}

// ---------- archives (category, tag, author) with 5 posts per page like the original ----------
const PER_PAGE = 5
const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date))
async function archive(kind, term, list) {
  const base = linkOf(term)
  const total = Math.max(1, Math.ceil(list.length / PER_PAGE))
  for (let n = 1; n <= total; n++) {
    const path = n === 1 ? base : `${base}page/${n}/`
    const f = htmlFile(BASE + encodeURI(path))
    const html = existsSync(f) ? await read(f) : null
    if (!html && !list.length) continue
    await addRoute(path, 'archive', {
      kind,
      title: decodeEntities(term.name),
      seo: html ? { title: meta(html).title, description: '' } : { title: `${decodeEntities(term.name)} – ${decodeEntities(root.name)}` },
      bodyClass: html ? meta(html).bodyClass : '',
      posts: list.slice((n - 1) * PER_PAGE, n * PER_PAGE).map(postCard),
      pagination: { current: n, total, base },
    })
  }
}
// Like WordPress, a category archive also lists posts filed under its child categories.
const descendants = id => [id, ...categories.filter(c => c.parent === id).flatMap(c => descendants(c.id))]
for (const c of categories) {
  const ids = descendants(c.id)
  await archive('category', c, sorted.filter(p => p.categories.some(x => ids.includes(x))))
}
for (const t of tags) await archive('tag', t, sorted.filter(p => p.tags.includes(t.id)))
for (const u of users) await archive('author', u, sorted.filter(p => p.author === u.id))

// ---------- menu ----------
function parseMenu(html) {
  const nav = innerOf(html, /<ul class="nav-menu">/g, 'ul')
  const items = []
  const re = /<li id="menu-item-(\d+)" class="([^"]*)"><a([^>]*)>([\s\S]*?)<\/a>/g
  // Parse the two-level menu by walking the top-level list items
  let depth = 0, cur = null
  const tokens = nav.split(/(<li[^>]*>|<\/li>|<ul class="sub-menu">|<\/ul>)/)
  const stack = [items]
  let pending = null
  for (const t of tokens) {
    if (t.startsWith('<li')) pending = { cls: attr(t, 'class') }
    else if (pending && t.includes('<a')) {
      const a = /<a([^>]*)>([\s\S]*?)<\/a>/.exec(t)
      if (a) {
        const href = attr(a[1], 'href')
        const item = { label: strip(a[2]), to: href ? toPath(href) : null, children: [] }
        stack.at(-1).push(item); cur = item; pending = null
      }
    } else if (t === '<ul class="sub-menu">') stack.push(cur.children)
    else if (t === '</ul>') stack.pop()
  }
  return items
}
const menu = parseMenu(home)

// ---------- footer ----------
const footerHtml = innerOf(home, /<footer id="colophon"[^>]*>/g, 'footer')
const techPosts = [...footerHtml.matchAll(/<div class='pt-cv-ifield'><a href="([^"]+)"[^>]*>(?:<img[^>]*src="([^"]+)"[^>]*>)?[\s\S]*?<h5 class="pt-cv-title"><a[^>]*>([\s\S]*?)<\/a>/g)]
  .map(m => ({ to: toPath(m[1]), image: m[2] ? rewrite(m[2]) : null, title: strip(m[3]) }))
const socials = [...footerHtml.matchAll(/<div class="socialbekr">([\s\S]*?)<\/div>/g)].flatMap(m => [...m[1].matchAll(/<a href="([^"]+)"[^>]*><img[^>]*src="([^"]+)"/g)].map(x => ({ href: x[1], icon: rewrite(x[2]) })))
const profiles = [...(innerOf(footerHtml, /<div class="social-profiles clearfix">/g) || '').matchAll(/<li class="([^"]+)"><a href="([^"]+)" title="([^"]*)"/g)].map(m => ({ network: m[1], href: m[2], title: decodeEntities(m[3]) }))
const copyright = rewrite((innerOf(footerHtml, /<div class="copyright">/g) || '').trim())

// ---------- home sections ----------
const homeContent = innerOf(home, /<div class="entry-content clearfix">/g)
const sliderHtml = homeContent.slice(homeContent.indexOf('<div class="n2_clear">'), homeContent.indexOf('<div class="gap"></div>'))
const slideBgs = [...sliderHtml.matchAll(/<div class="n2-ss-slide-background-image"([^>]*)>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/g)].map(m => ({
  image: rewrite(m[2]), alt: decodeEntities(attr(m[1], 'data-alt') || ''),
  opacity: +attr(m[1], 'data-opacity') / 100, x: +attr(m[1], 'data-x'), y: +attr(m[1], 'data-y'),
}))
const slideLayers = [...sliderHtml.matchAll(/<div data-[^>]*data-slide-public-id="(\d+)"[^>]*class="n2-ss-slide [\s\S]*?<img[^>]*id="n2-ss-11item\d+"[^>]*>/g)].map(m => {
  const img = /<img[^>]*id="n2-ss-11item\d+"[^>]*>/.exec(m[0])[0]
  const layer = [...m[0].matchAll(/<div class="n2-ss-layer n2-ow n-uc-\w+"([^>]*data-sstype="layer"[^>]*)>/g)].at(-1)?.[1] || ''
  return {
    overlay: rewrite(attr(img, 'src')), overlayAlt: decodeEntities(attr(img, 'alt') || ''),
    left: +(attr(layer, 'data-desktopportraitleft') || 0), top: +(attr(layer, 'data-desktopportraittop') || 0),
    width: +(attr(layer, 'data-desktopportraitwidth') || 0) || null,
    align: attr(layer, 'data-desktopportraitalign') || 'center',
  }
})
const slides = slideBgs.map((b, i) => ({ ...b, ...slideLayers[i] }))

const products = [...homeContent.matchAll(/<figure class="wp-block-image size-large productlist">([\s\S]*?)<\/figure>/g)].map(m => {
  const img = /<img[^>]*>/.exec(m[1])[0]
  const cap = (/<figcaption>([\s\S]*?)<\/figcaption>/.exec(m[1]) || [])[1] || ''
  const a = /<a class="more"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<a[^>]*href="([^"]+)"[^>]*class="more"[^>]*>([\s\S]*?)<\/a>/.exec(cap)
  return {
    image: rewrite(attr(img, 'src')), srcset: rewrite(attr(img, 'srcset') || ''), alt: decodeEntities(attr(img, 'alt') || ''),
    title: strip(cap.split('<div')[0]),
    to: a ? toPath(a[1] || a[3]) : null, button: a ? strip(a[2] || a[4]) : null,
  }
})

const carouselConf = JSON.parse(decodeEntities(attr((/<div class="psac-post-carousel owl-carousel[^>]*>/.exec(homeContent) || [''])[0], 'data-conf') || '{}'))
const latest = [...homeContent.matchAll(/<div class="psac-post-image-bg" style="[^"]*url\(&#039;([^&]+)&#039;\)[^"]*">[\s\S]*?<h2 class="psac-post-title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?psac-time">([^<]*)</g)]
  .map(m => ({ image: rewrite(m[1]), to: toPath(m[2]), title: strip(m[3]), date: m[4].trim() }))

const headings = [...homeContent.matchAll(/<h3 class="has-text-align-center wp-block-heading">([\s\S]*?)<\/h3>/g)].map(m => strip(m[1]))
const clientsStart = homeContent.indexOf(headings[2] ?? '\u0000')
const clientsHtml = clientsStart > 0 ? homeContent.slice(clientsStart) : ''
const clients = [...clientsHtml.matchAll(/<img[^>]*>/g)].map(m => ({ image: rewrite(attr(m[0], 'src') || attr(m[0], 'data-src') || ''), alt: decodeEntities(attr(m[0], 'alt') || ''), href: null })).filter(c => c.image && !c.image.startsWith('data:'))

const homeRoute = index['/']
// HomePage.vue renders only `sections`, so the raw page HTML is dropped.
const { html: _homeHtml, ...homeData } = JSON.parse(await read(join(OUT, 'routes', homeRoute.id + '.json')))
await addRoute('/', 'home', {
  ...homeData,
  sections: { slides, headings, products, latest, carouselConf, clients },
})

// ---------- site ----------
await save(join(OUT, 'site.json'), {
  name: decodeEntities(root.name),
  description: decodeEntities(root.description),
  logo: '/wp-content/uploads/2019/08/logo.png',
  menu,
  footer: {
    techPosts, socials, profiles, copyright,
    address: 'تهران- یوسف آباد-نبش خیابان 37 پلاک 311-طبقه دو- واحد 3',
    email: 'info@bekrpardazan.com',
    phone: '88615984-6',
  },
})
// Old URLs that WordPress redirected (see tools/find-redirects.mjs); only keep ones that land on a known page.
const redirects = existsSync(join(M, 'redirects.json')) ? await json(join(M, 'redirects.json')) : {}
await save(join(DATA, 'redirects.json'), Object.fromEntries(Object.entries(redirects).filter(([from, to]) => index[to] && from.replace(/\/+/g, '/') !== to)))

// Links to parts of the old server that were never WordPress (e.g. /wiki/) keep pointing at the live domain.
{
  const known = p => index[p] || redirects[p] || existsSync(join(M, 'files', p)) || p.startsWith('/wp-content/') || p.startsWith('/wp-includes/') || p.startsWith('/emoji/')
  for (const { id } of Object.values(index)) {
    const f = join(OUT, 'routes', id + '.json')
    const route = await json(f)
    const fix = html => html?.replace(/(href|src)="(\/[^"#?]*)([^"]*)"/g, (m, attrName, p, rest) => {
      let d; try { d = decodeURIComponent(p) } catch { d = p }
      const dir = d.endsWith('/') ? d : d + '/'
      return known(d) || known(dir) ? m : `${attrName}="${BASE}${p}${rest}"`
    })
    const before = JSON.stringify(route)
    route.html = fix(route.html)
    route.sidebar = fix(route.sidebar)
    for (const p of route.posts ?? []) p.excerpt = fix(p.excerpt)
    if (JSON.stringify(route) !== before) await save(f, route)
  }
}

// Search index for /?s= (loaded by the browser only when someone searches).
await save(join(OUT, 'search.json'), sorted.map(p => ({ title: decodeEntities(p.title.rendered), path: linkOf(p), text: strip(p.excerpt.rendered).slice(0, 400) }))
    .concat(pages.filter(p => p.status === 'publish').map(p => ({ title: decodeEntities(p.title.rendered), path: linkOf(p), text: strip(p.content.rendered).slice(0, 400) }))))
await save(join(DATA, 'index.json'), index)

// ---------- static files ----------
await rm(join(ROOT, 'public/wp-content'), { recursive: true, force: true })
const WP_CONTENT = join(M, 'files/wp-content')
await cp(WP_CONTENT, join(ROOT, 'public/wp-content'), {
  recursive: true,
  filter: src => !UNUSED_PLUGIN.test('/wp-content' + src.slice(WP_CONTENT.length).replaceAll('\\', '/')),
})
// Point absolute URLs inside the copied stylesheets (per-post Elementor CSS, font CSS) at this site.
async function* walkFiles(d) { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); e.isDirectory() ? yield* walkFiles(p) : yield p } }
for await (const f of walkFiles(join(ROOT, 'public/wp-content'))) {
  if (!f.endsWith('.css')) continue
  const css = await read(f)
  const out = rewrite(css)
  if (out !== css) await writeFile(f, out)
}
if (existsSync(join(M, 'files/wp-includes'))) await cp(join(M, 'files/wp-includes'), join(ROOT, 'public/wp-includes'), { recursive: true })
if (existsSync(join(M, 'files/emoji'))) await cp(join(M, 'files/emoji'), join(ROOT, 'public/emoji'), { recursive: true })

for (const [path, raw] of standalone) await save(join(ROOT, 'public', path, 'index.html'), raw)
console.log('standalone pages', standalone.map(x => x[0]))
const counts = Object.values(index).reduce((a, r) => (a[r.type] = (a[r.type] || 0) + 1, a), {})
console.log('routes', counts, 'menu', menu.length, 'slides', slides.length, 'products', products.length, 'latest', latest.length, 'clients', clients.length, 'tech', techPosts.length)
