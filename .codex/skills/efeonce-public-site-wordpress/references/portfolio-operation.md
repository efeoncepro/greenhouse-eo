# Portfolio operation (EO Portfolio, `/portafolio/`)

Load for any work on the public portfolio: loading, editing, publishing or unpublishing a project, the client approval
gate, the plugin `eo-portfolio`, its REST, or the migration from Ohio's `ohio_portfolio` (EPIC-056, PDR-028).

## State (2026-10-30)

- Plugin `eo-portfolio` v0.8.0 **live since 2026-10-30** (runtime c6e1734): admin, piece roles, public pages, video, phone/tablet
  layer (rails, sticky filter bar, dock), SEO layer `EOP_Seo` (meta, Yoast graph merge, canonical 301s, sitemap images)
  and `EOP_Agents` (Abilities + WebMCP, read-only, **off**: `eo_portfolio_agent_tools` = `0`).
- `eo_portfolio_enabled` = `1`; **17 projects published**: the 15 that were live under Ohio (operator approval
  2026-10-29, logo + pieces) plus Sky Airline «Un año de campañas» (videos, sourced figures, testimonial) and Berel
  Pitaya (operator approval 2026-10-30 on the canvas). Order in `eo_portfolio_order` (Sky first: its spot plays in the lens).
- 46 Yoast 301 from `/project/*` and old slugs + 12 rechained + one regex `^/?portfolio-category(/.*)?$` → `/portafolio/`;
  the 59 Ohio entries are drafts (none deleted).
- `eo-axis-video` is committed but **not activated nor deployed**; the portfolio uses it only if it becomes active.
- Pending: deactivate Ohio Portfolio from 2026-11-29 after checking Search Console (TASK-2049).
- Gotchas: Ohio's scroll container stalls `animation-timeline: view()` (use IntersectionObserver); Ohio colours
  headings (inherit inside `#eop`); lazy images inside a sideways-moving clipped track never load; page 247116 hid the
  footer through its Ohio meta (the route reads it as `inherit`); a `<button>` does not inherit the font (row titles
  were Arial); an IntersectionObserver on an element with `clip-path: inset(100%)` never fires (gate it on a parent);
  «stuck» must be measured against `--eop-stick`, not observed with a root margin; a code deploy does not purge the
  page cache — run `eo-portfolio/purge-portfolio-cache.php`.

## Project kinds (0.8.0)

Each kind has its own page sections (`EOP_Kinds`); `pnpm public-website:portfolio -- kinds` prints what each one shows
and what its document needs.

| Kind | Pieces / blocks | What the validator demands |
|---|---|---|
| `social` | role `post`: `channel` (instagram, facebook, linkedin, x, tiktok, youtube, threads, pinterest), `placement` (feed, story, reel, carousel, document, post, short, video, pin, thread), `postText`, `postedAt` | `channel` on every `post` |
| `audiovisual` | role `cut`: `version`, `where`, `durationSeconds` (video only, 0.5–7200); role `bts` (shoot photos/videos) | `version` on every `cut`; `consentRef` on every `bts` (**never projected**) |
| `ai-production` | top-level `ai` {`models[]` {`stage`: image, video, voice, music, upscale, compositing, other; `name`}, `teamDid`, `aiDid`, `fictional`}; role `ai`: `aiStage` (anchor, angle, expression, pose, plate, scene, final), `label`, `compareTo` (another piece id: before/after) | `ai` block required; `aiStage` on every `ai` piece; `compareTo` must exist (`UNKNOWN_REFERENCE`) |
| `seo-content` | top-level `search` {`source`, `period`, `highlight`, `kpis`, `series`, `query` (SERP climb), `keywords`, `aeo` (engines chatgpt, gemini, perplexity, ai-overviews, copilot, claude), `contents`}; role `banner` (`size`) | `search` with `source`, `period` and at least one figure; publishing needs the `metrics` scope (`APPROVAL_SCOPE_METRICS`); `series.compare` same length as `values` |

Any kind may carry `specs` (max 10 {`label`, `value`}, the «Ficha técnica»). The «PRODUCIDO CON IA» badge shows on
every `ai-production` project and on any project with a role `ai` piece — there is no field to hide it. Search figures
are projected only with `metrics`; contents only with `pieces`.

- **Create:** `pnpm public-website:portfolio -- new <slug> --kind <social|audiovisual|ai-production|seo-content|campaign>`
  copies a template from `scripts/public-website/portfolio/templates/` (all validate). `validate` lists the remaining
  `[COMPLETAR…]` markers (and template `mediaId` 1); `apply` refuses while any remain. Never publish template text or
  invented figures: example data stays marked as example.
- **Admin:** knows the new kinds and roles and keeps their fields on save (`EOP_Admin::carry_over`), but does not edit
  them yet — edit them through the CLI.
- **Brand marks:** channel logos are the AXIS isotypes compiled into `EOP_Platforms` (Pinterest from Iconify `logos`);
  UI icons (X action bar, players) are Remix paths in `EOP_Icons`. Never draw a brand mark or icon by hand.
- **Deploy state:** 0.9.1 is live since 2026-10-30 (runtime `7106cc4`): the testimonial is a dark scene (`voice`; optional
  `testimonial.highlight` must be the client's own words inside the quote; client logo from `client.logoMediaId`, negative
  version) and «Detrás del trabajo» (`behind`). Since 0.9.0: a project with two or more chapters renders a
  campaign explorer (`campaign_explorer`; chapters may carry `period`, `markets`, `summary`, `madeWithAi` — declare AI
  per campaign, never with role `ai` in a campaign project); new images go in with `upload-portfolio-images.php`, a
  retired entry gets its 301 with `redirect-retired-entry.php`. Since 0.8.3: project page with the graphic-line measure orbit
  (`measure_svg`), the project's line accent (`LINE_ACCENT`), a film strip for a landscape spot and a three-format hero
  stack (`hero_trio`). Since 0.8.2: one row per brand (`EOP_Render::by_brand`) shown
  as a campaign index — sub-rows with need, sourced figure and thumbnails, each with its own panel; any number of
  campaigns, folded after three (`BRAND_FOLD`) behind «Ver N campañas más». Desktop rows sit on fixed grid columns. After any code
  deploy run `scripts/public-website/eo-portfolio/purge-portfolio-cache.php` (the deploy does not purge the page cache)
  and verify the existing entries are unchanged (0.8.0 changed the hero markup and chapters).
- Step-by-step CLI manual: `docs/manual-de-uso/public-site/operar-portafolio-por-cli.md`.

## Public pages switch

`scripts/public-website/eo-portfolio/set-portfolio-switch.php` (input JSON): `enabled` `0` | `preview` | `1`, `order`,
`tally`, `newToken`. Preview serves only with `?eop_preview=<token>`, noindex, drafts included. Ask the operator before
each production change.

## Admin screen

`Portafolio` menu (plugin v0.2.0, live since 2026-10-29, built on the approved design): list and
structured editor over the same `EOP_Store`. Review it locally with
`efeonce-public-site-runtime/tests/playground/serve-eo-portfolio.sh` (Playground on :9400, fixtures loaded, logged in).

## The only way to change a project

```bash
pnpm public-website:portfolio -- list | pull <slug> | new <slug> --from <file> | validate <slug> [--remote]
pnpm public-website:portfolio -- preview <slug> | diff <slug> | apply <slug> --message "…" [--dry-run]
pnpm public-website:portfolio -- publish <slug> --message "…" [--dry-run] | unpublish <slug> --message "…"
pnpm public-website:portfolio -- revisions <slug> | log <slug> | restore <slug> <rev> --message "…" | verify [<slug>]
```

- Working copies live in `tmp/portfolio/<slug>/` (`live.json`, `working.json`, `preview.json`, `before-r<N>-*.json`).
- `validate` and `preview` run the plugin's own validator and projection locally (no SSH), from the runtime repo.
- Remote steps go `pnpm public-website:wpcli` → `scripts/public-website/portfolio/remote.php` → `wp eo-portfolio`: the
  same save service as the admin. Never write `post_content` or `_eop_*` meta directly, never a parallel PHP script.
- `apply`, `publish`, `unpublish`, `restore` write production: **ask the operator first, each time**.

## Rules the plugin enforces (do not re-implement, do not work around)

- No publish without `clientApproval` with `ref` (opaque pointer to where the approval is recorded, never a contact's
  name or email), `date` and a non-empty `scope` (`logo`, `pieces`, `metrics`, `testimonial`, `creators`). A published project
  cannot be saved without it (`eop_publish_gate`): unpublish first.
- The scope decides what the public sees; what it does not cover is not served even if loaded.
- Project `kind` (campaign | website | web-section | ugc | system | other | social | audiovisual | ai-production |
  seo-content) and piece `role` (campaign | web | section | ugc | in-situ | diagram | answer | post | cut | bts | ai |
  banner); absent means `campaign`. Each role carries only its fields
  (`EOP_Validator::ROLE_FIELDS`): `web` → `device`, `longCapture`, `liveUrl`; `section` → `sectionName` (required),
  `position` {from < to, 0–1}, `liveUrl`; `ugc` → `creator` {`handle` with @, `platform`, `consentRef`} (required);
  the 0.8.0 roles are in «Project kinds» above.
- A creator's video shows only with `pieces` **and** `creators` (client approval of a campaign does not license a
  creator's face); `consentRef` never leaves the projection; a `kind: ugc` project cannot publish without `creators`.
  Only set `creators` when each creator's authorization is recorded.
- Every `results[]` has `source`; `percent` is 0–100 without `%`; only a percent enables the measure orbit.
- Every media item has real `width`, `height` and `alt`; images use a Media Library `mediaId`; videos use `src` and
  `poster` in the public AXIS bucket (`portfolio/v<N>/<slug>/`) and `captionsVtt` when they have voice. No video upload
  to WordPress.
- `services` only from `schema/services.v1.json`; `line` is growth | brand | engine | voice | revenue.
- Video `src`, `poster` and `captionsVtt` must be under `schema/media-hosts.v1.json` (public AXIS bucket); anything else
  fails with `MEDIA_HOST_NOT_ALLOWED`.
- Saves are against a base revision: a conflict means someone saved in between → `pull`, reapply, `apply`.
- No rule may depend on a client, campaign or slug name.

## Gotchas learned building it

- Yoast matches the full request URL: verify 410s **without** a cache-busting query (`?nc=` makes it miss).
- WordPress guesses a 404 destination by slug prefix before Yoast's 410 (`lifestyle-app` → `lifestyle-app-elementor`);
  the plugin turns that off under `/project/` and `/portafolio/`.
- Ohio entries duplicated from demos inherited the demos' slugs as `_wp_old_slug`; WordPress redirected those URLs
  before Yoast answered. TASK-2046 deleted the 71 rows; the store never copies that meta.
- `export-live-code` exports an allowlist of plugin directories; `eo-portfolio` was added on 2026-10-29. Without it
  the deploy refuses with «Live drift» (correctly).

## Deploy the plugin

Runtime gates: `php tests/eo-portfolio.test.php` + `tests/playground/run-eo-portfolio.sh`. Then
`export-live-code` → `build-portfolio-plugin-package.cjs` → `deploy-portfolio-plugin-package.php` (see the manual).
The deploy refuses on drift or if `/portafolio/` has child pages.

## References

- Manual: `docs/manual-de-uso/public-site/operar-portafolio.md`; CLI: `docs/manual-de-uso/public-site/operar-portafolio-por-cli.md`
- Architecture: `docs/architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md`
- Decision: `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md`
- Tasks: `TASK-2047` (plugin), `TASK-2048` (templates), `TASK-2049` (migration); cleanup `TASK-2046` (complete)
