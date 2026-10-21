# move wp uploads on branch `move_wp_uploads`

After the plugins, themes and `wp-includes` were removed, `public/wp-content/` held only `uploads/`. This branch moves
it to `public/wp-uploads/`, so uploads are served from `/wp-uploads/...` instead of `/wp-content/uploads/...`, and
updates every link to them.

## 1. Where uploads were linked

| Place | Examples |
|-------|----------|
| Route data (`public/_data/routes/*.json`) | `<img src>` and `srcset`, links to PDFs and images, inline styles, Elementor `data-settings` JSON (with escaped `\/` slashes), and the per-post Elementor stylesheet links (`/wp-content/uploads/elementor/css/post-N.css`) |
| `public/_data/site.json`, `search.json` | The logo, footer widget images, search thumbnails |
| The uploaded stylesheets themselves | Per-post Elementor CSS with background images, and Elementor's local Google Fonts CSS |
| `app/assets/css/wp-content-view-legacy.css` | 225 font URLs of the Elementor kit's Google Fonts and 3 theme images |
| `app/components/SiteFooter.vue` | The footer background image |
| `nuxt.config.ts` | The three favicons |
| `app/components/WpContent.vue` | Links under the uploads folder are left to the browser instead of the router |
| `app/utils/elementor.ts` | Lightbox images: their full-size URL comes from Elementor's base64 settings, which still hold the original URL |

## 2. Changes

- `tools/import.mjs`:
  - `rewrite()`, which every imported HTML, JSON value and stylesheet already goes through, now also turns
    `/wp-content/uploads/` into `/wp-uploads/` (and `\/wp-content\/uploads\/` inside JSON).
  - New `toPublic()` / `toMirror()` helpers: per-page stylesheet links are written with the new path, and the content
    link check still finds the files in the mirror, which keeps the original layout.
  - Only `mirror/files/wp-content/uploads/` is copied, to `public/wp-uploads/`; the old `public/wp-content/` is removed.
    The logo path in `site.json` is the new one.
- `app/components/SiteFooter.vue`, `nuxt.config.ts`, `app/components/WpContent.vue`: the new path.
- `app/utils/elementor.ts`: lightbox image URLs are mapped from `/wp-content/uploads/` to `/wp-uploads/`.
- `README.md` and `migrate_fromWO.md` describe the new layout. `mirror/` is unchanged.

`public/` now holds `_data/`, `emoji/`, `wp-uploads/` and the four standalone sidebar pages.

## 3. Verification

- No file in `public/`, `app/assets/css/` or `data/`, and no page or stylesheet in the build, contains
  `/wp-content/` any more.
- On 5 pages (home, the blog archive, the video post, an image gallery post and a page with a post grid), every image
  loads (no image with zero width), no request fails, the video plays from `/wp-uploads/`, and the per-post Elementor
  stylesheets load from `/wp-uploads/elementor/css/`. Computed styles match the previous build; the only difference is
  the footer's class name, which now contains the new image path.
- On "برگه های مالیاتی ابلاغ شده" all 6 lightbox links point at `/wp-uploads/...` and return 200.
- `npm run generate` builds without errors, and `npm run check` finds the same 7 missing files as before (now listed
  under `/wp-uploads/`; they are also missing on the live site) and matches the text of all 774 pages.

## 4. Note

Links from outside the site to old `/wp-content/uploads/...` addresses (search engines, other sites) no longer work.
The static build cannot redirect a whole folder; if that matters, the web server can redirect
`/wp-content/uploads/*` to `/wp-uploads/*`.
