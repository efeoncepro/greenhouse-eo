# Landing: Performance Marketing

## Identity

- URL: `https://efeoncepro.com/servicios/performance-marketing/` (child of `/servicios/`, `251077`)
- WordPress `page_id`: `251997`, created and published 2026-10-17 (TASK-1865; operator: «Todo junto»).
- Replaces legacy `242862` (`/servicio-gestion-campanas-publicitarias/`): now `private`, Yoast Premium plain 301
  legacy → new (with and without trailing slash; query string kept by Yoast).
- Menu: primary `61`, item `242915` («Performance Marketing & Paid Ads») now points to `251997`; only its
  `_menu_item_object_id` changed (label, parent, order verified unchanged).
- Canvas: Design artifact `https://claude.ai/artifact/PHjnoeTQbcaXEXNUEXK67j` (approved v25); versioned copy
  `docs/ui/sources/TASK-1865/` (+ `blob-map.tsv`, `canvas.json`).

## Body — Performance modules (2026-10-17)

- Source: `scripts/public-website/performance-source/Main.dc.html` (`blob-map.tsv`, `assets.json`, `used-assets.json`,
  `host.css`, `page-custom.css` with `__ID__`, `page.css`, `form.json`, `og/`).
- Compiler: `node scripts/public-website/compile-performance-elementor-source.cjs` → `includes/performance/{schemas,
  templates}` + `assets/css/performance-landing.css`. Platform tabs (`data-gh-tabs`), self-diagnosis orbit
  (`data-gh-quiz*`), mobile dock moved inside the hero, form replaced by a host card with `<gh-growth-form>`, FAQ
  repeater (first open). Do not hand-edit generated files.
- Runtime: 10 widgets `greenhouse_performance_{hero,confianza,problema,solucion,plataformas,creatividad,
  autodiagnostico,recibes,condiciones,diagnostico}`, base `class-eo-performance-landing-base.php` (registers its own
  assets via `eo_performance_register_assets()`), JS `performance-landing.js` (tabs + orbit). Loader: one widget
  entry + `require_once performance/seo.php`.
- Mobile dock: `.mbar` uses `scroll(root)` + view-timeline `--form` hoisted with `timeline-scope` on `body`
  (`page.css`). A hidden browser pane reports stale `opacity:0`; force a frame or take a screenshot before calling it
  broken.
- Form: Growth Form `efeonce-performance-diagnostic`, key `71ea684f-1ad9-4656-982b-159e4de46dd8`, surface
  `fhsf-efeonce-performance-diagnostic`, `hubspot_pillar`/`multi_step_light`, HubSpot `direct` to «Lead Gen - Performance
  Marketing» (registry row in `scripts/growth/hubspot-destinations.registry.ts`). Live: 26 inputs render.
  Pending: first real browser submission (Turnstile), GA4 `generate_lead` check.
- SEO (`configure-performance-seo.php`, snapshot `_gh_performance_seo_before_20261017_181342`): title «Agencia de
  performance marketing y publicidad digital | Efeonce», focus keyphrase «agencia de performance marketing» (Semrush
  2026-10-17), OG «Performance marketing optimizado por ventas, no por clics | Efeonce», image attachment `252002`
  (1200×630 PNG, source `performance-source/og/og.html`). `diagnostico` emits Service `#service` + FAQPage `#faq` (6);
  `includes/performance/seo.php` adds `about → #service` to Yoast's WebPage only while that widget is on the page.
- Ohio: 164 `page_*` metas copied from `249582` (`fix-performance-ohio-layout.php`, snapshot
  `_gh_performance_ohio_layout_before_20261017_181400`); sidebar `without`.
- Release rail: `build-performance-elementor-package.cjs <live baseline>` → `deploy-performance-elementor-package.php`
  (contract `performance-elementor-release.v1`) → `publish-performance-elementor-page.php` (creates only) →
  `fix-performance-ohio-layout.php` → `configure-performance-seo.php` → `migrate-performance-legacy.php`. The
  wpcli wrapper forwards only files: page ids go through a file (`tmp/performance-page-id.txt`). To change the body
  later, write a hash-guarded republisher.
- Rollback: page `251997` to draft; Yoast redirect `servicio-gestion-campanas-publicitarias` deleted and the 3
  repointed chains restored, `242862` to publish, `242915` object id back to `242862` (snapshot
  `_gh_performance_migration_before_20261017_181625`); plugin backup `/tmp/eo-performance-widgets-before-20261017-181240.tar`
  on Kinsta (temporary).
- Verification 2026-10-17: 1440 and 390 with `scrollWidth==innerWidth`, 10 modules ready, one `h1`, canonical,
  `index, follow`, OG/Twitter, Service + FAQPage, page sitemap lists the new URL and not the legacy, 301 tested (slash,
  no slash, `?utm_`), Home menu links to the new URL, sibling landings 200 after deploy. Not yet: Rich Results/GSC,
  real submission.
