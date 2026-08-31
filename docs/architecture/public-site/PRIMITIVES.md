# Public Site Primitives Registry

> Runtime: `https://efeoncepro.com` on WordPress/Kinsta + Ohio + Elementor.
> Runtime repo: `/Users/jreye/Documents/efeonce-public-site-runtime`.
> This registry is the public-site counterpart to `docs/architecture/ui-platform/PRIMITIVES.md`; it does not govern the private Greenhouse app primitives.

## Purpose

Public-site primitives are reusable modules for Efeonce public pages and landings. They may be Elementor widgets, host adapters for Greenhouse-owned renderers, or approved landing patterns that have not yet graduated into their own widget.

The goal is to avoid one-off CSS/HTML drift on high-value public surfaces while respecting the actual runtime: WordPress, Ohio, Elementor, Kinsta cache, and the governed runtime plugin rail.

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
| `ContentMarketingLandingModules` | `candidate/widget` (deployed) | `semantic-widget` | `eo-elementor-widgets`, trece `greenhouse_content_*`; captura como host Growth Forms | `/servicio-marketing-de-contenidos/` (`242603`) | [Contrato técnico](CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md); `contentMarketingModule.v1`; contenido y estados derivados del export aprobado, controles nativos, SSR y mejoras de interacción | [Corte 2026-08-31](../../audits/public-site/2026-08-31-content-marketing-publication.md): cuatro viewports, tabs/teclado/form sin envío; contraste, editor integral y conversión/GA4 pendientes; no graduado a primitive transversal |
| `ComparisonTable` | `canonical/widget` | `semantic-widget` | `eo-elementor-widgets`, widget `greenhouse_comparison_table`; PHP class under `includes/widgets/`; CSS/JS under plugin assets | `/agencia-creativa/` | Functional doc `docs/documentation/public-site/comparison-table-widget.md`; manual `docs/manual-de-uso/public-site/comparison-table-widget.md`; manifest governance family `comparisonTable.v1` | Table semantics, responsive card mode, scoped assets, `theme_schema()` parity, visual desktop/mobile evidence |
| `GrowthFormEmbed` | `canonical/host-adapter` | `host-adapter` | Elementor widget `greenhouse_growth_form` + `<greenhouse-form>` renderer from Greenhouse Growth Forms | AEO `/aeo-2/` conversion and future public lead magnets | `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`; `docs/architecture/growth-public-forms-runtime-contract.md`; `docs/documentation/growth/motor-formularios-publicos.md` | `pnpm public-website:verify-aeo-live-contract` for AEO; proportional API/render/overflow/form gates for new forms |
| `GrowthFormEditorialBriefHost` | `candidate/landing-pattern` | `landing-pattern` | Elementor page-scoped host + canonical `GrowthFormEmbed`; renderer remains Growth Forms | `/servicios/agencia-de-influencers/` | `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`; `docs/tasks/complete/TASK-1598-landing-influencer-marketing-creators-ugc.md` | One paper surface; renderer-owned controls/state; desktop/390/open-select/focus/reduced-motion/overflow and empty-submit negative proof |
| `HubSpotMeetingEmbed` | `legacy/host-adapter` | `host-adapter` | `eo-elementor-widgets`, currently inside `greenhouse_social_cta`; PHP/CSS/JS in Social Landing widget | `/servicios/redes-sociales/` final conversion card only; not a fallback or recovery path for native scheduler surfaces | PDR `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`; completed spike `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md`; landing ref `efeonce-public-site-wordpress/references/landings/redes-sociales.md` | Preserve the existing legacy surface until its own governed migration. Do not introduce the embed/link into `<efeonce-meeting-scheduler>`, `open_meeting_scheduler` or any native recovery state. |
| `NativeMeetingSchedulerHost` | `canonical/host-adapter` | `host-adapter` | Greenhouse bundles `<efeonce-meeting-scheduler>` + Growth CTA `open_meeting_scheduler`; Elementor owns host placement only | Isolated pilot `/agenda/` (`251583`, `noindex`); Contacto/RRSS not promoted | Architecture `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`; functional contract `docs/documentation/growth/scheduler-reuniones-nativo.md`; manual `docs/manual-de-uso/growth/configurar-cta-scheduler-nativo.md` | HubSpot is an invisible server-side provider. Recovery is native through month navigation/`Reintentar`; rollback uses flags, binding or version/backups. Live 2026-07-21: August 31-day grid preserved with zero slots, zero HubSpot links/copy and zero overflow. |
| `CreativeLandingModule` | `candidate/widget` | `semantic-widget` | `eo-elementor-widgets` v0.11.0, widget `greenhouse_creative_landing_module`; PHP `class-eo-creative-landing-module-widget.php`; CSS/JS `creative-landing.*` | Candidate `/agencia-creativa-v2/` (`postId=251279`, `noindex` until cutover) | PDR `docs/public-site/decisions/PDR-004-landing-agencia-creativa-posicionamiento.md`; task `docs/tasks/to-do/TASK-1350-landing-agencia-creativa.md`; motion contract `docs/ui/motion/TASK-1350-landing-agencia-creativa-motion.md`; landing refs in both public-site skills | 14 Elementor widget instances, no HTML widget, native Ohio header/footer, source HTML fidelity, FAQ schema, desktop/mobile/reduced-motion Playwright, source colors/keyframes/hover computed-style audit, `scrollWidth == clientWidth` |
| `Glitch` | `canonical/block` | `semantic-widget` | Plugin `efeonce-editorial-blocks` (runtime repo `wp-content/plugins/efeonce-editorial-blocks/`), block `efeoncepro/glitch-drop`, build-less, dynamic `render.php`; **deployed + active on efeoncepro.com (WP 7.0)** | Weekly blog series `Glitch de la semana` on `efeoncepro.com/blog` | Functional/technical contract `docs/documentation/public-site/glitch-drop-gutenberg-block.md` (§Implementation as-built); activation runbook `docs/manual-de-uso/public-site/glitch-editorial-block.md`; authoring rules `docs/documentation/public-site/gutenberg-post-authoring-recipes.md` | Live-verified 2026-07-04 via governed WP-CLI: registered, `parse_blocks` recognized (no invalid block), `do_blocks` renders `aside` (aria-label, no `blockquote`), UTF-8 OK, private test post rolled back. Static: php -l, block.json schema, node --check, render harness 10/10. Residual (non-blocking): in-editor UI save/reload + in-Ohio browser capture desktop/390 with CSS applied |
| `LogoMarquee` | `canonical/widget` | `semantic-widget` | `eo-elementor-widgets`, widget `greenhouse_logo_marquee`; CSS `assets/css/logo-marquee.css` | AEO proof strip; Redes Sociales trust; Home trust via shared renderer | AEO doc `docs/documentation/public-site/aeo-landing-elementor.md`; [Home contract](AGENCY_ELEMENTOR_MODULES_V1.md); landing skill refs | Seven-logo strip, identical sets, fades, reduced-motion static state and phase checks; Home delegates rather than maintaining another logo list renderer |
| `BrandProofAvatarGroup` | `canonical/pattern` | `landing-pattern` | `greenhouse_logo_marquee` shared `proofOnly` renderer (`brandProof.v1`, `.gh-brand-proof*`); legacy `.gh-aeo-brand-proof*` remains for AEO/About | Home hero; AEO `/aeo-2/`; About `/about-us-efeonce/` hero `abproof` | Contract below; Home native Media repeater, density/variant/a11y controls; AEO/About legacy contracts unchanged | AEO gate `public-website:verify-aeo-why-proof-meta`; Home [audit](../../audits/public-site/2026-08-30-home-visual-review.md) includes original hover restoration, reduced motion, overflow and untouched legacy consumers |

## `BrandProofAvatarGroup` Contract

This pattern covers compact social proof rows that combine known client/brand discs with a small aggregate count and market list.

Legacy AEO/About visual contract (not a blanket copy rule for every consumer):

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
