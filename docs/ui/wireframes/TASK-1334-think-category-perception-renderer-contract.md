# TASK-1334 — Think Category Perception Renderer Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1334`
- Product Design asset: `none`
- Intended consumers: `efeonce-think` public AI Visibility report at `/brand-visibility/r/[token]`
- Copy source: local one-off in Think report, constrained to backend-provided category facts
- Primitive decision: `reuse` existing report section and Think primitives; no new backend-derived semantics in the renderer
- UI ready target: `yes`

## Brief

- Primary user: executive, marketer, founder or operator reading a public AI Visibility diagnostic.
- User moment: reaching section `06 · Categoria percibida` after the report has explained operability/readiness.
- Job to be done: understand how AI engines frame the brand's category when Greenhouse provides category facts, and see an honest state when it does not.
- Primary decision signal: the section feels clear and professional whether the backend returns `mapped`, `needs_review`, `unknown`, old snapshots or partial counts.
- Non-goals:
  - No backend changes.
  - No local category inference in Think.
  - No fake rows for production tokens.
  - No raw backend labels.
  - No visual redesign outside the category section.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| Section header | Eyebrow + title + intro | Name the section and explain category framing in user language | existing report markup | `model.categoryTaxonomySummary.status` |
| Summary panel | Primary interpretation | Show the dominant mapped category only when the backend provides mapped data | existing category summary block | `categoryTaxonomySummary.categories[0]`, `totalSignals` |
| Signal rows | Category evidence list | Render canonical categories with labels, level names, helper text, counts and share | repeated row component or local fragment | `categoryTaxonomySummary.categories[]` |
| Empty/coverage state | Honest fallback | Explain what Greenhouse looked for when no mapped category exists | existing coverage state | `status='unknown'`, empty categories |
| Review state | Caution state | Tell the reader signals exist but require review without exposing internals | local state branch | `status='needs_review'`, `ambiguousCount`, `unmappedCount` |
| Legacy fallback | Old snapshot compatibility | Avoid crashes when field is missing or older shape exists | defensive parser/normalizer | payload from `modelVersion < 1.1.0` or partial fixtures |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `think.report.category.header.eyebrow` | header | `06 · CATEGORIA PERCIBIDA` | section number may shift only if report ordering changes | Existing copy can be improved for accents in implementation. |
| `think.report.category.header.title` | header | `Que entiende la IA sobre tu categoria` | none | Avoid "motores" if it makes the section too technical. |
| `think.report.category.header.body` | header | Explain that category framing affects searches, comparisons and expected proof. | none | Must not mention internal taxonomy mechanics. |
| `think.report.category.mapped.primary.helper` | summary | Explain dominant territory from backend facts. | category label, total signals | No overclaim: "tiende a encuadrar", not "define". |
| `think.report.category.empty.title` | empty | Honest state when Greenhouse has no mapped category. | none | Do not shame the brand or expose "señales canónicas". |
| `think.report.category.review.title` | review | Signals exist, but the reading needs review. | ambiguous/unmapped counts if useful | Avoid raw technical labels. |
| `think.report.category.row.helper.*` | rows | Human helper per level: industry, sector, product/service category, use case, market, buyer. | category level | Keep mapped from canonical level, not raw backend strings. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| mapped | `La IA te ubica principalmente en este territorio` | Explain influence on search/comparison/proof. | none | Show rows and counts. |
| needs_review | `Hay señales de categoria, pero no son concluyentes` | Explain that the report will not force a category when evidence conflicts. | none | No internal "ambiguous" copy unless translated. |
| unknown | `Todavia no hay categoria suficiente para afirmar una lectura` | Explain lenses inspected: industria/sector, oferta/caso de uso, mercado/comprador. | none | Current empty state should remain polished. |
| partial/legacy | `Categoria no disponible en este snapshot` | Explain older report or insufficient evidence. | none | Prevent crash/blank. |
| error | N/A | Section omitted or safe fallback; no raw error. | none | Public report must continue. |
| mobile | Same copy, shorter layout | Rows stack cleanly. | none | No horizontal scroll. |

## Accessibility Contract

- Section uses a real heading in the existing report hierarchy.
- Category rows remain readable without color or icon.
- Counts and percentages must have text equivalents.
- Decorative icons stay `aria-hidden`.
- No table-like row should require horizontal scrolling on mobile 390px.
- The section must not become an interactive trap; if no controls exist, no new focus targets.

## Implementation Mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- Primitives:
  - existing section markup in the report page
  - `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro`
- Variants / kinds:
  - `mapped`: summary + category rows.
  - `needs_review`: honest review state.
  - `unknown`: coverage/empty state.
  - `legacy`: missing/partial contract fallback.
- Component candidates:
  - optional local helper function to normalize `categoryTaxonomySummary` for rendering only.
  - optional row fragment/function for repeated category rows.
- Copy source: local Think report copy.
- Data reader / command: `GET /api/public/growth/ai-visibility/report/[token]` server-side fetch; no command.
- API parity: N/A; read-only renderer of Greenhouse contract.
- Access / capability: public tokenized report only.
- Runtime consumers: Think report page; no private Greenhouse UI.
- Print/email/PDF considerations: section should remain printable from HTML if user prints page; Greenhouse PDF remains separate.
- GVC markers:
  - `report-category-association`
  - optional `report-category-empty`
  - optional `report-category-review`

## GVC Scenario Plan

- Scenario file: Think-local Playwright/verifier under `/Users/jreye/Documents/efeonce-think/scripts/` or equivalent capture script.
- Route:
  - mapped fixture/token: `http://127.0.0.1:4322/brand-visibility/r/mock-token` or a local API fixture with real Greenhouse shape.
  - unknown fixture/token with `categoryTaxonomySummary.status='unknown'`.
  - legacy fixture with missing/partial field if feasible.
- Viewports:
  - `1440x1000`
  - `1280x900`
  - `390x844`
- Required steps:
  - Load mapped state, capture section and full page.
  - Load unknown state, capture section and full page.
  - Load needs_review/partial fixture if backend can provide or local fixture can mimic the exact schema.
  - Assert no raw backend labels.
- Required captures:
  - mapped section crop.
  - unknown/coverage state crop.
  - mobile mapped section crop.
- Required `data-capture` markers:
  - `report-category-association`.
  - `report-category-empty` if added.
  - `report-category-review` if added.
- Assertions:
  - section appears for mapped data.
  - section does not fabricate rows for unknown data.
  - raw labels such as `mid_category`, `service_line`, `adjacent_capability`, `product_or_service`, `canonical signals` do not appear.
  - no horizontal overflow desktop/mobile.
  - counts/shares are bounded and do not show `NaN`.
- Scroll-width checks:
  - desktop/laptop/mobile 390.
- Accessibility/focus checks:
  - decorative icons hidden.
  - no unlabeled interactive controls.
- Reduced-motion evidence:
  - no new motion expected.

## Design Decision Log

- Decision: treat category perception as a renderer contract over Greenhouse data, not a local Think derivation.
- Alternatives considered:
  - Merge with TASK-1333: rejected because Greenhouse data production and Think rendering should stay split by execution profile.
  - Keep only backend task: rejected because the user explicitly needs the visible report to render the current backend contract well.
  - Mock category rows in Think until backend catches up: rejected for production; allowed only as local fixture with exact backend shape.
- Why this pattern:
  - Think already owns presentation. Greenhouse owns facts. This task hardens the boundary between both.
- Reuse / extend / new primitive:
  - Reuse existing report page and `ReportIcon`; no new primitive unless repeated rows justify a tiny local extraction.
- Open risks:
  - Backend may still return `unknown` for real tokens until TASK-1333 completes.
  - Local fixtures can drift if not based on exact Greenhouse payload shape.
  - Section copy may over-explain the taxonomy if not kept user-facing.
- Follow-up:
  - Once TASK-1333 produces a real mapped token, run production smoke on Think with that token.

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
