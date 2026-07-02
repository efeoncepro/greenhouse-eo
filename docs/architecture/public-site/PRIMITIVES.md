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
| `ComparisonTable` | `canonical/widget` | `semantic-widget` | `eo-elementor-widgets`, widget `greenhouse_comparison_table`; PHP class under `includes/widgets/`; CSS/JS under plugin assets | `/agencia-creativa/` | Functional doc `docs/documentation/public-site/comparison-table-widget.md`; manual `docs/manual-de-uso/public-site/comparison-table-widget.md`; manifest governance family `comparisonTable.v1` | Table semantics, responsive card mode, scoped assets, `theme_schema()` parity, visual desktop/mobile evidence |
| `GrowthFormEmbed` | `canonical/host-adapter` | `host-adapter` | Elementor widget `greenhouse_growth_form` + `<greenhouse-form>` renderer from Greenhouse Growth Forms | AEO `/aeo-2/` conversion and future public lead magnets | `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`; `docs/architecture/growth-public-forms-runtime-contract.md`; `docs/documentation/growth/motor-formularios-publicos.md` | `pnpm public-website:verify-aeo-live-contract` for AEO; proportional API/render/overflow/form gates for new forms |
| `LogoMarquee` | `canonical/widget` | `semantic-widget` | `eo-elementor-widgets`, widget `greenhouse_logo_marquee`; CSS `assets/css/logo-marquee.css` | AEO `/aeo-2/` why proof strip | AEO doc `docs/documentation/public-site/aeo-landing-elementor.md`; landing skill refs | 7 unique logos, 3 identical sets, fades, loop `translate(-33.333%)`, reduced-motion static state, visual phase checks |
| `BrandProofAvatarGroup` | `canonical/pattern` | `landing-pattern` | Current implementation inside `greenhouse_logo_marquee` meta markup + `assets/css/logo-marquee.css` selectors `.gh-aeo-brand-proof*` | AEO `/aeo-2/` under `Marcas que ya confían en nosotros` | This registry + AEO doc. Current visible contract: Berel/Sky/Bresler discs in color, count disc `+90` frosted behind Bresler, DM Sans `::after`, countries `Chile · Colombia · México · Perú` | `pnpm public-website:verify-aeo-why-proof-meta`; desktop/mobile visual review; no visible `marcas`/`4 países`; no page/proof overflow |

## `BrandProofAvatarGroup` Contract

This pattern covers compact social proof rows that combine known client/brand discs with a small aggregate count and market list.

Current AEO contract:

- Root proof row remains visually secondary: subtle translucent pill, low shadow, restrained border.
- Brand discs overlap like a team avatar group. The next disc visually covers the previous one; the count disc sits behind the last brand disc, not detached to the right.
- Count visible text is `+90`, rendered as controlled pseudo text in DM Sans. The hidden DOM text may carry the full accessible label.
- The count is a micro-count, not a KPI. It must not become a large badge, navy fill, dashed box, or protagonist text.
- Visible geography copy is only `Chile · Colombia · México · Perú` with a compact flat globe. Do not restore visible `marcas` or `4 países`.
- Accessible label communicates the fuller meaning, currently `más de 90 marcas acompañadas en Chile, Colombia, México y Perú`.
- Desktop and mobile must be verified from actual screenshots, not only computed font size.

Graduation path:

- If reused outside AEO, extract this pattern into either:
  - a dedicated Elementor widget `greenhouse_brand_proof_group`; or
  - a governed option inside `greenhouse_logo_marquee` when it remains tightly coupled to a marquee.
- Extraction must expose controls or manifest fields for `brands[]`, `countLabel`, `countAccessibleLabel`, `markets[]`, density, and visual variant.
- Keep the same a11y/responsive/reduced-motion checks and add the new widget to this registry.

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
