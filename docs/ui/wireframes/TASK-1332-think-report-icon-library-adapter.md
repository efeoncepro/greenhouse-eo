# TASK-1332 — Think Report Icon Library Adapter

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1332`
- Product Design asset: `none`
- Intended consumers: `efeonce-think` public AI Visibility report at `/brand-visibility/r/[token]`, future Think lead-magnet report sections
- Copy source: local one-off for Think report captions; no new reusable copy expected
- Primitive decision: `extend` existing Think `ReportIcon` primitive as a compatibility adapter backed by a governed icon library
- UI ready target: `yes`

## Brief

- Primary user: executive, founder, marketer or operator reading a tokenized AI Visibility report.
- User moment: scanning evidence sections where icons help orient categories, metrics, actions and report controls.
- Job to be done: understand the role of each row or control faster, without decoding generic or mismatched glyphs.
- Primary decision signal: the report feels deliberate, trustworthy and product-grade; every icon reinforces the adjacent label instead of competing with it.
- Non-goals:
  - No backend/data contract changes.
  - No scoring, probes, normalizer or `ReportArtifactModel` changes.
  - No semantic derivation in Think.
  - No full visual redesign of the category section or report shell.
  - No icon-only meaning; every glyph must remain paired with visible text or an accessible label.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| Report primitive layer | `ReportIcon` | Stable icon adapter API for report surfaces | `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro` | static icon registry |
| Category perception section | category row leading glyph | Clarify the semantic level: industry, sector, offer category, use case, market, buyer | existing category row markup in `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro` | `model.categoryTaxonomySummary` / mapped fixture |
| Executive metric and evidence sections | supporting glyphs | Preserve current visual rhythm for signal, engines, citation, readiness, source map and action cards | same `ReportIcon` API | `model.viewFacts` + public model |
| Floating/share controls | action glyphs | Keep share/copy/link/download controls visually familiar and accessible | same `ReportIcon` API or direct library icon only inside adapter | existing report URLs/actions |
| Primitive docs | catalog row | Document the library-backed adapter, governance rules and icon mapping | `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md` | task decision log |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `think.report.icons.primitive.description` | primitive docs | `Set de iconos gobernado para informes Think. El componente mantiene la API ReportIcon y resuelve glyphs desde una libreria externa verificada.` | none | Documentation only; Spanish accents acceptable if the file already uses them. |
| `think.report.icons.accessibility.rule` | primitive docs | `Usar label solo cuando el icono comunique significado propio; en filas con texto visible debe quedar decorativo.` | none | Preserve current a11y contract. |
| `think.report.category.level.*` | category rows | Existing level labels: `Industria`, `Sector competitivo`, `Categoria de oferta`, `Caso de uso`, `Mercado`, `Comprador asociado` | level | Do not add new user-facing copy unless category content requires it. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | N/A | Icons render through the library adapter with current labels intact. | N/A | Default state. |
| loading | N/A | Static SSR icons; no loading state. | N/A | Avoid JS dependency for first paint. |
| empty | N/A | Empty category state keeps lens cards; icons may appear only if they clarify lens names. | N/A | No fake category data. |
| partial | N/A | If a semantic icon is missing, use an approved fallback such as `signal`/`category` and document the mapping. | N/A | No broken SVG. |
| error | N/A | Build should fail on missing icon names; runtime should not throw for unknown user data. | N/A | Prefer typed registry. |
| denied | N/A | Public token access behavior unchanged. | N/A | Not an access task. |

## Accessibility Contract

- Heading order is unchanged; icon migration must not introduce extra headings.
- Icons that accompany visible row text remain `aria-hidden="true"` and `focusable="false"`.
- Icon-only buttons or controls keep `aria-label`/`title` through the existing `label` prop or button label.
- Icons cannot be the only indicator of category level, severity, action or status.
- Stroke/color inherits `currentColor`; status must also be expressed by text, number, chip or label.
- Keyboard/focus behavior of share/download/copy controls remains unchanged.

## Implementation Mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- Primitives:
  - `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro`
  - `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md`
- Variants / kinds:
  - Keep the current `name` union as the public API: `signal`, `engines`, `citation`, `readiness`, `sample`, `calendar`, `sourceMap`, `domain`, `dependency`, `read`, `validate`, `act`, `category`, `target`, `market`, `buyer`, `priority`, `share`, `copy`, `link`, `download`.
  - Map domain-specific category levels to existing semantic names in the report page, not to raw backend strings.
- Component candidates:
  - Preferred adapter: library-backed `ReportIcon` using Lucide-compatible icons after verifying Astro SSR, license and bundle behavior.
  - Fallback adapter: retain inline SVG only for any glyph not available or not semantically acceptable in the chosen library, with explicit TODO in the registry.
- Copy source: no new report copy expected; docs update in Think primitive README.
- Data reader / command: none.
- API parity: no business action introduced; UI remains a renderer.
- Access / capability: public tokenized report only; no entitlement changes.
- Runtime consumers:
  - Category perception rows.
  - Report metric cards and evidence labels.
  - Share/copy/link/download controls.
- Print/email/PDF considerations:
  - SVG output must render in server-side HTML and browser print.
  - Do not depend on client hydration for icon visibility.
- GVC markers:
  - `report-category-association`
  - `report-hero`
  - `report-readiness`
  - `report-source-evidence`
  - `report-share-dock` if present in the page.

## GVC Scenario Plan

- Scenario file: add or reuse a Think-local Playwright verifier under `/Users/jreye/Documents/efeonce-think/scripts/` or `.captures` workflow; no Greenhouse `pnpm fe:capture` scenario is required unless the task is ported into the private portal.
- Route: `http://127.0.0.1:4322/brand-visibility/r/mock-token` with a mapped category fixture, plus one real/old snapshot fixture or token where category is `unknown`.
- Viewports:
  - desktop `1440x1000`
  - laptop `1280x900`
  - mobile `390x844`
- Required steps:
  - Start Think local dev server.
  - Load mapped category mock.
  - Capture category section and full page.
  - Load unknown/empty category state or fixture.
  - Verify report still builds without category icons.
- Required captures:
  - full page desktop/laptop/mobile.
  - category section crop with mapped rows.
  - share dock / action controls crop if icons changed there.
- Required `data-capture` markers:
  - `report-category-association`
  - `report-share-dock` if the dock exists.
  - `report-readiness`
- Assertions:
  - No raw backend labels such as `mid_category`, `service_line`, `adjacent_capability` appear.
  - At least one semantic icon renders per mapped category row.
  - No broken icon placeholder or missing SVG appears.
  - `aria-hidden` remains true for decorative row icons.
  - `scrollWidth === clientWidth` at desktop and mobile 390.
- Scroll-width checks:
  - desktop, laptop and mobile 390.
- Accessibility/focus checks:
  - focus visible on icon-bearing controls.
  - icon-only controls retain labels.
- Reduced-motion evidence:
  - N/A; no new motion introduced.

## Design Decision Log

- Decision: keep `ReportIcon` as the stable primitive API and replace its implementation with a governed external icon library adapter.
- Alternatives considered:
  - Keep adding hand-drawn inline SVGs: rejected because semantic fit and consistency degrade as the report grows.
  - Import library icons directly in report sections: rejected because it creates repeated local mapping and makes future icon swaps harder.
  - Replace all report icons and markup in one redesign: rejected because the current category/report UX is already approved and the debt is icon source/governance.
- Why this pattern:
  - The user identified icon-library connection as a debt after reviewing semantic icons. A wrapper preserves visual contracts while improving icon quality, consistency and maintainability.
- Reuse / extend / new primitive:
  - Extend existing Think `ReportIcon`.
  - Do not create `CategoryIcon`, `ReportGlyph`, `IconPrimitive` or parallel wrappers.
- Open risks:
  - Some library icons may not match the enterprise tone; mapping must be reviewed visually.
  - Astro SSR import shape may differ by package (`lucide-astro` vs `lucide`), so discovery must verify before install.
  - Bundle size can grow if imports are not tree-shaken.
- Follow-up:
  - If Think gains a broader design-system package, move the icon registry into that package and keep `ReportIcon` as a compatibility facade.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger or explicitly unchanged.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives where relevant.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for a Think-local Playwright capture.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
