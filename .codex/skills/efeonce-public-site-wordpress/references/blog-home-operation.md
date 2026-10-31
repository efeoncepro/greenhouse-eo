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
**Author card + byline (TASK-2057, live 2026-10-24/25; delta 2026-10-24):** `efeonce-editorial-blocks` 0.5.4
(runtime commit `8f19ee0`) adds `EO_Author_Profile` (`includes/content-model/class-eo-author-profile.php`): pure
`build(array)` + `for_user(id)` cached 5 min via `EO_Home_Readers::cached`. `role` = Yoast Premium
`wpseo_user_schema.jobTitle` (fallback usermeta `job_title`, never the bio's first sentence); `bioShort` = usermeta
`eo_author_bio_short` ≤ 180 (WP profile «Ficha de autor del blog → Bio corta»; else first bio sentences); photos from
One User Avatar 96/300, never Gravatar; links = Yoast contacts in `sameAs` order (twitter → x.com), `user_url` only if
not the site; topics = `knowsAbout` that are categories with posts (aliases, max 4). Service accounts
(greenhouse-integration) and authors without posts get no card. The card replaces `ohio_widget_about_author` via
`widget_display_callback` inside `.author-container` of `ohio/single.php`; CSS `includes/content-model/assets/author.css`
only on `is_singular('post')`. Byline: `ohio-child/parts/elements/page_headline.php` → `eo_author_byline()`; falls back to
Ohio's list without the plugin. Schema stays Yoast's; `wpseo_schema_person` only rewrites `worksFor` to the
`#organization` `@id`. Deploy: `deploy content-model` (allowlist now takes `includes/content-model/assets/*.(js|css)`);
the byline ships in the site-nav theme package (allowlist + `parts/elements/page_headline.php`, **no dry-run**). Traps:
the card is a `<section aria-label="Sobre el autor">`, **never `aside`** (site inline CSS `.single-post aside
{display:none}` hides it); after changing photo or job title **rebuild the Yoast author indexable** and purge, or the
author archive keeps the old `og:image` (`ai-generations/2026-10-24_autor-blog/refrescar-yoast-autor.php` via
`pnpm public-website:wpcli -- --eval-file … --wp-user 1`). More traps measured live: (a) Ohio paints every link on
hover — `a:not(.-unlink):hover` (color `#024c8f`, beats `.your-class:hover` on specificity) and `.links-underline
a:not(.button):not(.tag):not(.-undash):hover` (animated `currentColor` background = the «underline») — which turned the
social chips white with an invisible icon; every card link carries Ohio's own classes `-unlink -undash` plus a scoped
hover; (b) Ohio prints its own «N min read» above the title with its own count, so the byline never repeats minutes and
that string is translated through the `gettext_ohio` filter; (c) the blue circle/line that follows the pointer on hover
is Ohio's custom cursor, not the card — do not «fix» it in the card CSS. The replaced widget printed the demo's social
links (`facebook.com/colabrio`); the filter works because `ohio/single.php:56-57` prints it with `the_widget()`, which
honours `widget_display_callback` (print the card, return `false`). Generic host traps:
`runtime-and-discovery.md` §Ohio host traps for own components. Card sizing: 0.5.6 makes it more contained (operator,
2026-10-24: «quedó bastante grande»); design rules in skill `efeonce-graphic-line` → `applications.md` §A19. Before
shipping `content-model` the plugin build requires no uncommitted changes in the runtime, and the turn is coordinated
with the other blog session. Contract: `BLOG_HOME_RUNTIME_V1.md` §9.

## Use the CLI, never ad hoc scripts

`pnpm public-website:blog-home <command>` — manual `docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md`.

- Read (always safe): `status`, `slider`, `post <id|slug>`, `verify [--browser] [--url]`. HTTP verify checks `#eobh`,
  one H1, canonical nav bar, robots `index`, no example data; `--browser` waits for the `#eobh` selector (30 s), never
  the `load` event (site third parties can hold it for minutes), then 8 widths 320–1920 + axe on the three boards.
  Each width bypasses the Kinsta cache, so the site sometimes drops one connection: only a `page.goto` network failure
  is retried (5 s, then 15 s, shown as `… reintento`); a missing `#eobh` or a failed check is never retried.
- Write (plan unless `--apply`; operator's go in production): `pin/unpin`, `format`, `line`, `client`, `reviewed`, `card`, `hero`, `resource <json>`,
  `review`, `event <json>`, `retire`, `subscription <key|off> [--surface]`, `flag`, `purge`. Every apply prints `before` (its rollback), reads back, purges
  /blog/ and appends to `scripts/public-website/blog-home/ledger/<YYYY-MM>.jsonl` — commit the ledger.
- Deploy: `deploy home|content-model [--apply]` (exports the live baseline first; content-model toggles the flag
  off → deploy → restore). Page: `page publish|rollback --snapshot <option>` (cutover snapshot
  `_gh_blog_home_v3_before_20261024_081327`).

## Rules that bite

- Slider order: pins → Glitch (newsletter resource, else latest edition/Flash) → guide/tool → diagnostic → recent
  `auto_slide_candidate` posts up to five. A **Novedad** only enters when pinned. WordPress «sticky» is ignored.
- A post without `_eo_hero_image` gets a reading scrim and a two-line dek; slider art goes in via `hero --image`.
- A new post enters on its own: the slider fills its post places with the newest posts with image that are not
  Glitch/Novedad (`EO_Home_Readers::build_featured`), and the rail takes the 4 newest reads ≥ 12 min or podcast, not
  Glitch/Novedades (`EO_Home_Readers::rail`). So a new Manzanitas post needs, at publish time, its `hero` **and** its
  `card` (without them the slider title and the card text fall over the cover's baked-in text):
  - `hero`: WebP 2:1 2400 × 1200 cropped from the plate, no text; desktop 1440/1920 × 900 `object-fit: cover`,
    `object-position: 100% 50%`, ~10 % parallax overscan; phone 390 shows x 42–100 % in a 390 × 300 band with the
    title below. Visible in every width x 42–96 % · y 7–93 %; face x 68–92 % · y 10–64 % (clear of the title
    x 29–65 % · y 31–61 %, «Siguiente» x 75–92 % · y 68–77 % and the strip from y 86 %). The «Siguiente» 96 × 64
    thumbnail uses the `hero` when it exists.
  - `card`: the plate PNG 2560 × 1440 as is, focus `"84% 30%"` (shows x 49–91 % of the plate, 57–89 % on the phone);
    face x 60–86 % · y 10–40 %, below the chip/arrow (y 5–8 %) and above the gradient (from y 36 %, solid under 70 %,
    title from y 64 %). A post under 12 minutes does not enter the rail and skips it.
  Full set (plate, cover, hero, card, body) and diagrams: `docs/operations/public-site-content-factory/BLOG_ARTICLE_IMAGE_INVENTORY_V1.md`.
  - **El foco depende del sujeto, no es fijo (2026-10-26, pilar 248398).** `84% 30%` sirve para una cara a la
    derecha; con otro sujeto, recalcúlalo: ventana visible = ancho de la tarjeta / ancho de la imagen escalada, y
    `left = foco × (1 − ventana)`. Elige el foco que deja al sujeto dentro de la ventana en escritorio y en el
    teléfono (en 248398 quedó `--focus "71% 50%"`). El recorte del `hero` se elige igual: en 248398 dejó al sujeto
    en x 71–90 %, a la derecha del título. Portada (destacada + OG) con `blog-post-cover-apply.php`
    (`expectedThumb` / `expectedOg`), hero con `hero <id> --image … --alt … --apply` y tarjeta con
    `card <id> --image … --alt … --focus … --apply`.
  - Un post **refrescado** no reentra al slider si su fecha no cambió: confírmalo con `slider` después de
    republicar, en vez de esperar que aparezca.
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
- «Para leer con calma» v2 (deviation 14, live 2026-10-24): one card template for every format in
  `scripts/public-website/blog-v3/lib/rail-v2.cjs` (template, `rc-*` CSS, fixture, hover), applied by `deviateRail()` in
  `bind-canvas.cjs` to reference and bound template; data from `EO_Home_Adapter::rail()`. Never edit the card in the
  generated plugin files: change the module, rerun bind → fixture → equivalence → build → parity. Webinar ticket = the
  next event until it ends; podcast wave = format `podcast`. One badge per card from a real rule
  (`RAIL_BADGES`); seats/wait/top/trend only through the `eo_home_rail_signals` filter (no reader yet). Client logo:
  `client <post> anam`; «Actualizado»: `reviewed <post> <AAAA-MM-DD>` (the editor's review, never post_modified).
  Photo card crop: portrait 440×600 (tablet 361×492, phone 304×540) at `pos` — a cover with baked-in text (Manzanitas) gets its own card
  image and focal point with `card <post> --image plate.png --alt … --focus "84% 30%"` (`_eo_card_image`,
  `_eo_card_focus`); the featured image stays the OG image. Try it first with `preview/serve.cjs --rail <cards.json>`.
  The hover writes CSS vars on `style`; `dc-runtime.js` keeps them (it rewrites a rendered `style` only when its
  template value changes) — do not revert that or the once-a-second repaint wipes the light and tilt.
- «Explora por tema» v2 (deviation 15, live 2026-10-24): the orbit is the door to the blog's categories, not a share
  metric. Six topics fixed in `EO_Home_Readers::ORBIT` + `EO_Home_Adapter::ORBIT_TOPICS` (name, promise) +
  `ORBIT_SLOTS` (position, arc angle); each label is a server-rendered `<a href>` to `/category/<slug>/`; the centre
  shows the category description, its three newest reads and «Ver todo». Template/logic in
  `scripts/public-website/blog-v3/lib/topics-v2.cjs`, mirrored by `EOBH_View::topics()` (change both together).
  Category descriptions are edited with `topic-descriptions`. After a `content-model` deploy the reader cache (300 s)
  can serve the old topic shape until it expires: poll `/wp-json/eo/v1/home/board/portada` before judging the page.
- Resources hide after 180 days without `review`. Events never store private meeting links (the CLI refuses them).
- Events with real reservation: never create them by hand. `pnpm events:launch -- --brief <json> [--apply]` publishes the
  Greenhouse form, the HubSpot destination and the WordPress event with its `form_key` in one go; the portada shows the
  event pill (state widths via `:has()`, 236/470/360 px, height 52) only when the event has a live `form_key`. The private
  room link lives only in the form's server-only policy and in the emails. Manual:
  `docs/manual-de-uso/public-site/lanzar-evento-o-webinar.md`. **Create Teams webinars from the Teams Calendar (New → Webinar), never from the Events app: HubSpot's connector only discovers calendar-created webinars (verified 2026-10-26, RESEARCH-013 annex C).** **State 2026-10-24: do not launch real events yet** —
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
  2026-10-24 end-to-end test proved reservations + HubSpot and found the email bug), purge timing measured on Kinsta. Review page 252046 trashed 2026-10-26 (operator's OK; 404).
