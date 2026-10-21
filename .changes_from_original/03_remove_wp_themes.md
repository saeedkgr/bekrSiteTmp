# remove wp themes on branch `remove_wp_themes`

The mirror copied the two WordPress themes into `public/wp-content/themes/`: the parent theme `interface` and the
child theme `interface-newChild`. The Nuxt rebuild draws the header, footer and page templates itself, so this branch
checks what still used those files and removes the folder from `public/`.

## 1. What was in the folder

| Theme | Files | Contents |
|-------|-------|----------|
| `interface/` (1.1 MB) | 11 | `style.css`, `css/responsive.css`, Font Awesome 4 (`font-awesome.css` and 5 font files), and 3 scripts: `backtotop.js`, `html5.min.js`, `scripts.js` |
| `interface-newChild/` (864 KB) | 17 | `style.css` and the child theme's Persian fonts: IRANSans (8 files), BMitra, BNazanin, Broya, Mj Moharram Bold and Genericons |

## 2. Checks

- **Stylesheets:** all three (`interface/style.css`, `interface/css/responsive.css`, `interface/font-awesome/css/font-awesome.css`)
  and the child theme's `style.css` are already bundled into `app/assets/css/wp-content-view-legacy.css`. No page
  links them.
- **Scripts:** none is loaded. The header menus, mobile menu and back-to-top button are Vue components.
- **Images:** no theme image is referenced by the CSS, the route data, `site.json` or the standalone sidebar pages.
- **Fonts:** this is the only thing still in use. The bundled CSS loaded its fonts from `/wp-content/themes/...`, and
  the site still draws text with two of them: IRANSans (footer headings and links, menus) and Broya. Font Awesome 4
  draws the theme's `fa` icons.

## 3. Changes

- The theme fonts moved to `app/assets/fonts/`, one folder per theme:
  - `font-awesome-4/` (parent theme): `fontawesome-webfont` in eot, svg, ttf, woff and woff2.
  - `interface-child/` (child theme): IRANSans (in its original `IRANSans/WebFonts/fonts/<format>/` folders), BMitra,
    BNazanin, Broya, Mj Moharram Bold and Genericons.
- The bundled CSS now points at them (`url("../fonts/font-awesome-4/...")`, `url("../fonts/interface-child/...")`) and
  Vite emits them with hashed names in `_nuxt/`.
- The child theme's CSS asked for files with different letter case than the real ones (`bmitra.ttf` for `BMitra.ttf`,
  `broya.ttf` for `BROYA.ttf`), which only worked because Windows ignores case. The import now uses each file's real
  name, so the build also works on Linux.
- It also asked for files that were never on the server: `bmitra.otf/.svg`, `bnazanin.otf/.svg`, `broya.otf/.svg`,
  `iryekanbold.ttf`, `yekan.ttf`, `mj_moharram light.ttf`, `Genericons.eot/.svg/.ttf`. Those `src` entries are dropped,
  so Vite does not have to resolve missing files; browsers were skipping them anyway.
- `tools/import.mjs`:
  - `FONT_DIRS` lists the two theme font folders next to the plugin ones, and they are copied to `app/assets/fonts/`.
  - `isPluginFile` now also covers `wp-content/themes/`, so the folder is no longer copied to `public/`.
  - New `realFile()` (case-insensitive lookup) and `movedFontUrls()` (rewrite or drop each font `url()`).
- `README.md` and `migrate_fromWO.md` describe the new layout. `public/wp-content/` now holds only `uploads/`.

| File | Change |
|------|--------|
| `tools/import.mjs` | Theme fonts moved to `app/assets/fonts`, themes no longer copied to `public/` |
| `app/assets/css/wp-content-view-legacy.css` | Regenerated with the new font URLs |
| `app/assets/fonts/font-awesome-4/`, `app/assets/fonts/interface-child/` | New: the theme fonts |
| `public/wp-content/themes/` | Deleted (28 files) |
| `README.md`, `migrate_fromWO.md` | Updated |

## 4. Verification

- Before and after the change, I recorded the computed styles of every element on 5 pages (home, the blog archive, and
  three content pages with Elementor widgets, a post grid and social icons): font family, size, weight, line height,
  colors, spacing, display, borders, width and icon glyphs. All of them match, and the same fonts load (IRANSans, Broya,
  Vazirmatn, Font Awesome), with no failed requests.
- `npm run generate` builds without errors; the theme's "didn't resolve at build time" warnings are gone.
- `npm run check` matches the text of all 774 pages (the same 7 missing files as before, also missing on the live site).
- The dev server has to be restarted after the import adds new font folders, or Vite keeps serving the old URLs.
