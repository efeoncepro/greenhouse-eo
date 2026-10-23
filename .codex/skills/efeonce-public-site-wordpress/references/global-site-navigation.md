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
- AXIS pinned in the theme: primitives **0.7.13** (contracts 0.7.12), deployed 2026-10-23 04:28 UTC. 0.7.12 reads the
  island tone under gradients and skips fixed host chrome (fixed a light island over the navy E-E-A-T band of
  `/servicios/posicionamiento-seo/`); 0.7.13 keeps the tone while the scheduler dialog is open and after it closes.

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
| `glyphs [filter]` · `glyph service:<id> <name>` | Lists the Trazo catalog (60 glyphs) · sets a service icon |
| `photo <selector> --file <path> --alt <text> [--slug] [--crops mm,op,card] [--position attention\|centre\|north] [--dry-run]` | Crops and uploads a photo (see Photos) |
| `add <parent> services\|lines\|items\|formats --json '{…}' [--after <id>\|--first]` | Adds a child |
| `remove <selector>` · `move <selector> --after <id>\|--before <id>\|--first\|--last` | Removes or moves a node |
| `patch <ops.json>` | RFC 6902 `add` / `replace` / `remove` |
| `check` | Plugin validator, links and photos answer, no HTML entities, card title length |
| `fit` | Renders at 1440/1280/1200, walks every line, lists clamped text |
| `diff` | Working copy vs base, by id |
| `preview [--path /x/] [--open soluciones] [--line growth]` | Desktop + phone screenshots |
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
- `set-site-nav-scheduler.php` with invalid values (slug, `csur-…` surface, key) **empties** the option and fails: the
  menu CTA then follows its fallback page (`/agenda/`) until a valid input is applied.
- The dialog is marked `data-eo-meeting-skin="site"` and wears `ohio-child/assets/css/meeting-dialog.css` (Inbound frame
  approved 2026-10-18 with the `/agenda/` palette); a landing's own CTA dialog keeps its own skin.
- **Key rotation:** re-running `scripts/growth/publish-site-nav-meeting-cta.ts` rotates the surface key (stored in
  Greenhouse `.auth/site-nav-meeting-cta-surface.json`, 0600, gitignored); the WordPress option must follow with
  `set-site-nav-scheduler.php` in the same session or the CTA falls back to `/agenda/`. Never write the key in docs,
  logs, commits or chat.

## Code and deploy lanes

Runtime repo `efeonce-public-site-runtime` (branch `main`):

- Plugin `eo-site-nav`: CPT + revisions, save service, REST, PHP renderer `EOSN_Render` byte-identical to AXIS
  `siteNavHtml` (17 parity cases) and validator (35 parity cases), both against AXIS 0.7.13 (contracts 0.7.12).
  Playground suite `tests/playground/run-eo-site-nav.sh` (49 checks).
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

Pinned today: `@efeoncepro/axis-ui-primitives` **0.7.13** (contracts 0.7.12, brand assets 0.4.30), folder
`ohio-child/assets/vendor/axis/site-nav/0.7.13/`, live since 2026-10-23 04:28 UTC. Version history and what each one
fixed: `axis-design-system` → `references/ui-primitives.md` §site-nav. The site never uses a «latest» AXIS and never a
local build in production; a tag that stopped before publishing (`v0.7.11`) is not a package.

1. **AXIS:** change contract + primitive + Lab with a browser test, release, and confirm the package is in GitHub
   Packages (CI green on the tag).
2. **Fetch the published packages** (neither repo has them installed). In a scratch dir, with a temporary `.npmrc`
   that is `0600` and removed right after:

   ```bash
   umask 077; printf '@efeoncepro:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' "$(gh auth token)" > .npmrc
   npm pack @efeoncepro/axis-ui-primitives@<x.y.z> @efeoncepro/axis-brand-assets@0.4.30
   rm -f .npmrc
   mkdir prim brand && tar -xzf efeoncepro-axis-ui-primitives-<x.y.z>.tgz -C prim && tar -xzf efeoncepro-axis-brand-assets-0.4.30.tgz -C brand
   ```

   Brand assets: the version the primitive release uses (0.4.30 today). Never print the token or leave the `.npmrc`
   behind.
3. **Vendor** in `efeonce-public-site-runtime`:
   `node scripts/vendor-axis-site-nav.mjs --primitives <scratch>/prim/package --brand <scratch>/brand/package --version <x.y.z> --source "published @efeoncepro/axis-ui-primitives@<x.y.z> and @efeoncepro/axis-brand-assets@0.4.30 (GitHub Packages, tag v<x.y.z>)"`.
   It writes `assets/vendor/axis/site-nav/<x.y.z>/` with `VERSION.json` (sha256 per file). Set `EO_SITE_NAV_AXIS` in
   `inc/site-nav.php`, and `git rm` the previous version folder.
4. **Parity:** `node tests/fixtures/site-nav/generate-render-data.mjs <axis-design-system checkout at the tag>`, then
   `php tests/eo-site-nav-render.test.php` (17 cases) and `php tests/eo-site-nav-validator.test.php` (35 cases); if the
   HTML changed, `EOSN_Render` follows (plugin lane) and the Playground suite runs. **Commit** in the runtime: the
   package refuses uncommitted theme files.
5. **Deploy the theme** from Greenhouse (operator's go):

   ```bash
   pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/site-nav
   node scripts/public-website/build-site-nav-theme-package.cjs tmp/public-site-code-baselines/site-nav
   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-site-nav-theme-package.php \
     --input-file tmp/site-nav-theme-release/package.zip --input-file tmp/site-nav-theme-release/manifest.json --wp-user 12
   ```

6. **Purge:** the deploy does not purge; run `set-site-nav-switch.php` with the current mode (`{"mode":"on"}`) — it
   keeps the mode, purges and prints the previous value. Wait 1–2 min (opcache), then `verify` and look at a page at
   1440 and 390 in a foreground browser (see Traps).

**Relation to the landing dock:** the dock pins its own AXIS copy (primitives 0.7.14) inside the plugin
`eo-landing-dock`; the menu's pin lives in the theme. Bumping one never moves the other. Both read the tone the same way
(the dialog guard of 0.7.13 is shared) and the dock skips `[data-axis-site-nav]` when reading its own tone.

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
- Plugin `eo-landing-dock` (its own plugin, not `eo-elementor-widgets`): `EOLD_Validator` (vendored schema), `EOLD_Render`
  (byte port of `landingDockHtml`, 10 reference cases), `EOLD_Store` (meta, allowlist `EOLD_PAGES` + filter
  `eo_landing_dock_pages`), `EOLD_Front` (paints in `wp_footer`, strips the legacy dock only when the meta exists),
  `wp eo-dock list|get|validate|set|unset|snapshot`; `assets/js/landing-dock-host.js`; pinned AXIS copy
  `assets/vendor/axis/landing-dock/<version>/` + `VERSION.json` (sha256), copied by `scripts/vendor-axis-landing-dock.mjs`.
- **New landing:** use this dock, never a custom fixed bar. Add `manifests/landing-dock/<landing>.json` (document
  `landing-dock.v1` + `start`/`end`/`stop`/`scheduler`/`legacy`) and add the page id to `EOLD_PAGES` (plugin release) or
  the filter; then `snapshot` → `preview` → `on --confirm` with the operator's go. The scheduler only as the primary
  action; every width where the dock exists keeps one action. Reference cases for any port:
  `packages/primitives/fixtures/landing-dock/cases.json` (shipped in the primitives package).
- Live on the seven landings since 2026-10-23 (AXIS primitives 0.7.14 pinned in the plugin).
- CLI: `pnpm public-website:landing-dock status | preview <landing|all> [--with-cookies] | snapshot <landing> | on|off <landing> --confirm | verify <landing> | purge`.
  `preview` injects the dock into the live page in a local Chrome (no write; declines cookies unless `--with-cookies`).
  `on` needs a snapshot from the last hour, purges and verifies the served HTML. Output in `tmp/landing-dock/`.
- Plugin lane: `build-landing-dock-plugin-package.cjs` (refuses a local AXIS copy) → `deploy-landing-dock-plugin-package.php`
  (allowlist, hashes, drift guard, backup, main file last). `export-live-code-baseline.ts` includes the plugin and its vendor.
- Copy is each landing's; a phone `shortLabel` is copy (operator). Presence (`desktop`/`phone`) keeps what each landing
  had until the operator decides otherwise.
- Cookie banner: HubSpot's `#hs-eu-cookie-confirmation`; the dock hides only when it overlaps the dock's place.
- `stop` (per page): hidden from that element to the end of the page — SEO `#grader`, Performance `#diagnostico`,
  Influencers `#conversion`. Home and Inbound have none (their old docks came back).
- After a plugin update run `purge`; one URL may need about a minute.
- AXIS releases: nobody commits on AXIS `main` while `pnpm release:packages` waits for CI — it tags HEAD at the end
  (v0.7.13 landed on another session's commit on 2026-10-23).
- Social and Home open the menu's scheduler (`site-nav-discovery-meeting`); Influencers, Inbound and HubSpot keep their
  own meeting CTA; SEO and Performance only link to their form.
- Manual: `docs/manual-de-uso/public-site/operar-dock-de-landings.md`; architecture
  `PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` §Dock inferior de las landings; AXIS `docs/quality/landing-dock.md`.

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
scheduler emits `greenhouse_cta_*`; `site_nav_cta` is not pushed. The host adds `target_label` (entry name or the
accessible name of the logo/social icons, never description or eyebrow) and `target_url` (path + hash, full address if
external, no query) to every `gh_site_nav_clicked` through a capture-phase click listener. Registered in GTM (version 9,
labels and URLs since version 10,
`scripts/gtm/build-site-nav-events-workspace.ts`) and GA4 (dimensions `panel`, `line`, `target_type`, `target`) on
2026-10-23; changes go through `greenhouse-gtm-ga4-operator`.

Dock: `landing-dock-host.js` pushes `gh_landing_dock_clicked` with `target_type` (cta|link), `target`
(primary|secondary), `target_label` (full label, never the phone's short one) and `target_url` (path + hash, no query),
read through a capture-phase click listener that runs before the dock's own handler. Registered in GTM (version 8,
`scripts/gtm/build-landing-dock-events-workspace.ts`) and GA4 (four event dimensions) on 2026-10-23. Its
meeting CTA uses `cta-location="landing_dock"`, which replaced `inbound_mobile_dock` and `hubspot_mobile_dock`.

## Traps

- **Kinsta edge:** after a purge, the edge refreshes in about 40 s–2 min. A changed existing PHP file can take 1–2 min
  more (opcache). Do not conclude a deploy failed before that.
- **zsh `path`:** in zsh `path` is tied to `PATH`; a loop variable named `path` clobbers it and every later command is
  «not found». Use another name (`p`, `url_path`).
- **Hidden browser pane:** a collapsed or background browser pane (for example the desktop app's Browser pane) runs the
  page in the background — no `requestAnimationFrame`, no scroll events — so the island tone does not update and the
  scheduler's scroll lock looks stuck. Not a site defect: verify tone, scroll and the scheduler in a foreground browser
  (headless Playwright works). Also, `window.scrollTo(0, y)` without `behavior: 'instant'` is smooth on this theme and
  may not have moved after a short wait.
- **Content filters:** never store or compare the document as rendered text; the escaped ASCII storage and the
  post-save hash exist because filters altered it.

## Pending

Core Web Vitals against the previous header; production
check of switching to `off`; TASK-2041 admin (direction B, live preview + tree); retire the seven legacy docks' code
(still in each landing, stripped from the HTML by the plugin); one shared scheduler bridge for `site-nav-host.js` and
`landing-dock-host.js`.
