# Changes on branch `enhance_1`

Fonts, type scale, color themes and dark mode for the Nuxt rebuild of bekrpardazan.com.

## 1. Font: Vazirmatn

- All Persian text now uses **Vazirmatn** (open source, SIL OFL 1.1) in place of the old mix of
  IRANSans, B Mitra, Broya and others.
- The font is self-hosted. Six weights are saved in `app/assets/fonts/vazirmatn/`: Light (300),
  Regular (400), Medium (500), SemiBold (600), Bold (700) and ExtraBold (800), with the license in
  `OFL.txt`. They are declared with `@font-face` in `app/assets/css/main.css`, and Nuxt bundles them
  with hashed file names at build time.
- Icon fonts (FontAwesome, eicons, Genericons, Dashicons, Glyphicons) keep their own font, so icons
  still render.

## 2. Type scale

Defined in `app/assets/css/main.css` and available as Tailwind classes (`text-h1`, `text-body`, and so on):

| Role    | Size                       | Line height | Weight  |
|---------|----------------------------|-------------|---------|
| h1      | 28px on phones, up to 36px | 1.35        | Bold    |
| h2      | 24px on phones, up to 30px | 1.4         | Bold    |
| h3      | 22px on phones, up to 24px | 1.45        | Bold    |
| h4      | 20px                       | 1.5         | Bold    |
| h5      | 18px                       | 1.6         | Bold    |
| h6      | 16px                       | 1.6         | Bold    |
| lead    | 18px                       | 1.8         | Regular |
| body    | 16px                       | 1.9         | Regular |
| caption | 13px                       | 1.6         | Regular |

- Body text went from 13px to 16px with a taller line height, which reads better in Persian.
- Captions, image captions and post meta (date, author) use the caption size.
- The scale applies to the header, the footer, the home page headings and the WordPress page content.
  For page content it sits in the `components` CSS layer, above the original `legacy` styles.

## 3. Color themes

- Each theme is defined by two seed colors: an accent (`--seed-brand`) and a dark companion
  (`--seed-deep`). Every shade from 50 to 950 is mixed from those two with CSS `color-mix()`. They
  become the `brand` palette (the Nuxt UI primary color) and the `deep` palette (the secondary color).
- The site's original color names (`mint`, `teal`, `jade`, `navy`) now follow the active theme, so
  the header, menus, footer and product cards change color with it.

| Theme            | id       | Accent    | Deep      |
|------------------|----------|-----------|-----------|
| بکرپردازان (default) | `bekr`   | `#33bb9d` | `#001c54` |
| اقیانوس          | `ocean`  | `#1e88e5` | `#0b2545` |
| غروب             | `sunset` | `#e8590c` | `#3d0c26` |
| یاسی             | `royal`  | `#7c4dff` | `#1f1147` |

The default theme uses the teal and navy of the current site.

To add a theme, add a `:root[data-theme="…"]` rule with its two seed colors in `main.css`, then add an
entry to `app/composables/useSiteTheme.ts`.

## 4. Dark mode

- Uses Nuxt UI color mode (`@nuxtjs/color-mode`). The `dark` class goes on `<html>`.
- Light is the default, so the site looks like the original until a visitor changes it.
- The header, footer and home page use semantic colors (`bg-surface`, `bg-subtle`, `text-ink`,
  `text-muted`) instead of fixed hex values, and these switch in dark mode.
- For the WordPress page content, dark mode sets neutral text and heading colors, clears white
  backgrounds and restyles form fields. Images are left as they are.
- In dark mode, the footer's light background image is hidden and the logo is inverted so it stays
  visible.
- Limitation: text that has its color set inside the content itself (for example some teal and orange
  Elementor headings) keeps that color on the dark background.

## 5. Theme and mode switcher

- New component `app/components/ThemeSwitcher.vue`: a palette button in the header, on desktop and on
  mobile, that opens a panel with:
  - the four themes, each with a color swatch;
  - light, dark and system modes.
- The choices are saved in `localStorage` (`bp-theme` and `bp-color-mode`). A small script in the page
  head applies the saved theme before the page draws, so it doesn't flash the default colors.

## Files changed

| File | Change |
|------|--------|
| `app/assets/fonts/vazirmatn/*` | New: six Vazirmatn woff2 files and the license |
| `app/assets/css/main.css` | Font faces, type scale, theme palettes, dark mode, content styles |
| `app/app.config.ts` | New: Nuxt UI colors (primary `brand`, secondary `deep`, neutral `zinc`) |
| `app/composables/useSiteTheme.ts` | New: theme list and switching logic |
| `app/components/ThemeSwitcher.vue` | New: theme and mode picker |
| `app/components/SiteHeader.vue` | Adds the switcher, semantic colors, logo in dark mode |
| `app/components/SiteFooter.vue` | Semantic colors, type scale, no background image in dark mode |
| `app/components/HomePage.vue`, `HomeHeading.vue` | Semantic colors, type scale, theme-aware shadows |
| `nuxt.config.ts` | Turns on color mode (light by default) and adds the head script for the saved theme |
| `tools/compare-text.mjs` | Updated the footer marker the text check uses (`bg-white` became `bg-surface`) |
| `README.md` | Documents typography and themes |

## Verification

- `npm run generate` builds without errors, and the six font files are in the output.
- `npm run check`: page text matches the original site on all 774 pages. The same 7 files are missing
  as before; they also return 404 on the live site.
- In the browser: the home page in dark ocean, light sunset and dark violet, and two content pages
  in dark ocean, on desktop. On phone size, the dark violet home page.
