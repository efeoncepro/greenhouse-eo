# Blog home (/blog/) — operación por agentes

Live since 2026-10-24 (TASK-2050/2051): page 18456 renders the `eo-blog-home` plugin (`[eo_blog_home]`), fed by the
content model of `efeonce-editorial-blocks` 0.2.0 (PDR-029). Three boards (desktop ≥1100, tablet 768–1099, mobile),
canonical site nav (`EO_SITE_NAV_EXCLUDED_PAGES` empty), `eo_content_model_enabled = 1`, cutover snapshot
`_gh_blog_home_v3_before_20261024_081327`. Runtime contract: `docs/architecture/public-site/BLOG_HOME_RUNTIME_V1.md`.

**Archive template (TASK-2055, live 2026-10-24):** the same plugin serves search/category/tag/author views with the
«Archivo del blog» template (`EOBH_Archive`, flag `eo_blog_archive_enabled`, adapter `EO_Archive_Adapter`). CLI:
`archive <0|preview|1>` and `topic-descriptions <file.json>`. Contract `docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md`.
A `deploy home` now also ships `templates/archive.php`, `assets/css/eoba-host.css` and `assets/generated/archive*` (allowlist
extended); pipeline and gates in `scripts/public-website/blog-archive/`.
**Glitch variant (TASK-2056, live 2026-10-24):** `/category/glitch/` (= `/glitch/`) gets the Glitch skin from the same
template (`gl` block of `EO_Archive_Adapter`: wordmark H1, «EDICIÓN #N» from the highest published «Glitch #N» title,
latest Flash, Guttery narrator line, byte edge, row plates, `?formato=edicion|flash|nota`, subscription band with the
real white `inline_pill` + `inline-label-logo`, only when `eo_blog_glitch_form_key` is set). Deploy order: `deploy
content-model` BEFORE `deploy home` (the new template needs `rootCls`); full purge with `archive 1 --apply`. The pill
logo needs Growth Forms renderer 1.3.0 released in Greenhouse; until then the label is text.

## Use the CLI, never ad hoc scripts

`pnpm public-website:blog-home <command>` — manual `docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md`.

- Read (always safe): `status`, `slider`, `post <id|slug>`, `verify [--browser] [--url]`. HTTP verify checks `#eobh`,
  one H1, canonical nav bar, robots `index`, no example data; `--browser` waits for the `#eobh` selector (30 s), never
  the `load` event (site third parties can hold it for minutes), then 8 widths 320–1920 + axe on the three boards.
  Each width bypasses the Kinsta cache, so the site sometimes drops one connection: only a `page.goto` network failure
  is retried (5 s, then 15 s, shown as `… reintento`); a missing `#eobh` or a failed check is never retried.
- Write (plan unless `--apply`; operator's go in production): `pin/unpin`, `format`, `hero`, `resource <json>`,
  `review`, `event <json>`, `retire`, `subscription <key|off> [--surface]`, `flag`, `purge`. Every apply prints `before` (its rollback), reads back, purges
  /blog/ and appends to `scripts/public-website/blog-home/ledger/<YYYY-MM>.jsonl` — commit the ledger.
- Deploy: `deploy home|content-model [--apply]` (exports the live baseline first; content-model toggles the flag
  off → deploy → restore). Page: `page publish|rollback --snapshot <option>` (cutover snapshot
  `_gh_blog_home_v3_before_20261024_081327`).

## Rules that bite

- Slider order: pins → Glitch (newsletter resource, else latest edition/Flash) → guide/tool → diagnostic → recent
  `auto_slide_candidate` posts up to five. A **Novedad** only enters when pinned. WordPress «sticky» is ignored.
- A post without `_eo_hero_image` gets a reading scrim and a two-line dek; slider art goes in via `hero --image`.
- Slider places: the three invitations (Glitch → guide/tool → diagnostic) are reserved and never cut by pins; pins,
  then recent candidates, fill the rest; on screen posts come first, invitations after.
- Author circle: the author's uploaded WordPress profile photo (`get_avatar_url`, One User Avatar;
  `EO_Home_Readers::author_photo`), initials when there is none; any `gravatar.com` URL is dropped. No CLI command:
  the editor uploads it in the WP profile; then `purge --apply`.
- Glitch subscription is real only with a published `inline_pill` Growth Form connected by `subscription <key> --apply`
  (options `eo_blog_glitch_form_key` / `eo_blog_glitch_form_surface`, default surface
  `fhsf-efeonce-blog-subscription`; `pnpm growth:forms:publish-glitch-pill` publishes it). Live form:
  `efeonce-blog-subscription`, key `6bc62588-a4a0-4214-9501-13b0c2948c81`, HubSpot subscription type `535702717`.
  Without one the root carries `data-subscribe="off"` and the home shows no subscription, never a simulated
  «¡Listo!» (that happened for ~40 min right after the cutover). HubSpot subscribes by the act under the notice
  (`consentBy: 'submission'` + the notice hash in the consent snapshot).
- The pill and the bottom subscription are `<greenhouse-form data-dc-keep class="eo-inline-pill eo-inline-pill--glitch">`
  (deviation 13). `data-dc-keep` is load-bearing: without it the slider autoplay morph wipes the rendered form. The host
  reset must keep `:not(greenhouse-form *)` (`build-plugin.cjs` HOST_RESET): an ID-specific `all:revert` reaching inside
  broke the renderer (doubled text, squashed pill). Rule: never style inside an element another script paints.
- Before the renderer (or without JS) the form shows `a.ghf-fallback` in the canvas idle-pill shape plus the
  `.gxs__note` notice holding its place. Width: 480 px in `.gxw`; tablet left-aligned via `--ghf-inline-align` /
  `--ghf-inline-note-align`; full width on mobile; column width at the bottom.
- Try the real pill before connecting it live: `node scripts/public-website/blog-v3/preview/serve.cjs --subscribe <key>`
  (GET-only local proxy `/__ghf/`; no submit possible).
- End-to-end proof needs a human submit: Turnstile rejects the automated browser (no token, no `POST /submit`). Never
  try to bypass it; confirm the contact in HubSpot instead. Rollback: `subscription off --apply`.
- Resources hide after 180 days without `review`. Events never store private meeting links (the CLI refuses them).
- Events with real reservation: never create them by hand. `pnpm events:launch -- --brief <json> [--apply]` publishes the
  Greenhouse form, the HubSpot destination and the WordPress event with its `form_key` in one go; the portada shows the
  event pill (state widths via `:has()`, 236/470/360 px, height 52) only when the event has a live `form_key`. The private
  room link lives only in the form's server-only policy and in the emails. Manual:
  `docs/manual-de-uso/public-site/lanzar-evento-o-webinar.md`. **State 2026-10-24: do not launch real events yet** —
  reservations reach HubSpot, but emails do not send in production until the accepted-status fix
  (`ACCEPTED_SUBMISSION_STATUSES`) is released to the `ops-worker`, and the HubSpot Marketing Events / Teams webinar
  integration is pending design (RESEARCH-013).
- **Events — state and backlog (2026-10-24).** Single source of what is pending:
  [RESEARCH-013 §Backlog canónico](../../../../docs/research/RESEARCH-013-events-webinars-hubspot-teams.md#backlog-canónico-para-cerrar-el-módulo-de-eventos).
  - Sessions are **Teams webinars** (seminario web, Events app), never a normal meeting. Greenhouse owns reservation,
    seat and waitlist; Teams will get the registration by Graph and give each person a private link (target design,
    [annex D](../../../../docs/research/RESEARCH-013-annexes/D-greenhouse-owned-events-discovery.md)). The HubSpot ↔
    Teams connector sees no webinar (ticket #50018204746,
    [annex C](../../../../docs/research/RESEARCH-013-annexes/C-teams-hubspot-sync-diagnosis.md)).
  - Unreleased fixes waiting for the single release: emails `2a971d768`, pill autofill + «¡Listo!» `a5b028461`.
  - Test webinars to cancel or unpublish (operator): «La IA no conoce tu negocio» (24-oct) and «La IA y la busqueda»
    (26-oct). Re-verify end to end with `prueba-e2e-eventos-2026-10-24` (surface `fhsf-efeonce-blog-events`), then
    deprecate it. Only then launch real events.
  - Glitch subscription: verified 2026-10-24; **no welcome email yet** (and it still uses the generic «Marketing
    Information» subscription type) — both in the backlog.
- Template changes are not edits to WordPress: they go through `scripts/public-website/blog-v3/` (bind-canvas →
  make-tablet → build-plugin → equivalence + PHP parity + pixel gate ≤1 %), are committed in the runtime and shipped
  with `deploy home`. Deviations from the canvas are listed in
  `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`.
- A new PHP file reaches PHP-FPM 1–2 min after a deploy.
- Open items (2026-10-24): operator's visual OK on the bottom pill, first real event
  (events section hidden until then; blocked: email fix release + HubSpot Marketing Events redesign, RESEARCH-013; the
  2026-10-24 end-to-end test proved reservations + HubSpot and found the email bug), purge timing measured on Kinsta, trash of review page 252046 pending the
  operator.
