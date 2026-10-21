# remove wp-includes on branch `remove_wp_includes`

`tools/import.mjs` copied WordPress's own `wp-includes/` files from the mirror into `public/wp-includes/`. This
branch checks what still used them and stops copying the folder.

## 1. What was in the folder

11 files, 448 KB:

| Path | What it is |
|------|------------|
| `css/dist/block-library/style-rtl.min.css` | Styles for block-editor content (`wp-block-*` classes) |
| `js/jquery/jquery.min.js`, `jquery-migrate.min.js`, `ui/core.min.js` | jQuery, loaded by the old theme and plugins |
| `js/mediaelement/` (7 files) | MediaElement.js, WordPress's audio/video player: scripts, its CSS, `mejs-controls.svg` and the Vimeo renderer |

## 2. Checks

- **Block-library CSS:** the original home page links it, so `tools/import.mjs` already bundles it into
  `app/assets/css/wp-content-view-legacy.css`. No page links the file itself, and it has no `url()` pointing back
  into `wp-includes/`.
- **jQuery and MediaElement:** no page, component or stylesheet loads them. Nothing in the rebuild uses jQuery, and
  the only video on the site (on "بازاریابی چریکی") is a plain `<video>` element, which plays without MediaElement.
- **Other references:** no route data, `site.json`, standalone sidebar page or uploaded stylesheet points at
  `/wp-includes/`. The only mention left is a comment WordPress writes into gallery markup
  (`/* see gallery_shortcode() in wp-includes/media.php */`) on 4 posts, which is not a link.

## 3. Changes

| File | Change |
|------|--------|
| `tools/import.mjs` | `wp-includes/` is no longer copied, and the import removes any old `public/wp-includes/`. Links to `/wp-includes/` are no longer treated as local files when the import checks content links. The header comment now says `public/wp-content/` holds only uploads |
| `app/components/WpContent.vue` | Dropped the `/wp-includes/` special case from the click handler (no link points there) |
| `public/wp-includes/` | Deleted |

`public/` now holds `_data/`, `emoji/`, `wp-content/uploads/` and the four standalone sidebar pages.

## 4. Verification

- Before and after, I recorded the computed styles of every element on 5 pages (home, the blog archive, the video
  post, an image gallery post and a page with a post grid and icons). All of them match, the same fonts load, no
  request fails, and the video loads and plays (`readyState` 4).
- `npm run generate` builds without errors, and the build has no `wp-includes/` folder.
- `npm run check` matches the text of all 774 pages (the same 7 missing files as before, also missing on the live site).
