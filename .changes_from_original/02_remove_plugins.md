# remove plugins on branch `remove_plugins`

The mirror copies every WordPress plugin folder from `wp-content/plugins/` into `public/wp-content/plugins/`,
and `tools/import.mjs` bundles every plugin stylesheet the original pages linked into `public/legacy.css`.
The Nuxt rebuild draws several parts of the site itself, so some of those plugins are no longer used.
Each plugin below was checked and removed only if nothing in the rebuild depends on it.

Unused plugins are listed in one place, `UNUSED_PLUGINS` near the top of `tools/import.mjs`. A plugin on that
list is not copied into `public/wp-content/plugins/`, and its stylesheets are not bundled into `legacy.css`
or linked from any page. Running `npm run import` again therefore keeps them out.

## 1. remove plugin animate-it

**What it was:** "Animate It!", a jQuery plugin that plays animate.css entrance effects when an element
scrolls into view. Its folder held 7 files (145 KB): `animate-animo.css`, `block-style.css` and five
scripts (`animo.min.js`, `edsanimate.js`, `edsanimate.site.js`, `jquery.ba-throttle-debounce.min.js`,
`viewportchecker.js`).

**Checks**

- No file in `app/`, `server/`, `tools/`, `data/` or `nuxt.config.ts` loads its scripts or stylesheets.
- Its markup (`eds-animate`, `edsanimate-sis-hidden`, `data-eds-*`) appeared only on the home page, in three
  blocks inside the route's `html` field (`public/_data/routes/2a0c975e.json`).
- The home page is drawn by `app/components/HomePage.vue` from the route's `sections` data and never renders
  `html`. In the running site the home page had no `.eds-animate` elements.
- Its stylesheets were bundled into `legacy.css` (about 6,800 lines: all of animate.css plus the `eds-*`
  rules). No page uses the `eds-*` classes. The Elementor pages that use animation names such as `fadeIn`
  never start those animations, because Elementor's own script is not loaded (see the Elementor section).

**Changes**

| File | Change |
|------|--------|
| `tools/import.mjs` | New `UNUSED_PLUGINS` list; the plugin is not copied and its CSS is not bundled or linked |
| `tools/import.mjs` | The home route no longer keeps the raw page `html`, since `HomePage.vue` only renders `sections` |
| `public/wp-content/plugins/animate-it/` | Deleted |
| `public/legacy.css` | Regenerated without the plugin's CSS |
| `public/_data/routes/2a0c975e.json` | Regenerated without the `html` field |

**Verification:** `npm run import` regenerates only the files above. The home page still shows the slider
and all 8 products, with no failed requests.

## 2. remove plugin carousel-slider

**What it was:** "Carousel Slider", an Owl Carousel slider. On the original site it drew the client logos
strip at the bottom of the home page. Its folder held 2 files (96 KB): `assets/css/frontend.css` and
`assets/js/frontend.js`.

**Checks**

- No file in `app/`, `server/`, `data/` or `nuxt.config.ts` loads its script or stylesheet, and no route links it.
- Its classes (`carousel-slider`, `carousel-slider__item` and so on) appeared only in the home route's
  `sections.clientsHtml`. `HomePage.vue` draws the client logos with its own `UCarousel` from `sections.clients`
  and never renders `clientsHtml`.
- The generic class names its CSS also styles (`active`, `summary`, `hidden`) are only styled under
  `.carousel-slider` or `.mfp-content`, which no page uses.

**Changes**

| File | Change |
|------|--------|
| `tools/import.mjs` | `carousel-slider` added to `UNUSED_PLUGINS`; the unused `sections.clientsHtml` is no longer saved |
| `public/wp-content/plugins/carousel-slider/` | Deleted |
| `public/legacy.css` | Regenerated without the plugin's CSS (about 1,350 lines) |
| `public/_data/routes/2a0c975e.json` | Regenerated without `sections.clientsHtml` |

## 3. remove plugin post-slider-and-carousel

**What it was:** "Post Slider and Carousel", an Owl Carousel slider. On the original site it drew the
"latest posts" carousel on the home page. Its folder held 5 files (65 KB): `owl.carousel.min.css`,
`psac-public.css`, `bg.png`, `owl.carousel.min.js` and `psac-public.js`.

**Checks**

- No file in `app/`, `server/`, `data/` or `nuxt.config.ts` loads its script or stylesheet, and no route links it.
- Its classes (`psac-*`, `owl-carousel`) appeared only in the home page markup, which is no longer kept.
  `HomePage.vue` draws the latest posts with its own `UCarousel` from `sections.latest`.
- `tools/import.mjs` still reads the carousel's autoplay setting (`sections.carouselConf`) and the post list from
  the mirrored HTML, so the home page carousel keeps the same timing. Neither needs the plugin's files.
- The only file outside the plugin that pointed into it was `legacy.css` (its `bg.png`), and that rule came from
  the plugin's own stylesheet.

**Changes**

| File | Change |
|------|--------|
| `tools/import.mjs` | `post-slider-and-carousel` added to `UNUSED_PLUGINS` |
| `public/wp-content/plugins/post-slider-and-carousel/` | Deleted |
| `public/legacy.css` | Regenerated without the plugin's CSS (about 990 lines) |

## 4. remove plugin smart-slider-3

**What it was:** "Smart Slider 3", which drew the hero slider at the top of the home page. Its folder held
5 files (200 KB): `smartslider.min.css` and four scripts (`n2.min.js`, `smartslider-frontend.min.js`,
`ss-simple.min.js`, `w-arrow-image.min.js`). They sat in `.../Assets/dist/` folders, which `.gitignore` skips,
so git never tracked them.

**Checks**

- No file in `app/`, `server/`, `data/` or `nuxt.config.ts` loads its scripts or stylesheet, and no route links it.
- No markup on any page uses its classes. `HomePage.vue` draws the hero slider with its own `UCarousel`
  from `sections.slides`; `tools/import.mjs` reads the slide images and layers from the mirrored HTML,
  not from the plugin's files.
- The slider also wrote about 5 KB of inline CSS (`<style data-related="n2-ss-11">`). It was saved twice
  in the home route, as `sections.sliderCss` (never rendered) and in `styles.inline` (added to the home page
  head, but matching nothing, since there is no `#n2-ss-11` element).
- The child theme's own stylesheet still has a few `.n2-ss-*` rules. They are part of the theme, not the
  plugin, so they stay in `legacy.css`; they match nothing.

**Changes**

| File | Change |
|------|--------|
| `tools/import.mjs` | `smart-slider-3` added to `UNUSED_PLUGINS`; Smart Slider inline styles are skipped; `sections.sliderCss` is no longer saved |
| `public/wp-content/plugins/smart-slider-3/` | Deleted (untracked files) |
| `public/legacy.css` | Regenerated without the plugin's CSS (about 1,100 lines) |
| `public/_data/routes/2a0c975e.json` | Regenerated without `sections.sliderCss` and the slider's inline style |

**Verification:** in the running site the home page draws the hero slider, the 8 products, the latest posts
and the client logos, with no failed requests. Its layout measures the same as before any plugin was removed.

## 5. kept: content-views-query-and-display-post-page

**What it is:** "Content Views", which draws post grids inside pages. Its folder holds 7 files (280 KB):
`cv.css`, `cv.js` and the Glyphicons font in five formats.

**Why it stays:** 7 pages still contain its grid markup (`pt-cv-wrapper`, `pt-cv-content-item`, `pt-cv-pagination`
and so on) in their `html`, and `legacy.css` styles that grid with the plugin's CSS and loads its Glyphicons font.
Removing it would break the layout of those grids.

## 6. elementor: kept, its script replaced

**Why it stays:** 129 pages and posts are built with Elementor. Their markup and the per-page Elementor CSS
(`/wp-content/uploads/elementor/css/post-N.css` plus the widget stylesheets in the plugin folder) still draw them.

**What was broken:** the rebuild never loads Elementor's JavaScript, and three features depend on it.

| Feature | Pages | What happened without the script |
|---------|-------|----------------------------------|
| Entrance animations (`fadeIn`, `fadeInUp`, `zoomIn`) | 19 | The element kept `elementor-invisible` (`visibility: hidden`), leaving blank gaps |
| Image carousel (Swiper) | 73 | Static row: the first 3 images, the rest cut off, no arrows, dots or autoplay |
| Lightbox | 37 (140 links) | The link pointed at `/` or another page, so clicking an image left the page |

**Changes**

- `app/components/WpContent.vue` now redoes those three features after the WordPress HTML is mounted:
  - **Animations:** each `.elementor-invisible` element is watched with an `IntersectionObserver`. When it
    scrolls into view, the class is removed and a Tailwind animation is added (`animate-wp-fade-in`,
    `animate-wp-fade-in-up`, `animate-wp-zoom-in`, defined in `app/assets/css/main.css`). Elementor's
    `animated-fast` / `animated-slow` speeds and `_animation_delay` are kept. With "reduce motion" turned on,
    the element just appears (`motion-safe:`).
  - **Carousels:** each `.elementor-widget-image-carousel` is read (images, captions, links, and the widget's
    `data-settings`: slides to show, arrows/dots, loop, autoplay speed, pause on hover/interaction), and its
    Swiper markup is replaced by `app/components/WpCarousel.vue`, a Nuxt UI `UCarousel` rendered there with a
    `Teleport`. It shows 1 slide on phones, up to 2 on tablets and the widget's own count on desktop.
  - **Lightbox:** the full-size image URL is decoded from each link's `data-e-action-hash`, the link's `href`
    is set to it (so it also works without JavaScript), and clicking opens `app/components/WpLightbox.vue`,
    a Nuxt UI `UModal`. Links that share a slideshow id open as one gallery, with arrows and dots.
- `app/utils/elementor.ts`: helpers that read Elementor settings, carousel slides and lightbox images.
- Theme colors: arrows use the `primary` color (the theme's brand color), dots use `brand-200` / `deep-600` with
  `brand-500` for the current one, and the popup uses `bg-surface`, `text-ink` and brand/deep borders, so all of
  it follows the selected theme and dark mode.

**Verification:** `npm run generate` builds without errors, and `npm run check` matches the page text of all
774 pages (the same 7 missing files as before, which are also missing on the live site). In the browser:
"زبان بدن" reveals its hidden images and text as they scroll in and its carousel runs with arrows and dots;
"برگه های مالیاتی ابلاغ شده" opens its 6 images as one gallery popup; both checked in light (default theme)
and dark (sunset theme).

## 7. remove plugin persian-elementor

**What it was:** "Persian Elementor", which adds Persian fonts, a Jalali date picker and the `efaicons` icon font
to Elementor. Its folder held 71 files (4.2 MB), mostly woff2 fonts (IRANYekanX, Estedad, Vazirmatn, Shabnam and others).

**Checks**

- Its date picker (`jalalidatepicker.min.js`, `datepicker-init.js`, `datepicker-custom.css`) is not loaded by the
  app, and no page has a date field.
- No page uses `efaicons` icons.
- Its only remaining use was fonts: the per-page Elementor CSS sets `font-family: "IRANYekan"` (and Roboto,
  Playfair Display and others) on headings and text, and `legacy.css` bundled the plugin's `@font-face` rules,
  so Elementor headings still drew in IRANYekan instead of Vazirmatn.

**Changes**

| File | Change |
|------|--------|
| `app/assets/css/main.css` | All text inside Elementor content (`#main .elementor`) uses Vazirmatn. The per-page Elementor CSS is unlayered, so the rule needs `!important` in the `components` layer; icon fonts are left alone |
| `tools/import.mjs` | `persian-elementor` added to `UNUSED_PLUGINS` |
| `public/wp-content/plugins/persian-elementor/` | Deleted |
| `public/legacy.css` | Regenerated without the plugin's CSS and `@font-face` rules (about 1,400 lines) |

**Verification:** on "زبان بدن" every piece of text in the content area uses Vazirmatn, icons keep Font Awesome,
the IRANYekan font is no longer downloaded and no request fails. `npm run generate` builds without errors, and
`npm run check` still matches the text of all 774 pages.

## 8. move legacy.css and Elementor's icon fonts into app/assets

**Before:** `tools/import.mjs` wrote the bundled WordPress CSS to `public/legacy.css`, and `nuxt.config.ts` linked it
as `/legacy.css`. Elementor's icon fonts (eicons and Font Awesome) were served from
`public/wp-content/plugins/elementor/assets/lib/`, and 77 pages linked Font Awesome's three stylesheets one by one.

**After**

- The bundle is written to `app/assets/css/wp-content-view-legacy.css` and imported by `app/assets/css/main.css`
  (`@import "./wp-content-view-legacy.css";`). Vite now bundles it with the app CSS; the `<link href="/legacy.css">`
  in `nuxt.config.ts` is gone. It is still inside the `legacy` layer, so the cascade order is unchanged.
- Elementor's fonts are copied to their own folders: `app/assets/fonts/eicons/` (5 files) and
  `app/assets/fonts/font-awesome/` (10 files: brands and solid, each in eot, svg, ttf, woff and woff2). The bundled CSS
  points at them with `url("../fonts/eicons/...")` and `url("../fonts/font-awesome/...")`, and Vite emits them with
  hashed names in `_nuxt/`.
- Font Awesome's `fontawesome.min.css`, `brands.min.css` and `solid.min.css` are bundled too, so no page links them
  any more (77 route files changed). Since their CSS and fonts are both bundled, the `lib/eicons/` and
  `lib/font-awesome/` folders are no longer copied to `public/wp-content/plugins/elementor/`.
- `README.md` and `migrate_fromWO.md` point at the new path.

**Verification:** `npm run generate` builds without errors (its "didn't resolve at build time" warnings are the
theme's own `/wp-content/themes/...` URLs, which stay in `public/` and load at runtime). `npm run check` still matches
the text of all 774 pages. On "زبان بدن" the Instagram icon draws with Font Awesome, and the eicons and Font Awesome
fonts load from `app/assets/fonts/` with no failed requests.

## 9. remove plugins elementor and content-views from public

**Before:** `public/wp-content/plugins/` still held `elementor/` (widget and animation CSS, Swiper, three scripts)
and `content-views-query-and-display-post-page/` (`cv.css`, `cv.js`, the Glyphicons font). Pages linked 24 of
Elementor's stylesheets one by one, and the legacy bundle loaded Glyphicons from the content-views folder.

**After:** nothing under `wp-content/plugins/` is copied to `public/` any more; `public/wp-content/` holds only
`themes/` and `uploads/`.

- Elementor's widget and animation stylesheets are bundled into `app/assets/css/wp-elementor-widgets.css`, imported
  by `main.css`. It sits in a new `elementor` cascade layer between `components` and `utilities`
  (`@layer theme, base, legacy, components, elementor, utilities`, in `main.css` and in the head of `nuxt.config.ts`).
  That keeps the old order: these rules still beat the theme CSS and the app's content styles, and still lose to the
  per-post Elementor CSS, which stays linked per page from `wp-content/uploads/elementor/css/`.
- Font Awesome's stylesheets stay in the legacy bundle, next to Elementor's base styles, so `.elementor-icon i` still
  wins over `.fab` as on the original site.
- Swiper's stylesheets are dropped (`WpCarousel.vue` replaced the carousels), and none of Elementor's scripts are
  needed (`WpContent.vue` does their work).
- The Glyphicons font moved to `app/assets/fonts/glyphicons/` (5 files), and the content-views grid CSS was already in
  the legacy bundle. `cv.js` was never loaded.
- `tools/import.mjs`: `isPluginFile` keeps the whole `wp-content/plugins/` tree out of `public/`, `BUNDLED_STYLES` lists
  Elementor's mirrored stylesheets, and pages no longer get plugin stylesheet links (122 route files changed).

**Verification:** computed styles (size, weight, line height, colors, spacing, display, borders) of every element in
the content area match the previous build exactly on 6 pages covering image boxes, video, alerts, social icons, a
content-views grid and an image gallery. `npm run generate` builds without errors, `npm run check` matches the text of
all 774 pages, and the built site has no `wp-content/plugins/` folder.
