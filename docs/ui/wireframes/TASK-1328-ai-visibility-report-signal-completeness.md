# TASK-1328 — AI Visibility Report Signal Completeness

## Meta

- Status: `draft`
- Owner task: `TASK-1328`
- Product Design asset: `none`
- Intended consumers: public lead-magnet report at `think.efeoncepro.com/brand-visibility/r/[token]`, Greenhouse report artifact model, future email/PDF consumers
- Copy source: `src/lib/copy/growth-ai-visibility-report-artifact.ts` or report-local copy registry in `efeonce-think` until the hub is folded back
- Primitive decision: extend the existing report artifact model and the existing `MaturityLadder`; no new ladder primitive
- UI ready target: `no`

## Brief

- Primary user: commercial prospect or decision maker reading a public AI Visibility diagnostic
- User moment: after receiving a tokenized report link from the grader email or public hub
- Job to be done: understand where the brand is visible, what evidence supports the score, what coverage is missing, and what can be improved without confusing measured data with narrative
- Primary decision signal: "Do answer engines mention me, cite me, place me in the right category, and can they use my site?"
- Non-goals:
  - Do not expose raw prompts, raw provider text, full citation URLs, internal accuracy findings, or provider-level sensitive evidence.
  - Do not invent categories, sentiment, trend, or readiness if the run has no measured data.
  - Do not redesign or rewrite the `MaturityLadder`; only feed it real scores and copy-safe labels.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Hero / score | Keep the approved enterprise hero and ladder context | Existing hero + `MaturityLadder` | `model.score`, `model.levels`, `model.agenticAxisScore` |
| 1 | Method band | Explain what was measured without bloating the report | Compact metadata strip | `model.provenance`, `report.asOf`, provider count |
| 2 | Motor coverage | Show mentions with denominators and status | Enterprise table / compact bars | `model.engineSnapshot.present`, `model.engineSnapshot.resolved` |
| 3 | Source evidence | Show domains that feed answer-engine responses | Ranked domain table + summary KPIs | `model.citationSourceBreakdown` |
| 4 | Category association | Show whether the brand is associated with detected categories | Conditional category chips/table | `model.categoryTaxonomySummary` |
| 5 | Readiness / operability | Replace "En cobertura" when probes exist | Readiness score row / level update | `model.readiness.agentic`, `model.readiness.structural` |
| 6 | Existing analysis | Keep dimensions, radar, recommendations, CTA | Existing sections, refined hierarchy | `model.dimensions`, `model.recommendations`, `model.findings` |
| 7 | Fix-it CTA | Offer deliverables only when generated and enabled | Conditional CTA/card | `/api/public/growth/ai-visibility/report/[token]/fix-it` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aiVisibility.report.engineCoverage.title` | Motor coverage | Cobertura por motor de respuesta | none | Avoid generic "IA" in explanatory copy. |
| `growth.aiVisibility.report.engineCoverage.body` | Motor coverage | Menciones detectadas sobre respuestas evaluables por motor. | `present`, `resolved` | If denominator is zero, mark "sin datos". |
| `growth.aiVisibility.report.sources.title` | Source evidence | Fuentes que sostienen las respuestas | none | Public-safe, domain-level only. |
| `growth.aiVisibility.report.sources.body` | Source evidence | Dominios citados por los motores al responder sobre tu marca y categoria. | `totalCitations`, `uniqueDomains` | Do not show full URLs. |
| `growth.aiVisibility.report.category.title` | Category association | Asociacion con la categoria | none | Render only when status is measured or partial with categories. |
| `growth.aiVisibility.report.category.empty` | Category association | Aun no hay evidencia suficiente para mostrar categorias detectadas. | none | Do not fabricate category copy. |
| `growth.aiVisibility.report.readiness.title` | Readiness / operability | Operabilidad del sitio | none | Maps to agentic readiness, not perception score. |
| `growth.aiVisibility.report.readiness.body` | Readiness / operability | Senales tecnicas que indican si los motores pueden leer, citar o usar el sitio. | none | Keep distinct from visibility score. |
| `growth.aiVisibility.report.fixIt.title` | Fix-it CTA | Kit de mejoras aplicables | none | Only if generated/available. |
| `growth.aiVisibility.report.method.title` | Method band | Muestra del diagnostico | `promptCount`, `providers`, `asOf` | Honest methodology copy. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Evidencia medida | El bloque muestra datos observados en este diagnostico. | none | Default for measured sections. |
| loading | Cargando evidencia | Estamos recuperando los datos del informe. | none | Route SSR should rarely show this. |
| empty | Sin evidencia suficiente | Este diagnostico no trae datos suficientes para este bloque. | none | Used for optional blocks. |
| partial | Informe parcial | Algunos motores no respondieron; mostramos solo lo que se pudo medir. | none | Existing banner remains. |
| error | No pudimos mostrar este bloque | El informe sigue disponible, pero esta senal no pudo cargarse. | none | Avoid raw errors. |
| denied | Informe no disponible | Este enlace no existe o ya no esta disponible. | none | Existing 404/denied behavior. |

## Accessibility Contract

- Heading order: keep one `h1` in hero; each evidence block starts at `h2`, internal card/table headings at `h3`.
- Chart/table alternatives: motor coverage, sources and category blocks must have table/text representation, not only visual bars.
- Aria labels: score gauges and source/domain tables need descriptive labels with measured/partial status.
- Focus notes: no new modal/popover required; any optional info tooltip must be keyboard reachable.
- Color-independent state labels: `Medido`, `Sin datos`, `En cobertura`, `Sin mencion`, `Mencion detectada` remain visible text, not only color.

## Implementation Mapping

- Route / surface: external repo `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- Primitives:
  - Reuse existing `MaturityLadder` from `efeonce-think`; do not rewrite its liquid/microinteraction behavior.
  - Reuse existing report tables/cards where they carry real evidence; avoid card-in-card wrappers.
  - Greenhouse source of truth remains `ReportArtifactModel`.
- Variants / kinds:
  - Motor coverage: dense evidence table with denominators.
  - Sources: ranked domain table, top N bounded, domain-only.
  - Category: conditional table/chips; empty state when `unknown` or `categories.length === 0`.
  - Readiness: compact score/status block wired to measured probes.
- Component candidates:
  - `AiVisibilityReportArtifact` / `ReportArtifactModel` in greenhouse-eo as contract owner.
  - Astro render sections in efeonce-think as dumb renderer of `model`.
- Copy source:
  - Greenhouse reusable copy if model/report artifact owns labels.
  - Local hub copy only for external Astro shell text, synced back later.
- Data reader / command:
  - `GET /api/public/growth/ai-visibility/report/[token]`
  - Optional `GET /api/public/growth/ai-visibility/report/[token]/fix-it`
- API parity:
  - UI reads model fields; Astro must not derive business logic from raw `report` when Greenhouse can project the field.
- Access / capability:
  - Public tokenized report, no session. Fix-it endpoint remains capability/flag governed server-side.
- Runtime consumers:
  - Public web report, email/PDF report artifact, future Greenhouse client report.
- Print/email/PDF considerations:
  - Any added model fields must be safe for print/email consumers, or explicitly web-only.
- GVC markers:
  - `data-capture="report-hero"`
  - `data-capture="report-engine-coverage"`
  - `data-capture="report-source-evidence"`
  - `data-capture="report-category-association"`
  - `data-capture="report-readiness"`
  - `data-capture="report-ladder"`

## GVC Scenario Plan

- Scenario file: add or extend `scripts/frontend/scenarios/ai-visibility-public-report-signal-completeness.*` in the repo that owns GVC for the hub, or capture route directly if external repo remains separate.
- Route: `https://think.efeoncepro.com/brand-visibility/r/<valid-token>` and local preview equivalent.
- Viewports: desktop 1440x1000, laptop 1280x900, mobile 390x844.
- Required steps:
  - Load report.
  - Capture hero/ladder.
  - Scroll through motor coverage, source evidence, category/readiness, score explanation and CTA.
  - Hover/focus optional info controls if present.
- Required captures:
  - Full page.
  - Section clips for all new evidence blocks.
- Required `data-capture` markers: listed in Implementation Mapping.
- Assertions:
  - `scrollWidth <= clientWidth` at desktop and 390px mobile.
  - No section renders invented category/source/readiness data when model fields are empty.
  - Ladder remains visually intact and interactive.
- Scroll-width checks: Playwright measurement, not only fullPage screenshots.
- Accessibility/focus checks: keyboard focus on any info tooltip; table labels announced.
- Reduced-motion evidence: if no new motion, verify existing ladder reduced-motion behavior is not regressed.

## Design Decision Log

- Decision: extend the report evidence model and render conditional enterprise sections instead of adding decorative cards.
- Alternatives considered:
  - Read raw `report` in Astro and derive UI logic there: rejected because Greenhouse owns scoring/model semantics.
  - Split into separate backend and UI tasks: rejected for this task design because the user requested one task and the safe boundary is a single public model contract; slices still execute backend first.
  - Show categories even when `status: unknown`: rejected because it would fabricate confidence.
- Why this pattern:
  - Keeps the hub a renderer, makes the public model richer, and preserves no-leak guarantees.
- Reuse / extend / new primitive:
  - Reuse `MaturityLadder`.
  - Extend `ReportArtifactModel`.
  - Add local report sections only as consumers of model fields.
- Open risks:
  - Existing frozen snapshots may require governed republish/version bump to show readiness.
  - Entity readiness is computed internally but not currently public; needs explicit contract decision.
- Follow-up:
  - If source/category blocks prove reusable across SEO/AEO, promote them into the report artifact design system.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger or linked copy source.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is missing, estimated or not measured.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
