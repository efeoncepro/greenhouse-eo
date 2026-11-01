# Portfolio operation (EO Portfolio, `/portafolio/`)

Load for any work on the public portfolio: loading, editing, publishing or unpublishing a project, the client approval
gate, the plugin `eo-portfolio`, its REST, the services catalog, a plugin deploy, or the migration from Ohio's
`ohio_portfolio` (EPIC-056, PDR-028, TASK-2047/2048/2049).

## State (2026-10-30)

- Plugin `eo-portfolio` **v0.10.8 live since 2026-10-30** (runtime commit `21fe1fd`; runtime and greenhouse-eo
  commits are unpushed). `eo_portfolio_enabled` = `1`; `eo_portfolio_agent_tools` = `0` (Abilities + WebMCP,
  read-only, **off**).
- **16 projects published.** The 15 that were live under Ohio (operator approval 2026-10-29, logo + pieces) minus
  «Fiestas Patrias Perú» (unpublished, 301 to Sky via `redirect-retired-entry.php`), plus Sky Airline «La agencia de
  Sky, campaña tras campaña» (line brand, services `[creative-services]`, five campaigns) and **Berel, color por color**
  (`berel-pitaya-color-del-ano-2026`, revision 6, the first `content-marketing` entry; see «Berel» below). Order in
  `eo_portfolio_order` (Sky first: its spot plays in the lens).
- Every published project declares `links.relatedServices` (applied 2026-10-30).
- 46 Yoast 301 from `/project/*` and old slugs + 12 rechained + one regex `^/?portfolio-category(/.*)?$` → `/portafolio/`;
  the 59 Ohio entries are drafts (none deleted).
- `eo-axis-video` is committed but **not activated nor deployed**; the portfolio uses it only if it becomes active.
- Tests at 0.10.8: `php tests/eo-portfolio.test.php` 596 checks over 9 fixtures; Playground 53 e2e, 33 admin, 97 render.
- **Open:** the site's main nav (another component, PDR-027) still shows the eyebrow «ENGINE · WAVE» (operator to
  decide); 11 meta descriptions still say «Proyecto de Efeonce para X» (operator not yet asked); Cyber WOW AI
  confirmation and Sky start date; deactivate Ohio Portfolio from 2026-11-29 after checking Search Console.

### Version history

| Version | Runtime | What |
|---|---|---|
| 0.8.0 | `c6e1734` | Kinds social / audiovisual / ai-production / seo-content, admin, piece roles, phone/tablet layer, `EOP_Seo`, `EOP_Agents` |
| 0.8.2 | | One row per brand (`EOP_Render::by_brand`) as a campaign index, folded after three (`BRAND_FOLD`) |
| 0.8.3 | `3850c44` | Measure orbit (`measure_svg`), line accent (`LINE_ACCENT`), film strip, three-format hero (`hero_trio`) |
| 0.9.0 | | Campaign explorer (`campaign_explorer`) for two or more chapters |
| 0.9.1 | `7106cc4` | Testimonial as a dark scene (`voice`), «Detrás del trabajo» (`behind`) |
| 0.10.0 | `d27ab72` | Kind `content-marketing` |
| 0.10.1 | `55a2738` | Services link to their landing pages (`links.relatedServices`); content-marketing has no record/steps |
| 0.10.2 | `2997847` | Record as an editorial spread headed «{Cliente} necesitaba {need}» |
| 0.10.3 | `3ea1cec` | Poured-paint hero edge — **withdrawn** by the operator |
| 0.10.4–0.10.5 | `baf8d08` / `d441cb4` | Drips removed entirely («en el diseño aprobado no gotea»); 0.10.5 content shipped inside 0.10.6 |
| 0.10.6 | `194e1e8` | Services catalog = service categories inside the five lines |
| 0.10.7 | `e8111e1` | Campaign rows with their paint match the approved board |
| 0.10.8 | `21fe1fd` | Hover: the swatch row glides as a whole (paint, name, AI badge) — **live** |

## Project kinds

Each kind has its own page sections (`EOP_Kinds`); `pnpm public-website:portfolio -- kinds` prints what each one shows
and what its document needs (it does not list `content-marketing` yet; there is no template for it).

| Kind | Pieces / blocks | What the validator demands |
|---|---|---|
| `campaign` (default) | any role | nothing extra |
| `social` | role `post`: `channel` (instagram, facebook, linkedin, x, tiktok, youtube, threads, pinterest), `placement` (feed, story, reel, carousel, document, post, short, video, pin, thread), `postText`, `postedAt` | `channel` on every `post` |
| `audiovisual` | role `cut`: `version`, `where`, `durationSeconds` (video only, 0.5–7200); role `bts` (shoot photos/videos) | `version` on every `cut`; `consentRef` on every `bts` (**never projected**) |
| `ai-production` | top-level `ai` {`models[]` {`stage`: image, video, voice, music, upscale, compositing, other; `name`}, `teamDid`, `aiDid`, `fictional`}; role `ai`: `aiStage` (anchor, angle, expression, pose, plate, scene, final), `label`, `compareTo` | `ai` block required; `aiStage` on every `ai` piece; `compareTo` must exist (`UNKNOWN_REFERENCE`) |
| `content-marketing` (0.10.0) | top-level `articles[]` (1–6), `production`, `process`; roles `banner` and `post` in the chapters; `chapters[].swatch`; `links.liveWork` | `articles` required (`REQUIRED /articles`); every `articles[].pieces` id must exist (`UNKNOWN_REFERENCE`); does **not** require the `metrics` scope |
| `seo-content` | top-level `search` {`source`, `period`, `highlight`, `kpis`, `series`, `query`, `keywords`, `aeo` (engines chatgpt, gemini, perplexity, ai-overviews, copilot, claude), `contents`}; role `banner` (`size`) | `search` with `source`, `period` and at least one figure; publishing needs `metrics` (`APPROVAL_SCOPE_METRICS`); `series.compare` same length as `values` |

Also `website`, `web-section`, `ugc`, `system`, `other` (roles `web`, `section`, `ugc`; see «Rules» below).

Any kind may carry `specs` (max 10 {`label`, `value`}, the «Ficha técnica»). The «PRODUCIDO CON IA» badge shows on
every `ai-production` project and on any project with a role `ai` piece — there is no field to hide it. In a campaign
project declare AI per campaign with `chapters[].madeWithAi`, never with role `ai` (it would mark the whole entry).
Search figures are projected only with `metrics`; contents only with `pieces`.

### `content-marketing` in detail

- **Schema** (`portfolio-entry.v1`, additive): `articles[]` {`title`, `url` https, `excerpt` = the article's
  published opening text **verbatim**, `published` YYYY-MM, `label`, `swatch` {`name`, `code` — as the client prints
  them on the pieces —, `color` #hex sampled from the piece}, `pieces` = ids of pieces in the chapters};
  `production` {`period` YYYY-MM, `source`, `items` ≤4 {`value` integer string, `label`}}; `process` (3–6 {`title`,
  `body`}); `chapters[].swatch` (#hex); `links.liveWork` {`url`, `label`}; `$defs.color`.
- **Projection:** articles resolve their pieces from the visible chapters; an article without visible pieces is
  dropped. `articles`, `production` and `process` follow `pieces`; `chapters[].swatch` and `links.liveWork` pass
  through. `EOP_Kinds::taken` takes nothing for this kind (the explorer is the archive).
- **Page** (as the approved canvas board «Entrada de marketing de contenidos»): hero = a moving blob of paint holding
  each article's cover (`EOP_Kinds::blob`) with its reel and pin floating; swatch picker «UN COLOR, UN ARTÍCULO»
  (`hero_extra`); the page takes `--eop-paint` (a registered `@property` colour) from the article in view and
  crossfades. **No drips.** Then «Un artículo, todos sus canales»: the article card (URL pill, cover, label·month,
  title, excerpt, «Leer el artículo en {host} ↗») with up to 4 posts in channel frames (official AXIS isotypes, real
  format ratio such as 2:3) and running paint lines; the article's banners. Then the dark «Una fábrica de contenidos,
  no piezas sueltas»: production odometers with their source line and «EL RECORRIDO DE CADA ARTÍCULO» (process) on a
  paint-gradient line. Then the campaign explorer, results, «Detrás del trabajo», closing.
- **No record, no steps** (`EOP_Render::has_record` is false); «Detrás del trabajo» opens with the need sentence.
- **JS:** `[data-eop-art-pick]`, `[data-eop-art-layer]`, `[data-eop-art-panel]`, groups `[data-eop-art-group]` shown by
  the script; only the shown article's videos play (`s.art` gate). Without JS: first article on top, all listed.
- **Admin:** kind «Marketing de contenidos»; carries `articles`, `production`, `process`, chapter
  `period/summary/markets/madeWithAi/swatch`, `links.liveWork` and `testimonial.highlight` on save. Edit through the CLI.
- **Create:** no template — `new <slug> --from <file>` using the shape of the fictional fixture
  `tests/fixtures/portfolio/tinta-contenidos.json` (never to production), or `pull` Berel to read a real document.

## Record, need and voice (every project)

- **Record** («FICHA DEL PROYECTO», 0.10.2): left, the headline «{Cliente} necesitaba {need}.»
  (`EOP_Render::need_line`, lowercases the first letter and adds the period; sticky on desktop); right, the facts as a
  numbered spec sheet with ruled lines that draw in; hover warms a line and draws its accent. Mobile stacks.
- **Write `need` to follow «necesitaba»:** a noun phrase, an infinitive or a «que…» clause, no final period. E.g.
  «Lanzar campañas comerciales en días sin descuidar la marca»; Berel: «Que su blog respondiera lo que la gente busca
  antes de pintar y que cada artículo llegara a todos sus canales».
- **First person plural on the page.** Never «Efeonce hizo…»; authorship lives in JSON-LD `creator`. Remaining
  exception: 11 `seo.description` say «Proyecto de Efeonce para X» — do not change them without the operator.

## «Detrás del trabajo» (`EOP_Render::behind`)

- Credits and `period`; services as links to their **landing pages** from `links.relatedServices` (page slugs;
  `EOP_Render::service_pages` resolves published pages by slug, in order, and silently skips missing ones), shown with
  the page title and an arrow. Without `relatedServices` it keeps plain category labels.
- One market shows as «MERCADO» + name; two or more as «N mercados».
- `links.liveWork` adds «EL TRABAJO PUBLICADO» (↗, new tab).
- After a dark section (voice, results) the block gets top spacing; long service names wrap tight.
- **Every new project must declare `relatedServices`.** Landing slugs in use (2026-10-30): `agencia-creativa`,
  `redes-sociales`, `desarrollo-sitios-web`, `performance-marketing`, `servicio-marketing-de-contenidos`,
  `posicionamiento-seo`. Current mapping: Berel → servicio-marketing-de-contenidos, posicionamiento-seo,
  agencia-creativa; Sky Airline, Beebot, Big House, Gobierno de Santiago, PabellonToGo → agencia-creativa,
  redes-sociales; Flick, Ghamadent → agencia-creativa, redes-sociales, desarrollo-sitios-web; Eusari →
  agencia-creativa, desarrollo-sitios-web, performance-marketing; Motogas → agencia-creativa, redes-sociales,
  performance-marketing; Bresler → desarrollo-sitios-web; DMark, NutriBait → redes-sociales; Fivest, Marca Chile →
  agencia-creativa; SSilva → performance-marketing.

## Services catalog: categories inside the five lines (0.10.6)

The five lines are Brand, Engine, Growth, Voice, Revenue (`line`: brand | engine | growth | voice | revenue; each gives
the graphic-line accent). `services` takes only keys from `schema/services.v1.json`, each with its line:

| Line | Keys (label) |
|---|---|
| brand | `creative-services` (Creative Services), `channel-commerce` (Channel & Commerce) |
| engine | `search-visibility-360`, `web-experience-360`, `product-design-360`, `agent-systems-platforms`, `digital-automation-integrations` |
| voice | `media-distribution` (Media & Distribution) |
| revenue | `revenue-operations-crm` (RevOps & CRM) |
| growth | `measurement-analytics` (Measurement & Analytics) |

- **Products are never services or lines:** Creative Studio, Marketing Studio, Wave, Globe, Reach. Removed keys:
  `wave`, `creative-studio`, `hubspot-as-a-service`, `salesforce`, `factory`. Do not call a product a service in any
  copy either.
- **A stored document with a key no longer in the catalog stops rendering as a portfolio page.** Migrate every entry
  (`pull` → edit → `apply`) **before** removing a key.
- The admin labels each category with its line («Creative Services · Brand»).

## Campaign explorer (`campaign_explorer`, 0.9.0; paint rows 0.10.7–0.10.8)

- Two or more chapters render an explorer; chapters may carry `period`, `markets` (closed list: cl, pe, ar, uy, br, us,
  mx, co, ec, bo, py, es), `summary` (falls back to `note`), `madeWithAi`, `swatch`. Three shown, the rest behind «Ver N
  campañas más»; a market filter with two or more markets.
- **Rows with `chapters[].swatch`:** paint dot + name (clamp 28–40px) + «Producido con IA» on one line; «{period} ·
  {market} · {summary}» on one line; no grey tint on the open row; pieces sit on a rounded wash of the campaign paint
  that spreads from the row and keeps a margin from the number; on hover **the whole name row glides** (paint, name,
  badge) — never the name over the badge. Rows without swatch (Sky) are unchanged.

## Berel, color por color (live, revision 6)

<https://efeoncepro.com/portafolio/berel-pitaya-color-del-ano-2026/> — kind `content-marketing`, line `engine`,
services `[search-visibility-360, creative-services]`, `period` from 2026-05 (account won May 2026).

- Articles (excerpts verbatim from berel.com): Día de Muertos (2-1810D, `#bc6337`, 2026-10,
  `/articulos/colores-de-temporada-para-dia-de-muertos`), Temporada 2027 «Bien y de Buenas» (1-3404D, `#cd8c7b`,
  2026-09, `/articulos/colores-de-temporada-2027`), Subtonos «Ciudadela» (4-1105D, `#7c9a9a`, 2026-08,
  `/articulos/conoce-los-tonos-y-subtonos-que-definiran-tu-estilo`). Hexes are sampled from the pieces: display
  stand-ins, not Berel's official values.
- Chapters: Colores de Temporada 2027 (Sep 2026), Día de Muertos (Oct 2026), Guías de color: subtonos (Aug 2026),
  Pitaya, Color del Año 2026 (behind the fold); all `madeWithAi: true` (operator: plates made with AI, text and graphic
  interventions by the creative team).
- Production Sep 2026: 12 articles / 90 banners and social pieces / 10 reels; source «nuestro registro de entregables
  para Berel».
- Results (operator approved Berel's figures on 2026-10-30; scope `metrics`): measure 17,2 % more clicks to the blog
  articles; +55,8 % article impressions; 180.696 impressions in Google AI features (+11 %); source Google Search
  Console of berel.com, August vs July 2026.
- Credits «Squad Berel»; `liveWork` «Inspiración, el blog de Berel» <https://berel.com/inspiracion>; approval scope
  logo, pieces, metrics.
- Media: 20 images via `upload-portfolio-images.php` (source `onedrive-berel`); 3 reels + posters at
  `gs://efeonce-group-axis-public-media/portfolio/v1/berel-color-por-color/`.
- **Efeonce does not publish for Berel:** we deliver the pieces, another agency publishes them. Never claim we publish.
- Left out: Mesa mexicana (not published on berel.com), Calidez Vibrante (no pieces prepared).

## The only way to change a project

```bash
pnpm public-website:portfolio -- list | pull <slug> | new <slug> --kind <kind> | new <slug> --from <file> | validate <slug> [--remote]
pnpm public-website:portfolio -- preview <slug> | diff <slug> | apply <slug> --message "…" [--dry-run]
pnpm public-website:portfolio -- publish <slug> --message "…" [--dry-run] | unpublish <slug> --message "…"
pnpm public-website:portfolio -- revisions <slug> | log <slug> | restore <slug> <rev> --message "…" | verify [<slug>]
```

- `new --kind` copies a template from `scripts/public-website/portfolio/templates/` (campaign, social, audiovisual,
  ai-production, seo-content; all validate). `validate` lists the remaining `[COMPLETAR…]` markers (and template
  `mediaId` 1); `apply` refuses while any remain. Never publish template text or invented figures.
- Working copies live in `tmp/portfolio/<slug>/` (`live.json`, `working.json`, `preview.json`, `before-r<N>-*.json`).
- `validate` and `preview` run the plugin's own validator and projection locally (no SSH), from the runtime repo.
- Remote steps go `pnpm public-website:wpcli` → `scripts/public-website/portfolio/remote.php` → `wp eo-portfolio`: the
  same save service as the admin. Never write `post_content` or `_eop_*` meta directly, never a parallel PHP script.
- `apply`, `publish`, `unpublish`, `restore` write production: **ask the operator first, each time**.
- **Media:** new images go to the library with `scripts/public-website/eo-portfolio/upload-portfolio-images.php`
  (manifest `{ "source": "<slug-like>", "files": [{ "file", "alt", "title" }] }` + one `--input-file` per image;
  returns `id`/`width`/`height`; idempotent by `_eop_source` = `<source>/<file>`; JPEG/PNG/WebP only). Videos and
  posters go to `gs://efeonce-group-axis-public-media/portfolio/v<N>/<slug>/` with
  `Cache-Control: public, max-age=31536000, immutable` — never to WordPress. A retired entry gets its 301 with
  `redirect-retired-entry.php`.
- Step-by-step manual: `docs/manual-de-uso/public-site/operar-portafolio-por-cli.md`.

## Rules the plugin enforces (do not re-implement, do not work around)

- No publish without `clientApproval` with `ref` (opaque pointer to where the approval is recorded, never a contact's
  name or email), `date` and a non-empty `scope` (`logo`, `pieces`, `metrics`, `testimonial`, `creators`). A published
  project cannot be saved without it (`eop_publish_gate`): unpublish first.
- The scope decides what the public sees; what it does not cover is not served even if loaded.
- Piece `role` (campaign | web | section | ugc | in-situ | diagram | answer | post | cut | bts | ai | banner); absent
  means `campaign`. Each role carries only its fields (`EOP_Validator::ROLE_FIELDS`): `web` → `device`,
  `longCapture`, `liveUrl`; `section` → `sectionName` (required), `position` {from < to, 0–1}, `liveUrl`; `ugc` →
  `creator` {`handle` with @, `platform`, `consentRef`} (required); the others are in «Project kinds».
- A creator's video shows only with `pieces` **and** `creators`; `consentRef` never leaves the projection; a
  `kind: ugc` project cannot publish without `creators`. Only set `creators` when each creator's authorization is
  recorded.
- Every `results[]` has `source`; `percent` is 0–100 without `%`; only a percent enables the measure orbit.
- `testimonial.highlight` must be the client's own words inside the quote (`UNKNOWN_REFERENCE` otherwise); the client
  logo comes from `client.logoMediaId` (negative version) and needs `logo`.
- Every media item has real `width`, `height` and `alt`; images use a Media Library `mediaId`; videos use `src` and
  `poster` under `schema/media-hosts.v1.json` (public AXIS bucket) and `captionsVtt` when they have voice; anything
  else fails with `MEDIA_HOST_NOT_ALLOWED`.
- `services` only from `schema/services.v1.json` (see «Services catalog»).
- Saves are against a base revision: a conflict means someone saved in between → `pull`, reapply, `apply`.
- No rule may depend on a client, campaign or slug name.

## Public pages switch and admin

- `scripts/public-website/eo-portfolio/set-portfolio-switch.php` (input JSON): `enabled` `0` | `preview` | `1`,
  `order`, `tally`, `newToken`. Preview serves only with `?eop_preview=<token>`, noindex, drafts included. Ask the
  operator before each production change.
- `Portafolio` admin menu: list and structured editor over the same `EOP_Store`. It knows every kind and keeps the
  fields it does not edit on save (`EOP_Admin::carry_over`).
- Brand marks: channel logos are the AXIS isotypes compiled into `EOP_Platforms` (Pinterest from Iconify `logos`); UI
  icons are Remix paths in `EOP_Icons`. Never draw a brand mark or icon by hand.

## Deploy the plugin

1. Runtime gates: `php tests/eo-portfolio.test.php` + `tests/playground/run-eo-portfolio.sh`. Bump `Version:` in
   `eo-portfolio.php` and commit in the runtime repo (the package refuses uncommitted changes).
2. **Get the operator's explicit OK for this production deploy.** Each deploy needs its own OK; the permission
   classifier blocks the deploy step otherwise. An OK for a previous version does not carry over.
3. `pnpm -s public-website:export-live-code -- --output tmp/public-site-code-baselines/portfolio` →
   `node scripts/public-website/build-portfolio-plugin-package.cjs tmp/public-site-code-baselines/portfolio` →
   `pnpm -s public-website:wpcli -- --eval-file scripts/public-website/deploy-portfolio-plugin-package.php --input-file tmp/portfolio-plugin-release/package.zip --input-file tmp/portfolio-plugin-release/manifest.json --wp-user 12`
   → `pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/purge-portfolio-cache.php --wp-user 12`.
4. The deploy refuses on live drift or if `/portafolio/` has child pages. A code deploy does **not** purge the page
   cache — always run the purge, then check `?ver=` of `portfolio.js` and that existing entries are unchanged.
5. Rollback: `wp plugin deactivate eo-portfolio` and restore the tar the deploy prints.

## Gotchas learned building it

- **Classifier:** production deploys (and production writes) without the operator's explicit OK are blocked. Ask
  first, per deploy.
- **Unknown service key:** an entry naming a key removed from `services.v1.json` stops rendering. Migrate first.
- **Never call products services** (Creative Studio, Marketing Studio, Wave, Globe, Reach) — not in `services`, not
  in copy, not in «Detrás del trabajo».
- **Drips are rejected:** the approved content-marketing board has no drips. 0.10.3 (poured paint) was withdrawn and
  0.10.4–0.10.5 removed the drips; do not reintroduce poured or dripping paint.
- **Playground review with curl needs a cookie jar** (`curl -c cookies.txt -b cookies.txt …`) to keep the admin
  session; `tests/playground/serve-eo-portfolio.sh` serves on :9400 logged in for the browser.
- Ohio's scroll container stalls `animation-timeline: view()` (use IntersectionObserver); Ohio colours headings
  (inherit inside `#eop`); lazy images inside a sideways-moving clipped track never load; page 247116 hid the footer
  through its Ohio meta (the route reads it as `inherit`); a `<button>` does not inherit the font; an
  IntersectionObserver on an element with `clip-path: inset(100%)` never fires (gate it on a parent); «stuck» must be
  measured against `--eop-stick`, not observed with a root margin.
- Yoast matches the full request URL: verify 410s **without** a cache-busting query (`?nc=` makes it miss).
- WordPress guesses a 404 destination by slug prefix before Yoast's 410; the plugin turns that off under `/project/`
  and `/portafolio/`.
- Ohio entries duplicated from demos inherited the demos' slugs as `_wp_old_slug`; TASK-2046 deleted the 71 rows; the
  store never copies that meta.
- `export-live-code` exports an allowlist of plugin directories; `eo-portfolio` was added on 2026-10-29. Without it the
  deploy refuses with «Live drift» (correctly).

## Design source

Canvas «Portafolio Efeonce — concepto» (<https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm>): artboard
`EntradaContenidos.dc.html` (Berel content-marketing board, no drips); record as an editorial spread in
`EntradaUGC.dc.html` and `EntradaWeb.dc.html` («[Marca] necesitaba …»); «Detrás del trabajo» service links point to
landing pages (no product names).

## References

- Manuals: `docs/manual-de-uso/public-site/operar-portafolio.md`; CLI: `docs/manual-de-uso/public-site/operar-portafolio-por-cli.md`
- Functional doc: `docs/documentation/public-site/portafolio-de-proyectos.md`
- Architecture: `docs/architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md`
- Decision: `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md`
- Tasks: `TASK-2047` (plugin), `TASK-2048` (templates), `TASK-2049` (migration); cleanup `TASK-2046` (complete)
