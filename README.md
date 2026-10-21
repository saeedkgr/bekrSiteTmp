# bekrpardazan.com (Nuxt rebuild)

A static replica of the WordPress site at https://www.bekrpardazan.com, rebuilt with
Nuxt 4, Nuxt UI 4 and Tailwind CSS 4. Every public page, post, category/tag/author archive
and upload from the original site is included, at the same URLs.

## Commands

| Command | What it does |
| --- | --- |
| `npm run mirror` | Downloads the live site into `mirror/` (REST API data, rendered HTML of every URL, all `wp-content` files, and old-URL redirects). |
| `npm run import` | Turns `mirror/` into the app's data: `public/_data/`, `public/wp-content/uploads/`, `app/assets/css/wp-content-view-legacy.css` and `wp-elementor-widgets.css`, the plugin and theme fonts in `app/assets/fonts/`, `data/`. |
| `npm run dev` | Development server on http://localhost:3000. |
| `npm run generate` | Builds the static site into `.output/public` (deploy that folder to any static host). |
| `npm run preview` | Serves `.output/public` on http://localhost:4000. |
| `npm run check` | Verifies the build: every internal link/asset exists, and every page's text matches the original. |

Nuxt 4.6 needs Node.js 22.21 or newer.

## How it is put together

- **Chrome rebuilt in Vue + Tailwind + Nuxt UI**: header and menus (`app/components/SiteHeader.vue`),
  footer (`SiteFooter.vue`), the home page slider, products grid, latest-posts and clients carousels
  (`HomePage.vue`, using `UCarousel`), post/page/archive templates and pagination.
- **Page content**: the body of each page/post is the HTML WordPress rendered (Elementor and block
  editor output), captured by the mirror and shown with `WpContent.vue`.
- **Original styles**: the theme, Elementor and plugin stylesheets are bundled into
  `app/assets/css/wp-content-view-legacy.css` inside a CSS cascade layer named `legacy`, declared below Tailwind's
  `utilities`, so the content looks exactly as before while Tailwind classes always win. `main.css` imports it, so
  Vite bundles it with the app CSS, together with the plugin and theme fonts (`app/assets/fonts/eicons/`,
  `font-awesome/`, `glyphicons/`, `font-awesome-4/`, `interface-child/`). Elementor's widget stylesheets are bundled into `app/assets/css/wp-elementor-widgets.css`
  in an `elementor` layer above the app's content styles. Nothing from `wp-content/plugins` or `wp-content/themes` is served from `public/`;
  only the per-post Elementor CSS (`wp-content/uploads/elementor/css/`) is still loaded per route.
- **Data**: one JSON file per URL in `public/_data/routes/` (named by an FNV-1a hash of the path, see
  `app/utils/routeId.ts`), plus `site.json` (menu, footer) and `search.json` (`/?s=` search).
- **Redirects**: old URLs the WordPress site redirected are in `data/redirects.json` and become Nuxt
  route rules. The four `page-sideBar.php` pages (`/sidebar/`, `/sidebar14/`, `/sidebar-v14/`,
  `/sidebar-old/`) are standalone HTML documents copied as-is.
- **Typography**: Vazirmatn (OFL) is self-hosted from `app/assets/fonts/vazirmatn/` in six weights
  (300–800). The type scale lives in `app/assets/css/main.css` as `text-caption`, `text-body`,
  `text-lead` and `text-h1`…`text-h6`, and is applied to the rendered WordPress content in the
  `components` layer, above `legacy`.
- **Themes and dark mode**: each theme is two seed colors on `<html data-theme>` (`bekr` default teal and
  navy from the original site, `ocean`, `sunset`, `royal`); every shade of the `brand` (Nuxt UI primary)
  and `deep` (secondary) palettes is mixed from them in `main.css`. Dark mode is Nuxt UI color mode
  (light by default). Visitors pick both from the palette button in the header (`ThemeSwitcher.vue`);
  the choice is kept in `localStorage` and applied before first paint. To add a theme, add a
  `:root[data-theme="…"]` rule in `main.css` and an entry in `app/composables/useSiteTheme.ts`.

## Known differences from the live site

- The footer social icons work here; on the live site they point at the retired bekrpardazan.net domain and are broken.
- Seven images/files referenced in old posts return 404 on the live site too, so they are missing here as well
  (`npm run check` lists them).
- Links to `/wiki/` (a separate app on the old server) still point at the live domain.
