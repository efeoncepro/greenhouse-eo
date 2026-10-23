# Global site navigation — operating reference

Use for any change to the global menu of `efeoncepro.com` (header, mega menus, onepage, line cards, readings, photos,
CTA, scheduler) or to the code that renders it. Program: EPIC-055 (TASK-2040 AXIS, TASK-2041 plugin, TASK-2042
adapter and rollout); decision PDR-027; architecture
[`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../../../docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md);
operator manual [`operar-navegacion-global.md`](../../../../docs/manual-de-uso/public-site/operar-navegacion-global.md).
Facts below verified 2026-10-23.

## State in production

- The AXIS menu (`efeonce.site-nav`) is **on site-wide since 2026-10-23 00:09 UTC** (`eo_site_nav_enabled=on`), by the
  operator's decision, without a one-page pilot. `/blog/` (#18456) keeps Ohio's header (TASK-1802 owns that page).
- Sweep 2026-10-23: 52 published pages + 3 Glitch posts at 1440 and 390 — all 200, new menu present, Ohio header
  absent, panel and onepage open, `gh_site_nav_opened` reaches the dataLayer. Findings outside the menu were left as
  they are (404 resources inside old pages; Elementor overflow on 5 old/demo pages: `/home-2/`, `/demo-landing-2024/`,
  `/partnership/`, `/landing-loop-marketing/`, `/home-2-2/`). Do not attribute them to the menu.
- Live document: revision 4 (1 initial · 2 real posts on line cards + shortened reading titles · 3 Loop Marketing →
  Inbound · 4 «Surround Discovery™» instead of the HTML entity). Revision 4 was the CLI's first real use.
- Loop Marketing links `/agencia-inbound-marketing/` (operator, 2026-10-23: that landing is not optimized);
  `/landing-loop-marketing/` answers 301 to it via Yoast Premium (page 248840 noindex, out of the sitemap; UTM query kept
  by the mu-plugin `efeonce-redirect-query-passthrough`); its context matcher was removed.
- Growth/Engine/Voice line cards use real posts; 10 of 16 reading titles were shortened with the post's own words and
  every card title fits at 1440/1366/1280/1200.
- Fidelity («Rediseño de Menú») measured live and approved at 1440, 1280, 1200, 1024, 834, 390; onepage circle at
  1440–2560; «Estás aquí» on 10 service pages.
- Accepted design: at 1280 five service descriptions end in an ellipsis, in the Lab and live alike (contenidos,
  redes sociales, medios, performance, inbound). It is the approved design (canvas board Mega1280: `white-space:
  nowrap; overflow: hidden; text-overflow: ellipsis`, confirmed by the fidelity session on 2026-10-23); at 1440 they
  must be whole, and `fit` only fails there.

## Source of truth

- The **live document** (private CPT of the `eo-site-nav` «EO Navegación» plugin, with native WordPress revisions) is
  the source of truth. REST `eo/v1/site-nav`; server-side service `wp eo-nav validate|apply|export|revisions|restore`.
- The runtime mirror is `manifests/site-nav/efeoncepro.com.json`, refreshed with `site-nav pull --mirror`. It is a
  mirror, never the input of a write.
- `manifests/site-nav/build-efeoncepro-document.mjs` (runtime repo) is **bootstrap only**: it refuses without
  `--bootstrap`. It records the published titles of the shortened readings; never edit it by hand to change the live
  menu.
- Storage is **escaped ASCII** (non-ASCII and `& < > ' "` escaped) so host content filters cannot alter it
  (`wp_encode_emoji` once turned «™» into a literal «&#x2122;»). After a save the plugin reads the stored document back
  and it must hash the same, or the save fails with `eosn_storage_altered`. «Unchanged» compares against the stored
  document. Native revisions are found by ID, not by comparing content.

## CLI — `pnpm public-website:site-nav`

Source `scripts/public-website/site-nav/cli.ts` (Greenhouse). Working files live in `tmp/site-nav/` (gitignored).

| Command | Does |
| --- | --- |
| `pull [--revision n] [--keep] [--mirror]` | Downloads the live document (or a revision) into the working copy; `--mirror` also writes the runtime mirror |
| `show [selector]` | Prints a node |
| `set <selector> <field[.sub]> <value>` / `unset <selector> <field[.sub]>` | Edits one field |
| `glyphs` · `glyph service:<id> <name>` | Lists the Trazo catalog (60 glyphs) · sets a service icon |
| `photo <selector> --file <path> --alt <text> [--slug] [--crops mm,op,card] [--position] [--dry-run]` | Crops and uploads a photo (see Photos) |
| `add <parent> services\|lines\|items\|formats --json '{…}' [--after <id>\|--first]` | Adds a child |
| `remove <selector>` · `move <selector> …` | Removes or moves a node |
| `patch <ops.json>` | RFC 6902 `add` / `replace` / `remove` |
| `check` | Plugin validator, links and photos answer, no HTML entities, card title length |
| `fit` | Renders at 1440/1280/1200, walks every line, lists clamped text |
| `diff` | Working copy vs base, by id |
| `preview [--open soluciones] [--line growth]` | Desktop + phone screenshots |
| `apply --message "<why>" [--dry-run]` | Server dry run, then save against the base revision; a concurrent save is never overwritten; purges |
| `verify [--path <p>]` | Checks the live page |
| `revisions` · `restore <n> --message "<why>"` | Lists revisions · restores revision n |

Selectors: `primary:<id>`, `line:<id>`, `service:<id>`, `format:<id>`, `item:<id>`, `case:<id>`, `reading:<id>`,
`featured:<id>`, `strip:<id>`, `onepage:<id>`, plus `header`, `cta`, `logo`, `footer`.

**Production writes** — `photo` (without `--dry-run`), `apply`, `restore` — need the operator's go in chat. Everything
else is read-only or local.

## Edit loop

1. `pull` (always start from the live revision; the save is checked against it).
2. Edit with `set` / `unset` / `add` / `remove` / `move` / `patch` / `glyph` / `photo --dry-run`.
3. `check` — must pass.
4. `fit` — nothing clamped that matters; shorten copy with the post's or service's own words, never by hand-editing CSS.
5. `preview` — look at the desktop and phone screenshots of the panel or line you touched.
6. `apply --dry-run`, then with the operator's go `apply --message "…"`.
7. `verify`, then look at the live page once the edge refreshes (see Traps).

Adding, moving or removing an item follows the same loop: `add` with `--after`/`--first` or `move`, then `diff` to
confirm only the intended ids changed. A service's «Estás aquí» comes from its own `href` (AXIS 0.7.9); add a context
matcher only for a real exception.

## Photos

- `photo` crops to `mm` 880×472 (mega menu), `op` 996×1080 (onepage), `card` 880×496 (cards); `--crops` picks a subset,
  `--position` sets the focal point.
- Uploads to `gs://efeonce-group-axis-public-media/site-nav/v1/` with `--no-clobber` and immutable cache. An existing
  name gets `.vN`: **never overwrite a published photo** (cached immutably); a new file is a new name.
- `--alt` is mandatory; run `--dry-run` first to see the crops.

## Icons

Service icons come only from the Trazo catalog (`glyphs` lists the 60). Never draw or paste an SVG into the document.

## Rollback

- **Content:** `revisions`, then `restore <n> --message "…"` (operator's go), then `verify`.
- **Whole menu:** `set-site-nav-switch.php` with `{"mode":"off"}` puts Ohio back on every page; it prints the
  previous value and purges. Switching back to `off` has only been exercised in Playground, not in production yet.
- The adapter already keeps Ohio on any failure (plugin missing, no or invalid document, render error), logged as
  `[eo-site-nav] …`.

## Server scripts (Greenhouse `scripts/public-website/`)

All run over SSH/WP-CLI with an input file:
`pnpm public-website:wpcli -- --eval-file scripts/public-website/<script>.php --input-file <json> --wp-user 12`.

| Script | Input · behavior |
| --- | --- |
| `set-site-nav-switch.php` | `{"mode":"on"\|"pilot"\|"off","pilot":[ids]}`; refuses `on` without plugin, adapter and document; purges Kinsta; prints the previous value |
| `set-site-nav-scheduler.php` | `{cta, surface, key}` or `{"clear":true}`; never prints the key; purges |
| `apply-site-nav-document.php` | document + `{baseRevision, message, dryRun}` (the CLI's `apply` uses it) |
| `create-yoast-redirect.php` | `{origin, target, noindexPostId?, dryRun?}`; Yoast Premium API only; refuses an existing origin or an unpublished target; readback; purge |
| `site-nav/repair-revision-meta.php` | One-off revision metadata repair (used 2026-10-23); not a routine step |

## Scheduler CTA

- The header, mega and onepage CTA opens the native Greenhouse scheduler: one hidden `<greenhouse-cta>` per page,
  printed in `wp_footer` only when the option `eo_site_nav_scheduler` holds a valid `{cta, surface csur-…, key}`.
  CTA `site-nav-discovery-meeting`, surface `csur-eb834d53-fd99-4f6b-9615-979e329e7d37`, `cta_location: site_nav`.
  Details and rules: `greenhouse-growth-ctas` (rollout 2026-10-23).
- Renderer `https://greenhouse.efeoncepro.com/growth-cta/renderer-latest.js` loads on idle or when the visitor heads
  for the CTA (one copy on landings that already load it). If not ready the click waits up to 2.5 s; an empty launcher
  (`data-ghc-state="empty"`: paused, wrong origin) lets the link go to `/agenda/` at once.
- The dialog is marked `data-eo-meeting-skin="site"` and wears `ohio-child/assets/css/meeting-dialog.css` (Inbound frame
  approved 2026-10-18 with the `/agenda/` palette); a landing's own CTA dialog keeps its own skin.
- **Key rotation:** re-running `scripts/growth/publish-site-nav-meeting-cta.ts` rotates the surface key (stored in
  Greenhouse `.auth/site-nav-meeting-cta-surface.json`, 0600, gitignored); the WordPress option must follow with
  `set-site-nav-scheduler.php` in the same session or the CTA falls back to `/agenda/`. Never write the key in docs,
  logs, commits or chat.

## Code and deploy lanes

Runtime repo `efeonce-public-site-runtime` (branch `main`):

- Plugin `eo-site-nav`: CPT + revisions, save service, REST, PHP renderer `EOSN_Render` byte-identical to AXIS
  `siteNavHtml` (17 parity cases) and validator (35 parity cases). Playground suite
  `tests/playground/run-eo-site-nav.sh` (49 checks).
- Theme adapter `ohio-child/inc/site-nav.php` + overrides `parts/headers/header-style-1..8.php`, `site-nav-host.css`
  (admin-bar offset only), `site-nav-host.js`, `meeting-dialog.css`, pinned AXIS files under
  `assets/vendor/axis/site-nav/<version>/`.

Deploy (Greenhouse `scripts/public-website/`, all with sha256, drift guard and backup tar):

- Plugin: `build-site-nav-plugin-package.cjs` → `deploy-site-nav-plugin-package.php`.
- Theme: `build-site-nav-theme-package.cjs <exported live baseline dir>` → `deploy-site-nav-theme-package.php` (ZIP +
  manifest). Allowlist: `functions.php`, `inc/site-nav.php`, `header-style-1..8`, `site-nav-host.css`,
  `meeting-dialog.css`, `site-nav-host.js`, vendored AXIS files. Requires Ohio's 8 header parts; never changes the
  switch; creates it `off` if absent.
- `export-live-code-baseline.ts` keeps ohio-child `assets/vendor/axis/**` so the drift guard sees the pinned files.

Initial header state: a dark hero without Ohio's spacer starts `top` (glass); a page with the spacer or a light hero
(`EO_SITE_NAV_LIGHT_HERO_PAGES`: 251078, 242261, 223787, 223841, 21460, 19820) starts with the solid light island
(`fixed`). A new light-hero page that shows an unreadable white logo goes into that list (theme lane), not into CSS.

## AXIS version bump

1. Fix or change in AXIS (contract + primitive + Lab), release and publish the packages.
2. In the runtime repo, install the published packages and run
   `node scripts/vendor-axis-site-nav.mjs --primitives <node_modules/@efeoncepro/axis-ui-primitives> --brand <node_modules/@efeoncepro/axis-brand-assets> --version <x.y.z> --source "<package + tag>"`.
   It writes `assets/vendor/axis/site-nav/<x.y.z>/` with `VERSION.json` (sha256 per file). A local AXIS build is only
   for work in progress; re-vendor from the published package before deploying.
3. Set the theme constant `EO_SITE_NAV_AXIS` in `inc/site-nav.php` to the new version (today `0.7.10`).
4. If the render changed, bring `EOSN_Render` and the validator to parity and run the Playground suite.
5. Deploy through the theme lane (and the plugin lane if it changed), then `verify` and check live.

## Landing dock (`efeonce.landing-dock`, TASK-2043)

The glass bottom dock of the landings, the second piece of site chrome. One AXIS primitive (tokens `axisLandingDock`
reuse the island glass of `axisSiteNav`; schema `landing-dock.v1`; `landingDockHtml`, `landing-dock.css`,
`landing-dock.js`) consumed by the plugin `eo-landing-dock`, never re-implemented per landing.

- Per page: meta `_eo_landing_dock` = document + `start`/`end` selectors + `scheduler` (`site_nav` or the landing's own
  CTA `{cta, surface, key}`) + `legacy` (`{tag, attr}` of the old dock). With it the plugin paints the dock, prints a
  hidden `<greenhouse-cta cta-location="landing_dock">` and strips the old dock from the HTML; without it the page is
  untouched. Old and new never coexist.
- Configs: `efeonce-public-site-runtime/manifests/landing-dock/<landing>.json` (no keys; the key is read from the live
  page on `on`). `pending` blocks `on`.
- CLI: `pnpm public-website:landing-dock status | preview <landing|all> | snapshot <landing> | on|off <landing> --confirm | verify <landing>`.
  `preview` injects the dock into the live page in a local Chrome (no write). `on` needs a snapshot from the last hour.
- Plugin lane: `build-landing-dock-plugin-package.cjs` (refuses a local AXIS copy) → `deploy-landing-dock-plugin-package.php`.
- Copy is each landing's; a phone `shortLabel` is copy (operator). Presence (`desktop`/`phone`) keeps what each landing
  had until the operator decides otherwise.
- Cookie banner: HubSpot's `#hs-eu-cookie-confirmation`; the dock hides only when it overlaps the dock's place.
- Manual: `docs/manual-de-uso/public-site/operar-dock-de-landings.md`.

## Hard rules

- The host **never styles inside `.axis-site-nav`**. Its only inputs are `--axis-site-nav-offset` and
  `--axis-site-nav-z`; it loads the fonts (Bricolage Grotesque opsz/wght 200–800, Poppins 300–700). Any visual fix goes
  to AXIS and arrives by a version bump.
- Never hand-edit `build-efeoncepro-document.mjs` to change the menu, and never edit vendored AXIS files.
- Never write the document with SQL or by editing post meta; only through the plugin service (CLI / `wp eo-nav`).
- Production writes (photo upload, `apply`, `restore`, switch, scheduler option, redirects, deploys) need the
  operator's go in chat.
- Never cut a reading or service title by hand-editing markup; shorten with the source's own words and pass `fit`.
- Landings never create their own navigation.

## Measurement

`gh_site_nav_opened` (panel), `gh_site_nav_line_viewed` (line), `gh_site_nav_clicked` (`target_type`, `target`). The CTA
click travels as `gh_site_nav_clicked` with `target_type: cta`, `target: menu_header|menu_mega|menu_onepage`; the
scheduler emits `greenhouse_cta_*`; `site_nav_cta` is not pushed. GTM/GA4 setup of `gh_site_nav_*` is still pending
(human confirmation before publishing the container) — use `greenhouse-gtm-ga4-operator`.

## Traps

- **Kinsta edge:** after a purge, the edge refreshes in about 40 s–2 min. A changed existing PHP file can take 1–2 min
  more (opcache). Do not conclude a deploy failed before that.
- **zsh `path`:** in zsh `path` is tied to `PATH`; a loop variable named `path` clobbers it and every later command is
  «not found». Use another name (`p`, `url_path`).
- **Content filters:** never store or compare the document as rendered text; the escaped ASCII storage and the
  post-save hash exist because filters altered it.

## Pending

GTM/GA4 for `gh_site_nav_*`; Core Web Vitals against the previous header; production check of switching to `off`;
TASK-2041 admin (direction B, live preview + tree); the bottom glass dock for landings
(separate task).
