# Deploying www.bekrpardazan.com (2026-10-21)

On 2026-10-21 the WordPress site moved to **www.bekrpardazan.com/old** and the static Nuxt
build took over **www.bekrpardazan.com**. This file records what was done, how the server is
laid out now, and how to redeploy or roll back.

## Server

- cPanel account `bekrpard` on `5.144.129.133`, cPanel on port 2083. The DNS of bekrpardazan.com
  points straight at this IP (no proxy in between).
- No SSH (the account shell is `noshell`). Everything was done with the cPanel API using an API
  token: UAPI (`/execute/<Module>/<function>`) and API 2 (`/json-api/cpanel`, `Fileman::fileop`
  for move, extract and delete-to-trash). Header: `Authorization: cpanel bekrpard:<TOKEN>`.
  The token was given for this job; delete it under **cPanel → Manage API Tokens** when done,
  and never commit one.
- Disk quota is 2,000 MB and was 1,809 MB used before the move (about 137 MB free afterwards),
  so uploads are **not** copied a second time for the Nuxt site (see below).
- The addon domains ansari-lustre.com and azarvan.com live in `/home/bekrpard/<domain>`,
  outside `public_html`, and were not touched.
- The web server is LiteSpeed. Its firewall blocks an IP after a burst of requests: checking
  4,612 image URLs with HEAD requests blocked this PC's IP for about 15 minutes. Keep live checks
  small and slow (one request at a time, with a pause).

## Layout of `public_html` now

| Path | What it is |
| --- | --- |
| `.htaccess` | The root rules, kept in this repo as [`root.htaccess`](root.htaccess) |
| `new/` | The Nuxt static build (`.output/public` without `wp-uploads/`), served at the root |
| `old/` | The whole WordPress install (wp-admin, wp-content, wp-includes, wp-config.php, its .htaccess) |
| `docs/`, `cgi-bin/`, `.well-known/`, `bekrpard/`, `bekrpardazan.com/`, `rootDisk/` | Non-WordPress folders, left where they were |
| `.user.ini`, `php.ini` | PHP settings, left at the root (they also apply to `/old`) |

## What `root.htaccess` does

1. Redirects `bekrpardazan.com` to `www.bekrpardazan.com`.
2. Serves `/wp-uploads/*` (the image path the Nuxt site uses) from `/old/wp-content/uploads/*`
   as an internal rewrite, so the images exist only once on disk. All 4,612 images of the build
   were checked to exist on the server before this was relied on.
3. Redirects (301) `/wp-content/*` and `/wp-includes/*` to `/old/...`, so old links in posts,
   Elementor CSS and other sites keep working. `/wp-admin`, `/wp-login.php`, `/wp-json`,
   `/xmlrpc.php` and `/feed` redirect (302) to `/old/...`.
4. Redirects any address that contains `/new/` to the same address without it.
5. Adds the trailing slash to folder URLs itself, so the redirect never exposes `/new/`.
6. Serves anything that exists in `/new/` from there, so every URL stays as it was.
7. `ErrorDocument 404 /new/404.html`, `DirectoryIndex index.html index.php`, no directory
   listings, compression and cache headers (Nuxt's hashed `/_nuxt/` files are cached for a year).

## WordPress at /old

- `old/wp-config.php` got two lines after `<?php`:
  `define( 'WP_HOME', 'https://www.bekrpardazan.com/old' );` and the same for `WP_SITEURL`.
  The database was **not** edited (siteurl/home in `a33_options` still hold the old address and
  are overridden by these defines).
- `old/.htaccess` is the old root .htaccess with the WordPress block changed to
  `RewriteBase /old/` and `RewriteRule . /old/index.php [L]`. The AccelerateWP and LiteSpeed
  Cache blocks were kept as they were.
- Absolute links inside old posts that point to `https://www.bekrpardazan.com/<page>/` now open
  the Nuxt version of that page.

## What was done, in order

1. Built the static site from `main` (`npm run generate`): 1,566 routes, 293 MB with uploads,
   51 MB without.
2. **Backups**, saved on the PC in `P:\source\BP\Bekrpardazan-backups\2026-10-21`:
   - `bekrpard_wp.sql.gz`: the full `bekrpard_wp` database (39 tables, 10.9 MB compressed).
   - `public_html.tar.gz`: all of `public_html` (19,748 entries, 344 MB compressed, 505 MB).
   cPanel will not hand its own backup downloads to an API token and there is no SSH, so a
   temporary PHP script with a random name and secret key streamed both straight to the PC
   (no server disk used). It was deleted right afterwards (to the cPanel trash).
3. Uploaded the build as a `.tar.gz` (11 MB) to the home folder.
4. Created `public_html/old` and moved the 26 WordPress entries into it (about 21 seconds), edited
   `old/wp-config.php` and `old/.htaccess`, unpacked the build into `public_html`, and wrote the
   new root `.htaccess`. Downtime was about 30 seconds.
5. Fixed `DirectoryIndex` (it first listed only `index.html`, which made `/old/` return 403).
6. Fixed the desktop menu: submenus closed while the pointer crossed the 10 px gap under the
   menu bar (commit 7b85672, `app/components/SiteHeader.vue`). Rebuilt and redeployed.
7. Matched the home page sizes to the original: the hero slider now uses Smart Slider's
   1200×693 canvas capped at 693 px high (it had grown to 966 px on a 1920 px screen), and the
   client logos keep their own aspect ratio (commit d09e4bc, `app/components/HomePage.vue`).
   The products grid and blog carousel were measured against /old at 1024, 1280, 1536 and
   1920 px wide and already matched. Rebuilt and redeployed.
8. Moved the 166 Nuxt entries from the root into `public_html/new` and switched the root
   `.htaccess` to serve them from there (commit 01b59c1 added it to this repo).
9. Removed the temporary upload folder and tarballs from the server (to the cPanel trash).

Each step was checked with a small live sample (home page, 40 pages, 25 assets, 6 old-URL
redirects, the 404 page, `/old/`, `/old/wp-admin/`) and in a browser.

## Redeploying the Nuxt site

1. `npm run generate`
2. Pack the build without uploads (Git Bash):
   `cd .output/public && tar --format=gnu --exclude=./wp-uploads -czf ../../nuxt-site.tar.gz .`
3. Upload `nuxt-site.tar.gz` to `/home/bekrpard` (cPanel File Manager, or UAPI
   `Fileman/upload_files` with `dir=/home/bekrpard` and `overwrite=1`).
4. Extract it into `/home/bekrpard/public_html/new` (File Manager → Extract, or API 2
   `Fileman::fileop` with `op=extract`, `sourcefiles=/home/bekrpard/nuxt-site.tar.gz`,
   `destfiles=/home/bekrpard/public_html/new`). Extracting overwrites changed files; old
   `/_nuxt/` chunks stay behind and do no harm.
5. Delete the uploaded tarball and check a few pages.

If new images were added to WordPress uploads for the Nuxt site, they are served automatically
through the `/wp-uploads/` rewrite as long as they exist in `old/wp-content/uploads/`.

In Git Bash, set `MSYS_NO_PATHCONV=1` before passing `/home/...` paths to curl, otherwise Git
Bash rewrites them into Windows paths (this once created a stray `C:` folder on the server).

## Rolling back to WordPress at the root

1. Move everything in `public_html/old` back to `public_html` (or restore it from
   `public_html.tar.gz`).
2. Remove the two `WP_HOME` / `WP_SITEURL` lines from `wp-config.php`.
3. In the restored `.htaccess`, set the WordPress block back to `RewriteBase /` and
   `RewriteRule . /index.php [L]` (the backup's `.htaccess` already has these).
4. Move `public_html/new` out of the way.
