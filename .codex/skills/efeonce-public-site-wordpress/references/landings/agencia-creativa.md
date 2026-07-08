# Landing: Agencia Creativa

## Identity

- URL: `https://efeoncepro.com/agencia-creativa/`
- WordPress `page_id`: `249582`
- Status: publish

## V2 — Elementor Modular Landing

- URL: `https://efeoncepro.com/agencia-creativa-v2/`
- WordPress `page_id`: `251279`
- Status: publish, `index, follow` as of 2026-07-08.
- Operator instruction 2026-07-07: create on a new URL, then redirect `/agencia-creativa/` later; do not mutate the existing canonical page yet. Operator approved indexation and menu exposure on 2026-07-08, but not the legacy redirect.
- Navigation: main menu item `251313`, label `Producción Creativa`, parent `244255` (`Soluciones > Estrategia & Posicionamiento`), object/page `251279`.
- Source of truth: `~/Documents/Creative/Ejecución de task 1350/TASK-1350 Landing Agencia Creativa.dc.html`. Do not use screenshots as the design source; they are iteration artifacts.
- Runtime implementation: `eo-elementor-widgets` v0.11.0, widget `greenhouse_creative_landing_module`, one Elementor widget instance per module (`hero`, `trust`, `problem`, `workflow`, `services`, `ai_engine`, `metrics`, `work`, `cases`, `testimonial`, `ecosystem`, `process`, `cta`, `faq`). No monolithic Elementor HTML widget.
- Header/footer: native Efeonce/Ohio only. The custom header/footer from the source HTML must remain excluded.
- Header dark variant: because the hero/top surface is dark, the first Elementor container (`ghcroot`) must keep `css_classes="gh-creative-elementor-shell clb__dark_section"`. Ohio page meta must also stay aligned with the dark/header-3 reference: `page_header_logo_style=light_variant`, `page_header_menu_style=inherit`, `page_header_menu_style_settings=custom`, and `page_header_menu_text_typo={"color":"rgba(255,255,255,0.75)"}` stored as a JSON string, not a PHP array. If this meta drifts to an array, the first paint/no-JS menu flashes dark until Ohio JS adds `light-typo`; do not solve the header with page CSS or custom header markup.
- Hero rail spacing: keep `.ghc-hero-wrap` top padding at `clamp(140px, 10vw, 184px)` so `[ 01 ] Agencia creativa - Efeonce` and `Design Engineer` sit below the absolute Ohio header across 1440, 2048 and mobile 390.
- Hero statement parity: the approved HTML renders the statement as a flex text child plus a fixed right rail (`<span>Tu equipo dirige...</span><i aria-hidden="true"></i>`). Do not implement the rail as a pseudo-element next to the text; it must sit flush with the pill's right edge.
- Trust logo marquee parity: the trust strip after the hero must reuse the public `greenhouse_logo_marquee` primitive from AEO, not a static four-logo row. The Creative skin is scoped under `.ghc-trust-marquee`: 7 unique logos (`sky`, `anam`, `gobierno-santiago`, `berel`, `carozzi`, `bresler`, `marca-chile`), 3 identical sets, color logos (`filter:none`), compact edge-fade, hover pause, no page overflow, and reduced-motion with no animation/duplicate sets. The left proof group must stay compact: countries pill `Chile · Colombia · México · Perú` with flat globe plus a styled `+90 empresas` chip. Do not restore `120+ empresas`, `4 países`, `80% de renovación` or `HubSpot Solutions Partner` in this strip.
- Services parity: the `[ 04 ] Qué hacemos` marquee must keep navy stroked text and orange `◆` spans from the source HTML. Service cards use `.ghc-rvc` reveal (`translateY(34px) scale(.965)`, `70ms` stagger) and source-like hover (top gradient rail, `translateY(-8px)`, blue border/title, orange icon). Do not replace this with generic reveal/card hover.
- Metrics parity: KPI count-up spans in `[ 06 ] Operación creativa medible` must not wrap while animating. Keep metric spans `white-space: nowrap`; the negative metrics (`-35%`, `-40%`) intentionally use the smaller responsive scale from the 2026-07-07 fix so cards stay same-height and symmetrical.
- Scroll-bound motion parity: the source HTML used view-timeline timing for backlog/process motion. In Elementor runtime, `backlogFill`, `procFill` and `procToken` must be gated by the owning `[data-ghc-reveal].is-in`, not by page load. Before the section enters viewport they should compute `width=0`/`animationName=none`; reduced motion keeps final/static bars and hides the token.
- CTA hover/focus parity: Ohio/global link hover can inject a white `background-image` on anchors. The landing's CTA system must keep page-scoped `body.page-id-251279 .gh-creative a.ghc-btn-primary` and `.ghc-link-underline` overrides for idle/hover/focus/active/reduced-motion so primary CTAs never become white-on-white and secondary links never inherit the theme background image.
- Brand-logo slots: `[ 03 ]` step `02` uses the official Efeonce negative SVG at `assets/img/creative-brand/efeonce-negative.svg`; `[ 09 ]` Greenhouse panel uses the official Greenhouse negative SVG at `assets/img/creative-brand/greenhouse-negative.svg`. Keep these as images, not text labels or CSS-drawn marks.
- SEO live state: Yoast title/metadescription/excerpt/OG/Twitter/focus keyphrase are set; robots are `index, follow`; canonical is `https://efeoncepro.com/agencia-creativa-v2/`; the FAQ module emits a page-scoped JSON-LD `@graph` with `Service` + `FAQPage` and references Yoast's `https://efeoncepro.com/#organization`. V2-only SEO thumbnail: `_thumbnail_id=249740` (`EO_Opengraph_AgenciaCreativa.webp`) so Yoast `primaryImageOfPage`/`thumbnailUrl` use the social image instead of the logo marquee. This is not visible in the page render and must not be copied blindly to the legacy `/agencia-creativa/` featured-hero guardrail below.
- Rollback evidence: Elementor/post meta backups `_gh_backup_before_task1350_creative_v2_20260707T074806Z` and `_gh_backup_before_task1350_creative_v2_20260707T075017Z`; runtime plugin backups `/tmp/greenhouse-eo-creative-landing-widget-20260707T074613Z.tar.gz`, `/tmp/greenhouse-eo-creative-landing-widget-20260707T075151Z.tar.gz`, `/tmp/greenhouse-eo-creative-landing-widget-20260707T075816Z.tar.gz`, `/tmp/greenhouse-eo-creative-landing-widget-20260707T075825Z.tar.gz` and `/tmp/greenhouse-eo-creative-landing-widget-20260707T085003Z.tar.gz`.
- Motion contract: `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`.
- Gutter fix 2026-07-07: page-scoped Elementor custom CSS overrides Ohio's desktop `.e-con-full.e-parent` `left:16px` rule for `.gh-creative-elementor-shell`; backups `_gh_backup_before_task1350_creative_v2_gutter_20260707T080955Z`, `_gh_backup_before_task1350_creative_v2_gutter_20260707T081138Z`, `_gh_backup_before_task1350_creative_v2_gutter_20260707T081255Z`.
- Header rollback/evidence 2026-07-07: `_gh_backup_before_task1350_creative_v2_dark_section_20260707T082312Z` and `_gh_backup_before_task1350_header_typo_meta_20260707T091025Z`; captures `.captures/task1350-header-variant-2026-07-07T08-23-24-152Z/` and `.captures/task1350-header-first-paint-2026-07-07T09-11-03-691Z/` confirm `light-typo`, root dark section, first-paint/no-JS menu `rgba(255,255,255,0.75)` and post-JS menu white.
- Hero offset rollback/evidence 2026-07-07: remote CSS backup `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-hero-offset-20260707T082724Z.css`; capture `.captures/task1350-hero-offset-2026-07-07T08-28-52-018Z/` confirms header→rail gaps `35px` (1440), `45px` (2048), `31px` (390).
- Statement rollback/evidence 2026-07-07: remote backups `creative-landing-before-statement-bar-20260707T083224Z.css` and `class-eo-creative-landing-module-widget-before-statement-bar-20260707T083224Z.php`; capture `.captures/task1350-statement-bar-2026-07-07T08-33-07-290Z/` confirms source-pattern markup and flush-right rail.
- Services/card/logo evidence 2026-07-07: `.captures/task1350-services-marquee-colors-2026-07-07T08-46-12-064Z/`, `.captures/task1350-service-card-motion-2026-07-07T08-45-47-960Z/`, `.captures/task1350-brand-logos-2026-07-07T08-51-39-289Z/`.
- Metrics evidence 2026-07-07: `.captures/task1350-metrics-wrap-2026-07-07T08-59-44-613Z/` confirms `-40%` no longer wraps at desktop 2048/1440/mobile 390.
- Scroll-bound motion evidence 2026-07-07: remote CSS backup `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-scroll-motion-fix-20260707T104605Z.css`; live probe confirms backlog/process animations idle before viewport entry, active after reveal, and static under reduced motion.
- CTA hover/focus evidence 2026-07-07: remote CSS backup `/www/efeoncegroup_752/public/wp-content/plugins/eo-elementor-widgets/assets/css/creative-landing-before-cta-hover-20260707T110557Z.css`; Playwright audit `.captures/task1350-cta-hover-audit-after/` confirms 5 CTA/fallback anchors, `failures=0`, console clean, mobile overflow `0`, and reduced-motion transforms disabled.
- Trust logo marquee evidence 2026-07-07: remote backups `class-eo-creative-landing-module-widget-before-trust-logo-marquee-20260707T112826Z.php`, `creative-landing-before-trust-logo-marquee-20260707T112826Z.css`, and reduced-motion CSS backup `creative-landing-before-trust-logo-marquee-reduced-motion-20260707T113012Z.css`; Playwright audit `.captures/task1350-trust-logo-marquee-2026-07-07T11-31-00Z/` confirms 7-logo sets, animation `gh-logo-marquee-scroll` at `54s`, hover `paused`, `filter=none`, desktop/mobile overflow `0`, and reduced-motion `animationName=none` with duplicate sets hidden.
- Trust proof copy evidence 2026-07-07: remote backups `class-eo-creative-landing-module-widget-before-trust-countries-20260707T114111Z.php`, `creative-landing-before-trust-countries-20260707T114111Z.css`, `class-eo-creative-landing-module-widget-before-trust-90-companies-20260707T114517Z.php`, and `creative-landing-before-trust-90-companies-20260707T114517Z.css`; Playwright audit `.captures/task1350-trust-90-companies-20260707T114517Z/` confirms countries `Chile · Colombia · México · Perú`, visible `+90 empresas`, no old trust/FAQ/schema claims, hover count lift, marquee hover `paused`, desktop/mobile overflow `0`, and reduced-motion duplicate sets hidden.
- Technical SEO evidence 2026-07-07: post meta backup `_gh_backup_before_task1350_creative_v2_seo_20260707T123057Z`; runtime widget backup `/tmp/class-eo-creative-landing-module-widget-before-seo-schema-20260707T123045Z.php`; Kinsta cache purge returned success. Live head/REST verification confirms title `Agencia creativa para equipos de marketing | Efeonce`, metadescription with accents, excerpt with accents, `robots=noindex, follow`, OG/Twitter image `EO_Opengraph_AgenciaCreativa.webp`, Yoast primary image fixed away from `sky-marquee.png`, JSON-LD types `WebPage`, `ImageObject`, `BreadcrumbList`, `WebSite`, `Organization`, `Service`, `FAQPage`, and service `areaServed` Chile/Colombia/México/Perú. Yoast does not print a canonical link while `noindex` is active, but `_yoast_wpseo_canonical` is stored for cutover.
- Navigation/indexation cutover 2026-07-08: operator approved exposing V2 without redirecting legacy `/agencia-creativa/`. Main menu changed `Optimización Continua` to `Visibilidad`; added `Posicionamiento SEO` item `251312` under `Visibilidad`; moved AEO item `250691` under `Visibilidad`; repointed `Diseño & Desarrollo Web` item `242916` to page `250816`; added `Producción Creativa` item `251313` under `Estrategia & Posicionamiento`; V2 noindex was removed and canonical set to `/agencia-creativa-v2/`. Rollback snapshot: WP option `gh_backup_before_public_menu_visibility_creative_v2_20260708T154302Z` and post meta `_gh_backup_before_public_menu_visibility_creative_v2_20260708T154302Z` on post `251279`. Kinsta purge returned success. Verification: public HTML plain and cache-busted shows menu updates; Playwright desktop 1440/mobile 390 found each new/changed item exactly once, `overflowX=0`; V2 head returns `robots=index, follow` and canonical `https://efeoncepro.com/agencia-creativa-v2/`.
- Portfolio media v1 evidence 2026-07-08: the placeholder-like slots in `Motor de producción`, `Trabajo seleccionado`, and `Casos` are now populated with generated premium media. Source package: `ai-generations/2026-07-08_creative-landing-assets/`. Runtime assets live under `assets/img/creative/portfolio/v1/` (8 WebP) and `assets/video/creative/portfolio/v1/` (1 WebM + MP4 fallback + poster). Runtime code adds `get_portfolio_assets()`, `render_image_asset()`, `render_video_asset()`, scoped media cover/overlay CSS, and `[data-ghc-inline-video]` viewport playback with hard reduced-motion pause. Rollback: `/tmp/eo-creative-portfolio-media-v1-before-20260708T062208Z.tar.gz` (pre-change PHP/CSS/JS; portfolio dirs did not exist before this pass). Verification: `tmp/verify-creative-portfolio-media-v1.mjs` against live URL confirms desktop 1440 + mobile 390 `imageCount=8`, `videoCount=1`, WebM selected, video advancing, `scrollWidth==clientWidth`, and reduced-motion `pageMotion=off`, `hasAutoplay=false`, `paused=true`, `currentTime=0`. Captures: `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/creative-portfolio-media-v1/`.
- Selected work guide hotfix 2026-07-08: if real media exists, do not show the placeholder guide geometry over `Trabajo seleccionado` or `Motor de producción`. The 2026-07-08 issue was CSS/DOM drift, not baked assets: live HTML had `.has-media`, but live CSS lacked the media-cover and guide-hiding rules. Hotfix deployed `creative-landing.css` only; no changes to `Casos` covers and no asset regeneration. Rollback backup: `/tmp/eo-creative-guides-hotfix-before-20260708T092550Z.tar.gz`. Verification capture/probe: `/Users/jreye/Documents/efeonce-public-site-runtime/.captures/creative-v2-guides-hotfix/`, desktop 1440 + mobile 390 + reduced-motion with `guideFailures=[]`, video advancing in normal motion, reduced-motion video paused/autoplay false, console clean and `scrollWidth==clientWidth`.
- Verification: Playwright live desktop 1440 + mobile 390 + reduced-motion passed, no console errors, no prototype runtime, `scrollWidth == clientWidth`, native header/footer detected, 14 modules present. Motion audit confirmed source colors `#04263f/#fb7a00/#5145e0/#0375db`, keyframes `fabRise`, `fabBars`, `ghcCursor`, `ghcMarquee`, hover states, CTA hover/focus states and reduced-motion static fallback. Final capture dir after first-paint header fix: `.captures/task1350-creative-v2-2026-07-07T09-11-03-691Z/`; gutter proof screenshots: `.captures/task1350-gutter-final2-desktop-1440.png`, `.captures/task1350-gutter-final2-mobile-390.png`.

## Featured Hero Guardrail

This page uses Ohio headline background type `featured`.

Correct hero/featured attachment:

- `_thumbnail_id=249672`
- File: `EO_Landing-GiroAgencia.webp`
- Purpose: clean hero background

Do not use attachment `249740` (`EO_Opengraph_AgenciaCreativa.webp`) as the hero background; it is for OpenGraph and has baked-in logo/text.

Before any `Document::save()` on this page, snapshot:

- `_thumbnail_id`;
- `get_the_post_thumbnail_url()`;
- `page_header_title_background_type`;
- `page_header_title_background_*`;
- `elementorFrontendConfig.post.featuredImage` after render.

Restore immediately with `set_post_thumbnail()` if drift occurs.

## "Cómo trabajamos" Sticky Module

Section/container:

- Root: `7489ca6`
- Left column: `49d5a98`
- Right sticky block: `97e545e`

Sticky behavior is CSS `position:sticky`, not Elementor Pro Sticky motion effects.

Class `-sticky-block` from Ohio theme `style.css` owns sticky positioning.

`lp-container-offset-left/right` rules are home/front-page-scoped and inert off Home. For this page, the accepted fix is a restrained page-scoped gutter, not full `.page-container` alignment.

Guardrail:

- Do not change Home offset rules.
- Do not align the module to the full page container; the operator rejected that as too much.

## Client Logo Strip

Logo row/grid: `a43cacf`.

If logos distort, prefer page-scoped CSS in `ohio-child/assets/css/global-fixes.css`:

- `width:auto!important`
- `height:auto!important`
- `max-height:54px`
- `max-width:min(100%,170px)`
- `object-fit:contain!important`

Do not mutate page data for logo ratio fixes.

## Comparison Table Widget

The live comparison table uses custom Elementor widget `greenhouse_comparison_table` from plugin `eo-elementor-widgets`.

Widget facts:

- semantic `<table>`;
- `data-gh-schema="comparisonTable.v1"`;
- theme settings mirror `theme_schema()`;
- corner-fold ribbon is the canonical best-option shape;
- motion must respect `prefers-reduced-motion`.

For widget code changes, load `references/custom-elementor-widgets.md`.
