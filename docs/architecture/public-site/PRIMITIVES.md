# Public Site Primitives Registry

> Runtime: `https://efeoncepro.com` on WordPress/Kinsta + Ohio + Elementor.
> Runtime repo: `/Users/jreye/Documents/efeonce-public-site-runtime`.
> This registry is the public-site counterpart to `docs/architecture/ui-platform/PRIMITIVES.md`; it does not govern the private Greenhouse app primitives.

## Candidato local: BlogSection — 20/10/2026

`greenhouse_blog_section` en `eo-elementor-widgets`, sólo en develop y sin desplegar.
SSR con lecturas WordPress, selector nativo de sección, assets scoped y host Growth Forms existente.
No reemplaza primitivas compartidas. [Contrato técnico y gates pendientes](../../../scripts/public-website/blog-phase1/README.md).

## Purpose

Public-site primitives are reusable modules for Efeonce public pages and landings. They may be Elementor widgets, host adapters for Greenhouse-owned renderers, or approved landing patterns that have not yet graduated into their own widget.

The goal is to avoid one-off CSS/HTML drift on high-value public surfaces while respecting the actual runtime: WordPress, Ohio, Elementor, Kinsta cache, and the governed runtime plugin rail.

**Doctrine — mechanisms, not looks ([PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md), operator, 2026-10-18).**
Every landing derives its design pattern from its own need (audience, funnel stage, offer, available proof, what the
visitor must decide). The primitives in this registry are mechanisms that a landing may adopt and skin for its own
design; they are not a house style. A landing's composition (section order, hero, color, typography, component skins)
belongs to that landing and is never promoted to a primitive just because it exists or was approved. No landing,
including Inbound or Performance, is a template for another. When a landing introduces something reusable, register
the mechanism (contract, overrides, a11y, gates), not the look it shipped with.

## Boundary

Private Greenhouse UI primitives live in:

- `src/components/greenhouse/primitives/**`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Public-site primitives live in one of these places:

- Elementor widgets in `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`
- host adapters in the same runtime plugin or child theme that mount Greenhouse-owned renderers
- page-scoped landing patterns documented here until reuse justifies extraction into a widget

Do not copy private Greenhouse primitives directly into WordPress. Use their design intent as reference, then implement a public-site contract appropriate for Elementor/Ohio.

## Primitive Kinds

| Kind | Use when | Runtime shape |
| --- | --- | --- |
| `semantic-widget` | The module owns visible public markup, layout, a11y, responsive behavior, styles, and optional microinteractions. | Elementor widget class + scoped assets in `eo-elementor-widgets`. |
| `host-adapter` | WordPress is only the shell and a Greenhouse-owned renderer owns fields, validation, state, copy, and destination policy. | Elementor widget/host markup + external governed renderer. |
| `landing-pattern` | A high-value page pattern is approved for reuse but still lives inside one landing/widget stylesheet. | Documented selector contract + graduation criteria. |
| `asset-system` | Reusable logos, marks, icons, or brand assets need governed sizing, alt/aria, source, and fallback rules. | Runtime assets + docs source + widget/pattern contract. |

## Governance Rules

- Reuse this registry before creating local Elementor HTML/CSS for a repeated pattern.
- Promote a one-off to a public-site primitive when it is reused, appears on a high-value landing, carries proof/trust, includes non-trivial responsive/a11y/motion, or keeps breaking under Ohio/Elementor CSS.
- Prefer `eo-elementor-widgets` for public landing widgets. Do not create one plugin per primitive.
- Scope CSS under a stable `gh-*` root marker. Avoid bare utility selectors and parent-theme overrides.
- Declare the accessibility contract: semantic element, accessible name, hidden/decorative assets, aria labels, focus behavior if interactive.
- Declare responsive behavior and verify mobile 390px with no page overflow.
- Guard motion with `prefers-reduced-motion`.
- If the primitive is agent-editable, declare schema/manifest parity and stable data markers.
- For live changes, deploy through the governed public-site runtime rail, purge Kinsta, and keep rollback evidence.

## Registry

| Primitive | Status | Kind | Runtime owner | Public surfaces | Contract / docs | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `AgencyLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, 17 `greenhouse_agency_*` widgets, 414 root fields and six repeaters at the 2026-08-30 checkpoint | Home `/` (`251731`, index eligible); previous Home `2791` retained noindex | [Technical contract](AGENCY_ELEMENTOR_MODULES_V1.md); `agencyModule.v1`; shared proof, continuous work rails, optional service links, compact Cases CTA, native showreel dialog | PHP/Elementor registration + JS lifecycle + Browser 1280/890/390 evidence in [audit](../../audits/public-site/2026-08-30-home-visual-review.md); in-editor save/reload and complete cross-origin-player keyboard traversal pending |
| `CreativaLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, 15 `greenhouse_creativa_*` widgets compiled from `scripts/public-website/creativa-source/Main.dc.html`; 188 editable-field checks | `/agencia-creativa/` (`249582`, index eligible); `/agencia-creativa-v2/` (`251279`) untouched satellite | [Technical contract](AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md); `creativaModule.v1`; release `creativa-elementor-release.v1`; Growth Form host card | `php tests/creativa-modules.test.php` + live 1440/390, tabs, reduced motion and one-`h1` checks in [audit](../../audits/public-site/2026-10-15-agencia-creativa-elementor-rollout.md); in-editor save/reload and first real form submission pending |
| `PerformanceLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, 10 `greenhouse_performance_*` widgets (`hero`, `confianza`, `problema`, `solucion`, `plataformas`, `creatividad`, `autodiagnostico`, `recibes`, `condiciones`, `diagnostico`) compiled from `scripts/public-website/performance-source/Main.dc.html` by `compile-performance-elementor-source.cjs`; base `class-eo-performance-landing-base.php` (registers its own assets), `includes/performance/seo.php`, JS `performance-landing.js` (tabs + orbit); one repeater (FAQ) | `/servicios/performance-marketing/` (`251997`, child of `251077`, index eligible since 2026-10-17); replaces legacy `242862` (now `private`, plain 301) | [Functional doc](../../documentation/public-site/performance-marketing.md); [manual](../../manual-de-uso/public-site/operar-performance-marketing.md); release `performance-elementor-release.v1`; Growth Form host card `efeonce-performance-diagnostic` ([runtime contract](../growth-public-forms-runtime-contract.md#diagnóstico-de-pauta-performance-marketing)); `diagnostico` emits Service `#service` + FAQPage `#faq`; rail cloned from Agencia de Medios (shared core not extracted); since 2026-10-17 the compiler core (`scripts/public-website/lib/source-led-compiler.cjs`) and the widget base (`EO_Source_Led_Landing_Base_Widget`) are shared with Medios, gated by `verify-source-led-compilers.cjs` + `verify-source-led-render.php`; body changes via `republish-source-led-page.php` (shared base deployed 2026-10-17, live module HTML identical) | Live 2026-10-17: 1440/390 without horizontal overflow, 10 modules ready, one `h1`, canonical, OG, schema, 26-input form, menu from Home, sibling landings 200. Pending: real form submission + GA4 `generate_lead`, Rich Results/GSC, GVC 1536/890 + reduced motion + keyboard, in-editor save/reload, hash-guarded republisher (publisher only creates) |
| `InboundLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, 11 `greenhouse_inbound_*` widgets (`hero`, `confianza`, `partida`, `vivo`, `cambio`, `rompe`, `metodo`, `ciclo`, `planes`, `reglas`, `diagnostico`) compiled from `scripts/public-website/inbound-source/Main.dc.html` by `compile-inbound-elementor-source.cjs` on the shared source-led core; base `class-eo-inbound-landing-base.php`, `includes/inbound/seo.php`, JS `inbound-landing.js` («Arma tu primer ciclo»: producto, mercado y pregunta a la IA); one repeater (FAQ) | `/agencia-inbound-marketing/` (`242601`, body replaced in place 2026-10-18; URL, menu item `243616` and parent unchanged) | Landing ref `efeonce-public-site-wordpress/references/landings/inbound-marketing.md`; release `inbound-elementor-release.v1`; Growth Form host card `efeonce-inbound-diagnostic`; `diagnostico` emits Service `#service` + FAQPage `#faq`; first consumer of `EfeonceMention` | Live 2026-10-18: 1440/390 without horizontal overflow, 11 modules, one `h1`, canonical, index, OG `252016`, Service + FAQPage, Growth Form rendered, cycle interaction verified. Pending: real form submission + GA4, Rich Results, in-editor save/reload, mobile dock hide-on-form |
| `AgendaLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, 4 `greenhouse_agenda_*` widgets (`hero`, `como`, `preguntas`, `cierre`) compiled from `scripts/public-website/agenda-source/Main.dc.html` by `compile-agenda-elementor-source.cjs` on the shared source-led core (sixth canvas compiler); base `class-eo-agenda-landing-base.php`, JS `agenda-landing.js` (scroll to `#agenda` with focus, respects reduced motion) | `/agenda/` (`251583`, body replaced in place 2026-10-20; indexable since 2026-10-20, out of menus by operator decision) | Landing ref `efeonce-public-site-wordpress/references/landings/agenda.md`; [functional doc](../../documentation/public-site/agenda.md); [manual](../../manual-de-uso/public-site/operar-agenda.md); release `agenda-elementor-release.v1`; the real scheduler is **not** a module: `NativeMeetingSchedulerHost` in its own HTML widget between `hero` and `como` (the core only has the dialog launcher, see «Source-led meeting launcher contract»); SEO through native Yoast fields only | Live 2026-10-20: 1440/375 without horizontal overflow, scheduler loaded with real availability, no console errors, no `meetings.hubspot.com` links; no booking created. Pending: governed inline scheduler in the core (option, not done), AXIS scheduler composition (TASK-2007) |
| `EfeonceMention` | `candidate/pattern` (deployed site-wide; owned by AXIS `efeonce.mention`) | `asset-system` | AXIS `@efeoncepro/axis-ui-primitives` 0.6.9 `./mention.css`; WordPress byte copy `eo-elementor-widgets/assets/css/axis-mention.css`, enqueued site-wide by `includes/eo-mention.php`; Think `src/components/EfeonceMention.astro` | Inbound `/agencia-inbound-marketing/` (10 service links); available to any landing, post or page | Contract below («`EfeonceMention` Contract») | Live 2026-10-18 on Inbound: stylesheet enqueued, pill + isotype painted, hover tilt; reduced motion stops the tilt. Live on Think (`f603060`, Vercel production Ready): `https://think.efeoncepro.com/preview/mention` 200, 3 mentions, noindex, no overflow, `astro check` 0 errors; published `mention.css` sha256 identical to the WordPress copy. Pending: Gutenberg format «Mención de servicio» and Content Factory spec field |
| `SourceLedMeetingLauncher` | `candidate/pattern` (deployed) | `host-adapter` | `eo-elementor-widgets`, shared base `includes/widgets/class-eo-source-led-landing-base.php` (`meeting_launcher()`); compiler option `meeting: { modules, cta, location, fallbackUrl, fallbackLabel }` in `scripts/public-website/lib/source-led-compiler.cjs` adds `meeting_cta`, `meeting_surface`, `meeting_embed_key`, `meeting_location`, `meeting_fallback_url`, `meeting_fallback_label` to the listed modules; renders Greenhouse's `<greenhouse-cta>` (Growth CTA `open_meeting_scheduler`) | First consumer: Inbound `/agencia-inbound-marketing/` (`242601`), CTA `inbound-discovery-meeting`, three placements `inbound_closing`, `inbound_hero`, `inbound_mobile_dock`; available to any source-led landing | Contract below («Source-led meeting launcher contract»); [Inbound manual](../../manual-de-uso/public-site/operar-inbound-marketing.md#rotar-el-key-del-botón-de-reunión); [native scheduler CTA](../../manual-de-uso/growth/configurar-cta-scheduler-nativo.md) | Live 2026-10-18 on Inbound: three launchers in the HTML, hero and dock open the native dialog, `Escape` closes and focus returns, dock opens full screen at 390; Medios and Performance render fingerprints unchanged after the base change. Pending: first real booking |
| `ContentMarketingLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, trece `greenhouse_content_*`; captura como host Growth Forms | `/servicio-marketing-de-contenidos/` (`242603`) | [Contrato técnico](CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md); `contentMarketingModule.v1`; contenido y estados derivados del export aprobado, controles nativos, SSR y mejoras de interacción | [Corte 2026-08-31](../../audits/public-site/2026-08-31-content-marketing-publication.md): cuatro viewports, tabs/teclado/form sin envío; contraste, editor integral y conversión/GA4 pendientes; no graduado a primitive transversal |
| `ComparisonTable` | `canonical/widget` | `semantic-widget` | `eo-elementor-widgets`, widget `greenhouse_comparison_table`; PHP class under `includes/widgets/`; CSS/JS under plugin assets | No live surface since 2026-10-15 (the `/agencia-creativa/` body that used it was replaced by `CreativaLandingModules`; verified 0 occurrences in the served HTML) | Functional doc `docs/documentation/public-site/comparison-table-widget.md`; manual `docs/manual-de-uso/public-site/comparison-table-widget.md`; manifest governance family `comparisonTable.v1` | Table semantics, responsive card mode, scoped assets, `theme_schema()` parity, visual desktop/mobile evidence |
| `GrowthFormEmbed` | `canonical/host-adapter` | `host-adapter` | Elementor widget `greenhouse_growth_form` + `<greenhouse-form>` renderer from Greenhouse Growth Forms | AEO `/aeo-2/` conversion and future public lead magnets | `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`; `docs/architecture/growth-public-forms-runtime-contract.md`; `docs/documentation/growth/motor-formularios-publicos.md` | `pnpm public-website:verify-aeo-live-contract` for AEO; proportional API/render/overflow/form gates for new forms |
| `GrowthFormEditorialBriefHost` | `candidate/landing-pattern` | `landing-pattern` | Elementor page-scoped host + canonical `GrowthFormEmbed`; renderer remains Growth Forms | `/servicios/agencia-de-influencers/` | `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`; `docs/tasks/complete/TASK-1598-landing-influencer-marketing-creators-ugc.md` | One paper surface; renderer-owned controls/state; desktop/390/open-select/focus/reduced-motion/overflow and empty-submit negative proof |
| `HubSpotMeetingEmbed` | `legacy/host-adapter` | `host-adapter` | `eo-elementor-widgets`, currently inside `greenhouse_social_cta`; PHP/CSS/JS in Social Landing widget | `/servicios/redes-sociales/` final conversion card only; not a fallback or recovery path for native scheduler surfaces | PDR `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`; completed spike `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md`; landing ref `efeonce-public-site-wordpress/references/landings/redes-sociales.md` | Preserve the existing legacy surface until its own governed migration. Do not introduce the embed/link into `<efeonce-meeting-scheduler>`, `open_meeting_scheduler` or any native recovery state. |
| `NativeMeetingSchedulerHost` | `canonical/host-adapter` | `host-adapter` | Greenhouse bundles `<efeonce-meeting-scheduler>` + Growth CTA `open_meeting_scheduler`; Elementor owns host placement only | `/agenda/` (`251583`): isolated pilot host since 2026-07-21. **Delta 2026-10-20:** the same adapter, unchanged in behaviour (`placement="agenda_pilot"`), now sits in its own HTML widget inside the redesigned, indexable Agenda landing (`AgendaLandingModules`); Contacto/RRSS not promoted | Architecture `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`; functional contract `docs/documentation/growth/scheduler-reuniones-nativo.md`; manual `docs/manual-de-uso/growth/configurar-cta-scheduler-nativo.md` | HubSpot is an invisible server-side provider. Recovery is native through month navigation/`Reintentar`; rollback uses flags, binding or version/backups. Live 2026-07-21: August 31-day grid preserved with zero slots, zero HubSpot links/copy and zero overflow. |
| `CreativeLandingModule` | `candidate/widget` | `semantic-widget` | `eo-elementor-widgets` v0.11.0, widget `greenhouse_creative_landing_module`; PHP `class-eo-creative-landing-module-widget.php`; CSS/JS `creative-landing.*` | `/agencia-creativa-v2/` (`postId=251279`), `index, follow` since 2026-07-08; satellite targeting «producción creativa a escala» since 2026-10-15 (no redirect) | PDR `docs/public-site/decisions/PDR-004-landing-agencia-creativa-posicionamiento.md`; task `docs/tasks/to-do/TASK-1350-landing-agencia-creativa.md`; motion contract `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`; landing refs in both public-site skills | 14 Elementor widget instances, no HTML widget, native Ohio header/footer, source HTML fidelity, FAQ schema, desktop/mobile/reduced-motion Playwright, source colors/keyframes/hover computed-style audit, `scrollWidth == clientWidth` |
| `Glitch` | `canonical/block` | `semantic-widget` | Plugin `efeonce-editorial-blocks` (runtime repo `wp-content/plugins/efeonce-editorial-blocks/`), block `efeoncepro/glitch-drop`, build-less, dynamic `render.php`; **deployed + active on efeoncepro.com (WP 7.0)** | Weekly blog series `Glitch de la semana` on `efeoncepro.com/blog` | Functional/technical contract `docs/documentation/public-site/glitch-drop-gutenberg-block.md` (§Implementation as-built); activation runbook `docs/manual-de-uso/public-site/glitch-editorial-block.md`; authoring rules `docs/documentation/public-site/gutenberg-post-authoring-recipes.md` | Live-verified 2026-07-04 via governed WP-CLI: registered, `parse_blocks` recognized (no invalid block), `do_blocks` renders `aside` (aria-label, no `blockquote`), UTF-8 OK, private test post rolled back. Static: php -l, block.json schema, node --check, render harness 10/10. Residual (non-blocking): in-editor UI save/reload + in-Ohio browser capture desktop/390 with CSS applied |
| `LogoMarquee` | `canonical/widget` | `semantic-widget` | `eo-elementor-widgets`, widget `greenhouse_logo_marquee`; CSS `assets/css/logo-marquee.css` | AEO proof strip; Redes Sociales trust; Home trust via shared renderer | AEO doc `docs/documentation/public-site/aeo-landing-elementor.md`; [Home contract](AGENCY_ELEMENTOR_MODULES_V1.md); landing skill refs | Seven-logo strip, identical sets, fades, reduced-motion static state and phase checks; Home delegates rather than maintaining another logo list renderer |
| `BrandProofAvatarGroup` | `canonical/pattern` | `landing-pattern` | `greenhouse_logo_marquee` shared `proofOnly` renderer (`brandProof.v1`, `.gh-brand-proof*`); legacy `.gh-aeo-brand-proof*` remains for AEO/About | Home hero; AEO `/aeo-2/`; About `/about-us-efeonce/` hero `abproof` | Contract below; Home native Media repeater, density/variant/a11y controls; AEO/About legacy contracts unchanged | AEO gate `public-website:verify-aeo-why-proof-meta`; Home [audit](../../audits/public-site/2026-08-30-home-visual-review.md) includes original hover restoration, reduced motion, overflow and untouched legacy consumers |
| `PublicUtilityRecoverySurface` | `proposed/pattern` | `landing-pattern` | Future `ohio-child` shared partial; parent Ohio remains fallback until a scoped implementation is approved | 404 first; reusable recovery shell for no-results and empty archive states without forcing identical content | [Technical contract](PUBLIC_MISCELLANEOUS_SURFACES_V1.md); [functional behavior](../../documentation/public-site/public-miscellaneous-surfaces.md); [discovery evidence](../../audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md) | Implementation must prove HTTP/robots/canonical, `<main>` + heading hierarchy, keyboard/focus/reduced motion, 1440/390 overflow, empty query safety, cache readback, snapshot and rollback; no runtime implementation exists yet |
| `SiteNav` | `candidate/pattern` — **publicado en AXIS v0.7.7 (TASK-2040, 2026-10-22): `axis-ui-contracts` 0.7.7, `axis-ui-primitives` 0.7.0, `axis-tokens` 0.6.8**; owned by AXIS `efeonce.site-nav` | `host-adapter` | AXIS: tokens `axisSiteNav`, contract `efeonce.site-nav` + schema `site-nav.v1` (`site-nav.v1.schema.json`), `@efeoncepro/axis-ui-primitives/site-nav` (`siteNavHtml`), `./site-nav.css`, `./site-nav.js` (`enhanceSiteNav`, no imports); reference fixture `packages/primitives/fixtures/site-nav/agencia-creativa.html` for the PHP port. WordPress plugin «EO Navegación» (TASK-2041) as data source; adapter in `ohio-child` behind `eo_site_nav_enabled` off/pilot/on with Ohio fallback (TASK-2042) | None in a site yet: the global header is still Ohio's (menu term `61`). AXIS Lab `/patterns/efeonce.site-nav/` + `/demos/site-nav/<contexto>-<cabecera>/` | Contract below («`SiteNav` Contract»); [architecture](PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) §Implementación en AXIS; [PDR-027](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md); [EPIC-055](../../epics/in-progress/EPIC-055-public-site-global-navigation.md); AXIS `docs/quality/site-nav.md` | Lab 2026-10-22: Playwright suite green (8 viewports, keyboard, one panel, focus trap, no disc from top and island, reduced motion, island tone, contrast ≥ 4.5:1 on navy/black/glow, axe, touch, no-JS). Published as v0.7.7 with private install verified (render identical to the fixture). Pending: plugin (TASK-2041, slices 1–3 local), site pilot (TASK-2042) |
| `LandingDock` | `candidate/pattern` — construido en AXIS (TASK-2043, 2026-10-23), **sin publicar**; owned by AXIS `efeonce.landing-dock` | `host-adapter` | AXIS: tokens `axisLandingDock` (vidrio de `axisSiteNav.island`), contract `efeonce.landing-dock` + schema `landing-dock.v1`, `@efeoncepro/axis-ui-primitives/landing-dock` (`landingDockHtml`), `./landing-dock.css`, `./landing-dock.js` (`enhanceLandingDock`, no imports); reference cases `packages/primitives/fixtures/landing-dock/cases.json` for the PHP port. WordPress plugin `eo-landing-dock` (meta `_eo_landing_dock` per page, `wp eo-dock`) operated with `pnpm public-website:landing-dock` | None live yet: each of the seven landings keeps its own dock until `on`. AXIS Lab `/patterns/efeonce.landing-dock/` + `/demos/landing-dock/<variante>/` | [architecture](PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) §Dock inferior de las landings; [TASK-2043](../../tasks/in-progress/TASK-2043-landing-dock-glass-primitive.md); AXIS `docs/quality/landing-dock.md` | Lab: 25 browser tests green (canvas measures 1440/390, visibility, tone, cookies by overlap, hostile host sheet, axe, no-JS). Site: PHP parity 10/10, Playground on/off end to end, live preview on the seven landings without writes. Pending: fidelity approval, AXIS release, plugin deploy, per-landing `on` |

## `EfeonceMention` Contract

Inline link to an Efeonce service or product, with the Efeonce isotype in front and a pill in the accent of the service
line. Approved by the operator on 2026-10-18 on Inbound (pill + isotype, tilt on hover; the underline-only variant was
rejected) and promoted the same day to **AXIS** so every host paints the same mark: contract `efeonce.mention`
(candidate), tokens `axisMention`, primitive `@efeoncepro/axis-ui-primitives` ≥ `0.6.9` (`mentionHtml`, `./mention.css`,
React `<Mention>`; AXIS `docs/quality/mention.md`, Lab `/patterns/efeonce.mention/`). The WordPress copy is a byte copy of
the package CSS; never fork it.

- Markup: `<a class="axis-mention" href="…" data-line="<line>" data-surface="light|dark">texto del servicio</a>`; lines
  `growth`, `brand`, `engine`, `voice`, `revenue-hubspot`, `revenue-salesforce`. Without `data-*` it paints Growth on
  light. The isotype is a decorative CSS mask, so screen readers and search engines read only the link text. Never put
  the isotype in the markup or the anchor text.
- Destinations: only Efeonce — a root-relative path of the site or https on `efeoncepro.com` / `efeonce.org` and their
  subdomains. AXIS's `resolveMention` rejects anything else; on WordPress (hand-written markup) the same rule is an
  authoring rule. Not for in-page anchors, external links, mail/phone or CTAs (CTAs keep their buttons).
- Color follows the line the page or section speaks for. Inbound uses `revenue-hubspot` on dark (the approved magenta).
  A host that needs another color sets `--axis-mention-accent`, `-tint`, `-tint-hover` and `-ink` on the anchor; never
  fork the stylesheet.
- `white-space: nowrap` keeps the isotype with its text; keep mention texts short (2–4 words) and use few per section.
- Specificity is `a.axis-mention.axis-mention` on purpose: landing host layers reset `a::before` and Ohio paints a hover
  underline gradient.
- WordPress: `includes/eo-mention.php` enqueues `assets/css/axis-mention.css` on every frontend page, the Elementor
  preview and the block editor (no JS). The file header records the package version and the sha256 of the original;
  to update, copy the new `dist/mention.css` from the published package and ship it in a scoped release. The local
  `eo-mention.css` and `efeonce-isotype.svg` were retired on 2026-10-18 (Inbound was the only consumer).
- Source-led landings: write the AXIS markup in the canvas; the compiler keeps it in the template. Do not copy the CSS.
- Think: `src/components/EfeonceMention.astro` (thin wrapper over `mentionHtml` + `mention.css`); noindex preview
  `https://think.efeoncepro.com/preview/mention` (no trailing slash; with it, 308). Live since commit `f603060` (Vercel
  production Ready): 200, 3 mentions, no overflow at 1440, `astro check` 0 errors. The published primitives 0.6.9
  `mention.css` has the same sha256 as the WordPress byte copy.
- A loader change can take ~1–2 min to show on web requests (PHP-FPM opcache) even though WP-CLI already sees it.

## `SiteNav` Contract

**Construido en AXIS (TASK-2040, 2026-10-22), sin publicar.** El encabezado global del sitio sigue siendo el de Ohio
hasta TASK-2042; el plugin del documento es TASK-2041. Exports, decisiones del Lab y verificación:
[arquitectura §Implementación en AXIS](PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) y `docs/quality/site-nav.md` en AXIS. Contrato técnico completo:
[PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md](PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md). Decisión:
[PDR-027](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md) (Accepted 2026-10-18). Programa:
[EPIC-055](../../epics/in-progress/EPIC-055-public-site-global-navigation.md).

- **Qué es:** el mecanismo portable de la navegación global del sitio (cabecera con cápsula de vidrio, mega menús
  Soluciones y Recursos, desplegable Nosotros y onepage de la hamburguesa). Se escribe una vez en AXIS y cada sitio lo
  monta con un adaptador delgado, sin reescribir comportamiento ni contenido. Mismo precedente que `EfeonceMention`.
- **Capas** (contrato `efeonce.site-nav` + esquema `site-nav.v1`, primitive en
  `@efeoncepro/axis-ui-primitives`, Lab `/patterns/efeonce.site-nav/`):
  - render HTML de servidor como función pura a partir de un documento `site-nav.v1` válido;
  - `site-nav.css` con tokens AXIS, incluida la receta de vidrio;
  - `site-nav.js` liviano, de mejora progresiva y sin framework (el sitio público no admite React): intención de hover,
    teclado, foco, scroll, onepage y movimiento reducido. No pide datos a la red ni conoce el agendador; sólo expone el
    hueco del CTA.
- **Consumidores previstos:**
  - WordPress: el plugin «EO Navegación» (TASK-2041) guarda el documento único y el adaptador de `ohio-child`
    (TASK-2042) lo pinta con el interruptor `eo_site_nav_enabled` (`off`/`pilot`/`on`) y respaldo a Ohio;
  - Think: envoltura Astro, como follow-up cuando se pida.
- **Contrato con el host** (cualquier sitio, WordPress y Think incluidos; desde AXIS primitives 0.7.8, publicado bajo `v0.7.8` el 2026-10-22, TASK-2042; «Estás aquí» desde el enlace del servicio en contracts y primitives 0.7.9, bajo `v0.7.9`, 2026-10-23):
  - El host **no estiliza dentro de `.axis-site-nav`**. Si una medida difiere del Lab, se corrige en AXIS
    (`packages/primitives/src/site-nav-css.ts`), nunca con CSS del sitio.
  - Las únicas entradas del host son dos variables: `--axis-site-nav-offset` (una barra encima de la página, como la
    del admin de WordPress) y `--axis-site-nav-z` (apilamiento).
  - El menú se aísla solo: cada regla lleva peso de id (`:not(#axis-site-nav-isolation)`) y la raíz devuelve a sus
    valores por defecto lo que un tema aplica a todos los elementos: tipo heredado, enlaces y su hover, botones,
    listas, `li`, alineación de imágenes y corte de palabras. No agrega valores de diseño. Una prueba de navegador de
    AXIS inyecta una hoja hostil copiada de Ohio y exige estilos, medidas y posiciones idénticas.
  - El host sí carga las fuentes: Bricolage Grotesque (opsz, wght 200–800; el menú no usa el eje de ancho) y
    Poppins 300–700.
- **Receta de vidrio** (aprobada el 2026-10-18; una sola para cápsula, botón «Agenda tu diagnóstico» y hamburguesa; en
  AXIS vive en `axisSiteNav.glass`, nunca valores a mano en el sitio):

  ```css
  background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.03));
  backdrop-filter: blur(20px) saturate(160%) brightness(.54);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(255,255,255,.03), 0 8px 24px rgba(0,8,20,.24);
  ```

  El botón usa relleno `.12→.04`, borde `.18` y canto `.34`.
- **Contraste medido como referencia** (texto blanco sobre el vidrio, peor píxel, 2026-10-18):

  | Fondo | Cápsula | Botón |
  |---|---|---|
  | Navy | 15,8 | 14,6 |
  | Negro | 18,3 | 17,0 |
  | Navy con resplandor | 12,8 | 12,2 |
  | Foto con cara | 8,2 | 13,5 |
  | Foto con indicador ámbar | 6,5 | 4,3 (promedio 6,1) |

  El caso de la foto clara con indicador ámbar queda como control de QA de cada foto nueva.

## Source-led meeting launcher contract

Mechanism of the shared source-led base that lets a compiled landing open the native meeting scheduler (Growth CTA
`open_meeting_scheduler`) in place. The look of the launcher buttons and of the dialog is each landing's own design
([PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)); Inbound's skins live in
`inbound-source/host.css` and `inbound-source/page.css` and are not a standard.

- Canvas: write `<gh-meeting-cta></gh-meeting-cta>` (default location) or `<gh-meeting-cta location="x">`. The compiler
  turns them into `%%meeting_launcher%%` / `%%meeting_launcher__x%%`.
- Location override: one CTA and one surface per landing, measured per placement. The default comes from the compiler
  option `location` (`meeting_location`); a tag's `location` overrides it for that placement and reaches telemetry as
  `cta-location`.
- Render: the base emits `<greenhouse-cta cta surface embed-key cta-location locale="es-CL" color-scheme="dark"
  appearance="bare">`. Without CTA slug, surface or key it emits the fallback link `<a class="gh-<landing>-meeting-fallback">`
  to `meeting_fallback_url`. The CTA renderer script is enqueued only for modules that carry `meeting_cta`.
- Key: the embed key is a secret written 0600 by the landing's `scripts/growth/publish-*-meeting-cta.ts` and passed to
  the page publisher as an input file (Inbound: optional 4th input of `publish-inbound-elementor-page.php`, written into
  the modules that carry the launcher). Never print or copy it. Rerunning the CTA publisher rotates the key, so the page
  must be republished in the same step.
- Host notes: `<greenhouse-cta>` contains its inline size, so it needs an explicit width (and so does its wrapper in a
  flex row). The dialog is `<dialog class="ghc-meeting-surface">` appended to `<body>` and opened with `showModal()`; a
  modal dialog has `top:0;bottom:0`, so a skin needs `height: fit-content`. The production bundle has no
  `ghc-meeting-titles` class (target `.ghc-meeting-toolbar>:not(.ghc-meeting-close)`). The renderer locks scroll with
  `html.style.overflow=hidden` and returns focus to the launcher on close.
- Gates: a base change must keep `verify-source-led-compilers.cjs` and `verify-source-led-render.php` green and the
  sibling landings' render unchanged.
- **Delta 2026-10-20 (Agenda) — inline scheduler is outside the core.** The core supports only this dialog launcher.
  `/agenda/` needs the scheduler inline, so its publisher places the existing `NativeMeetingSchedulerHost` adapter
  (`agenda-source/scheduler-host.html`, `<efeonce-meeting-scheduler>` from the public renderer loader) in its own
  Elementor HTML widget between two compiled modules; the landing's `page.css` only frames and themes it. A governed
  inline-scheduler module in the core is a future option, not built.

## `BrandProofAvatarGroup` Contract

This pattern covers compact social proof rows that combine known client/brand discs with a small aggregate count and market list.

Current operating-market copy comes from `EFEONCE_OPERATING_MARKETS` in `src/config/efeonce-brand.ts`:
Chile · Estados Unidos · Colombia · México · Perú (operator confirmed 2026-08-31). This is operating
coverage, not evidence that each historical client count applies to all five markets. Keep the client
claim separate from the market list and its accessible label. WordPress rollout/readback remains pending;
see `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md`.

Legacy AEO/About visual contract below records the previous four-market rendering (not a current coverage
rule or a blanket copy rule for every consumer):

- Root proof row remains visually secondary: subtle translucent pill, low shadow, restrained border.
- Brand discs overlap like a team avatar group. The next disc visually covers the previous one; the count disc sits behind the last brand disc, not detached to the right.
- Count visible text is `+90`, rendered as controlled pseudo text in DM Sans. The hidden DOM text may carry the full accessible label.
- The count is a micro-count, not a KPI. It must not become a large badge, navy fill, dashed box, or protagonist text.
- Visible geography copy is only `Chile · Colombia · México · Perú` with a compact flat globe. Do not restore visible `marcas` or `4 países`.
- Accessible label communicates the fuller meaning, currently `más de 90 marcas acompañadas en Chile, Colombia, México y Perú`.
- Desktop and mobile must be verified from actual screenshots, not only computed font size.
- On dark backgrounds, keep the same structure/a11y but apply a surface-specific
  contrast skin: light/ice logo treatment and a frosted pill. Do not paste the
  light-background visual treatment unchanged onto dark heroes.

Shared opt-in contract (2026-08-30):

- Governed opt-in `EO_Logo_Marquee_Widget::render_marquee(['proofOnly'=>true,...])` delegates
  `render_brand_proof()`. Marker `brandProof.v1`, scoped `.gh-brand-proof*`, same plugin/CSS owner.
- Manifest fields: `brands[]` (name/image.url), `countLabel`, `countAccessibleLabel`, `markets[]`,
  `density` (compact/default), `variant` (light/dark). Home hero exposes a native Media repeater plus
  density/variant/accessibility controls; its existing count and geography copy are preserved separately.
- Home `/` is the first opt-in consumer. AEO/About retain their legacy `.gh-aeo-brand-proof*` markup;
  this extraction does not migrate or alter those pages. Non-opt-in marquee output is unchanged.
- Home preserves its original 6 px elevation/1.08 scale/halo microinteraction with semantic selectors;
  reduced motion disables transform and transition. Discs are non-actionable images, not fake buttons.
- Rollout/rollback and responsive evidence: [Home visual audit](../../audits/public-site/2026-08-30-home-visual-review.md).

## Agency patterns available for reuse

These are owned by `AgencyLandingModules`; they are not independent widgets or an alternative UI platform.
Reuse/extend them through the existing schemas and renderers before adding page-local HTML:

- **Compact destination CTA:** Cases reuses Agenda's navy card/teal action through a scoped modifier.
  One semantic link, editable destination, <=760 px stacked layout. Reusing a visual class requires
  scoping tests and selectors by section so a Cases link is not mistaken for the Agenda action.
- **Optional service-card destination:** native URL repeater field, empty means non-linked article.
  A single heading anchor provides the stretched hit target; preserve external/nofollow and focus states.
  Native URL defaults are arrays, not strings; test against actual Elementor control registration.
- **Click-to-load showreel:** native `<dialog>` in Experience, one instance/page; validated YouTube URL,
  no iframe in initial/editor render, stop/remove on close/unmount, X44×44, fallback link, reduced motion.
  Browser modality does not by itself certify keyboard traversal inside a cross-origin iframe.
- **Continuous artwork rails:** exact measured cycle including gap, enough inert duplicate sets to cover
  viewport plus period, ResizeObserver rebuild and image preparation; zero clones in editor/reduced motion.
  This algorithm belongs to artwork rails, not the separate LogoMarquee implementation.
- **Color-inheriting brand mark:** Media SVG used as alpha mask with instance-scoped ID and `currentColor`;
  CRM HubSpot follows teal/white states without approximation by CSS filters or replacing the official mark.

The [Agency contract](AGENCY_ELEMENTOR_MODULES_V1.md) owns selectors, schema, implementation paths and
verification. Its source-led visual decisions do not authorize global theme changes, invented proof or
copying private Greenhouse components into WordPress.

## Promotion Checklist

Before calling a public-site pattern reusable:

- Runtime owner/path is declared.
- Public surfaces are listed.
- Root selectors/data markers are stable.
- A11y, responsive, and reduced-motion contracts are written.
- Visual evidence exists for desktop and mobile 390px.
- Cache/deploy/rollback path is known.
- Agent-editable settings have a schema or an explicit reason why they are Elementor-only.
- The corresponding skill refs point back to this registry instead of duplicating the full contract.

## Verification Checklist

Use proportional gates, but for visual public-site primitives the minimum closure is:

- Browser screenshot review on desktop and mobile 390px.
- `scrollWidth == clientWidth` or an explicit explanation for intentional contained scrolling.
- Computed-style probes for typography, spacing, and host CSS conflicts when the issue is visual.
- Kinsta cache purge after runtime or Elementor live mutations.
- A rollback reference: runtime backup, Elementor backup key, or both.

## Relationship To Private Greenhouse Primitives

Private primitives can inspire public-site patterns, as happened with TeamAvatarGroup-style proof. They are not imported or governed by this registry unless a specific public-site implementation exists.

When a Figma/AXIS/private primitive pattern is used as reference, document the design intent, then map it into the public-site runtime using scoped CSS, Elementor controls, semantic HTML, and public-site verification.
