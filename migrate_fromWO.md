# Migration from WordPress to Nuxt: bekrpardazan.com

## Goal

Build an exact replica of the WordPress site https://www.bekrpardazan.com with the latest
**Nuxt (4.6)**, **Tailwind CSS (4.3)** and **Nuxt UI (4.12)**:

- Download every public page, post and asset, including old content (2016–2021).
- Keep every URL working, including old URLs that WordPress redirected.
- Make the result look and read the same as the live site, and deploy it as a static site.
- Only ask for WordPress credentials if they are actually needed, and then use a dedicated
  low-permission user with an Application Password, never the admin password.

## Plan

1. **Survey** the live site: WordPress REST API (`/wp-json/wp/v2`), sitemaps, theme and plugins,
   and whether a login is needed.
2. **Mirror** everything into `mirror/`: REST data, the rendered HTML of every URL, and every
   `wp-content` / `wp-includes` file those pages and stylesheets reference.
3. **Import**: convert the mirror into data the Nuxt app reads, plus static files.
4. **Rebuild** the site in Nuxt: header, menus, footer, home page, page/post/archive templates
   built with Tailwind and Nuxt UI. Page bodies reuse the HTML WordPress rendered.
5. **Compare** against the live site, side by side, and fix differences.
6. **Generate** the static site and **verify** every link, asset and page text automatically.

## Steps done

### 1. Survey
- The site runs WordPress with the "interface" parent theme and the "interface-newChild" child theme,
  Elementor, Smart Slider 3, Post Slider and Carousel, Carousel Slider, Content Views and the
  Redirection plugin. It is Persian, right-to-left.
- Public content: 41 pages, 124 posts, 12 categories, 534 tags, 5 authors, 0 comments.
- **No login was needed.** Everything public is readable anonymously. The REST API reports 590 media
  items but returns 582; the other 8 belong to private or draft content.
  If drafts or private content are ever wanted: in WordPress, go to Users → Add New, create a
  dedicated user with the minimum role (Editor only if private content is needed), then create an
  Application Password for it under Users → Profile → Application Passwords. Don't share the admin password.

### 2. Mirror (`npm run mirror`)
- `tools/mirror.mjs`: saves the REST data (`mirror/api/*.json`), the rendered HTML of 782 URLs
  (sitemap, every category/tag/author archive and their pagination) and about 6,600 asset files
  (all image sizes, theme/plugin CSS, JS, fonts), about 300 MB in total.
- `tools/mirror-extra.mjs`: fetches assets still referenced on the old domains
  (bekrpardazan.net / .ir) and the WordPress emoji images.
- `tools/find-redirects.mjs`: finds internal links that the live site redirects (12 of them)
  and records where they lead in `mirror/redirects.json`.

### 3. Import (`npm run import`, `tools/import.mjs`)
- Writes one JSON file per URL to `public/_data/routes/` (page, post or archive data, with
  absolute site URLs rewritten to root-relative ones), plus `site.json` (menu, footer) and
  `search.json` (search index for `/?s=`).
- Rebuilds archives like WordPress does: 5 posts per page, newest first, and category
  archives include posts filed under child categories.
- Bundles the original theme, Elementor and plugin CSS into `app/assets/css/wp-content-view-legacy.css`, cleaned of
  malformed rules and wrapped in a CSS cascade layer called `legacy`.
- Copies all uploads to `public/wp-uploads/` and rewrites every `/wp-content/uploads/` link to `/wp-uploads/` (theme and plugin files are bundled from `app/assets/` instead).
- Copies the four standalone `page-sideBar.php` pages (`/sidebar/`, `/sidebar14/`,
  `/sidebar-v14/`, `/sidebar-old/`) as-is.
- Writes `data/index.json` (all paths, for prerendering and `/sitemap.xml`) and
  `data/redirects.json` (old URLs → new ones).

### 4. Nuxt app
- `app/components/SiteHeader.vue`: logo, menu with drop-downs and current-page highlighting,
  mobile menu.
- `app/components/SiteFooter.vue`: latest tech posts, contact details, social icons, back-to-top button.
- `app/components/HomePage.vue`: hero slider, products grid, latest-posts carousel and clients
  carousel (Nuxt UI `UCarousel`, with autoplay and timings from the original plugins).
- `PostArticle.vue`, `PageArticle.vue`, `ArchiveList.vue`, `PostMeta.vue`, `PostTags.vue`,
  `SearchResults.vue`, `error.vue`: templates that use the theme's original class names.
- `WpContent.vue`: renders the WordPress HTML and routes internal links client-side.
- `app/pages/[...slug].vue`: one catch-all page that loads `/_data/routes/<id>.json` for the URL.
- `server/routes/_data/[...path].get.ts`: serves that data during server rendering and prerendering.
- `nuxt.config.ts`: RTL Persian `<html>`, favicons, layer order
  (`theme, base, legacy, components, utilities`), redirect route rules, and the list of URLs to prerender.

### 5. Comparison with the live site
Checked home, product, post, archive, about and blog pages at 1366px and on mobile, and fixed:
- Tailwind's own `container` class clashed with the theme's `.container` (turned off).
- Header/footer spacing was mirrored for RTL; carousels now run right-to-left (Persian locale in Nuxt UI).
- Carousel arrows overflowed the page.
- WordPress HTML was only added in the browser, not in the generated HTML (fixed in `WpContent.vue`).
- Uploads whose names start with "-" were skipped by Nuxt (`ignorePrefix` changed).
- A redirect page overwrote a real page.

Final measurements match the live site: logo, menu, slider top and footer columns sit at the same positions.

### 6. Build and verification
- `npm run generate` prerenders 1,566 routes (pages plus their data) into `.output/public`.
- `npm run check`:
  - `tools/check-links.mjs`: every internal link and asset exists, except 7 old images/files that
    also return 404 on the live site.
  - `tools/compare-text.mjs`: the visible text of all 774 pages is identical to the original.
- Client-side navigation between pages works on the static build (`npm run preview`).

## Known differences

- The footer social icons work; on the live site they are broken (they load from bekrpardazan.net).
- On phones the menu button sits beside the logo instead of the live site's stacked layout.
- On the latest-posts carousel there is one dot per slide, where the live site shows one per page.
- Links to `/wiki/` (a separate app on the old server) still point to the live domain.

## How to use

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # static site in .output/public
npm run preview    # serve the static build on http://localhost:4000
npm run check      # verify links and text
```

To refresh from the live site later: `npm run mirror`, then `npm run import`, then `npm run generate`.
Nuxt 4.6 requires Node.js 22.21 or newer (this machine has 22.16, which works with a warning).
