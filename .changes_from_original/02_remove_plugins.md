# remove plugins on branch `remove_plugins`

The mirror copies every WordPress plugin folder from `wp-content/plugins/` into `public/wp-content/plugins/`,
and `tools/import.mjs` bundles every plugin stylesheet the original pages linked into `public/legacy.css`.
The Nuxt rebuild draws several parts of the site itself, so some of those plugins are no longer used.
Each plugin below was checked and removed only if nothing in the rebuild depends on it.

Unused plugins are listed in one place, `UNUSED_PLUGIN` near the top of `tools/import.mjs`. A plugin on that
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
| `tools/import.mjs` | New `UNUSED_PLUGIN` pattern; the plugin is not copied and its CSS is not bundled or linked |
| `tools/import.mjs` | The home route no longer keeps the raw page `html`, since `HomePage.vue` only renders `sections` |
| `public/wp-content/plugins/animate-it/` | Deleted |
| `public/legacy.css` | Regenerated without the plugin's CSS |
| `public/_data/routes/2a0c975e.json` | Regenerated without the `html` field |

**Verification:** `npm run import` regenerates only the files above. The home page still shows the slider
and all 8 products, with no failed requests.
