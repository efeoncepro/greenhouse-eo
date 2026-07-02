# AEO Landing — Pipeline Compact Proof Tiles

## Meta

- Status: `implemented`
- Owner task: live public-site iteration, no TASK id
- Product Design asset: operator reference screenshots in Codex thread, 2026-07-01
- Intended consumers: public AEO landing visitors
- Copy source: Elementor post `250265`, documented in `docs/documentation/public-site/aeo-landing-elementor.md`
- Primitive decision: route-local WordPress/Elementor proof-card styling; no Greenhouse portal primitive
- UI ready target: `yes`

## Brief

- Primary user: LatAm marketing/growth leader evaluating AEO
- User moment: judging whether IA visibility is a business pipeline problem
- Job to be done: understand the conversion and lead-source proof without oversized cards slowing the scan
- Primary decision signal: two compact KPI proof cards, each with metric, evidence sentence, and source
- Non-goals: no new interaction, no animation system, no form changes, no hero widget changes

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Section header | Frame the business problem | Elementor heading/text widgets | Static landing copy |
| 1 | Proof grid | Compare two evidence points | Two compact proof tiles | Static landing copy |
| 2 | Closing proof line | Convert proof into buying logic | Centered text callout | Static landing copy |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public.aeo.pipeline.heading` | Header | Aparecer en las respuestas de IA no es vanidad. Es pipeline. | none | Already implemented live |
| `public.aeo.pipeline.lead` | Header | Cuando tu marca es la que los motores de IA nombran, ganas algo más que visibilidad: ganas la conversación de compra antes que tu competencia. Y el tráfico que llega desde ahí llega más decidido a comprar. | none | Already implemented live |
| `public.aeo.pipeline.card1.metric` | Proof grid | 4,4× | none | KPI value |
| `public.aeo.pipeline.card1.body` | Proof grid | Los visitantes que llegan desde motores de IA convierten cerca de 4,4 veces más que los de búsqueda orgánica: llegan pre-calificados por el propio motor. | none | Evidence body |
| `public.aeo.pipeline.card1.source` | Proof grid | Semrush, 2025 | none | Source line uses real AXIS SVG logotype inline, not text |
| `public.aeo.pipeline.card2.metric` | Proof grid | ~15% | none | KPI value |
| `public.aeo.pipeline.card2.body` | Proof grid | De los leads de Docebo ya provienen del tráfico de IA tras priorizar su visibilidad en motores generativos. | none | Evidence body |
| `public.aeo.pipeline.card2.source` | Proof grid | HubSpot / Docebo, 2026 | none | Source line |
| `public.aeo.pipeline.statement` | Closing proof line | Por eso el AEO no es un experimento de marketing: es un canal de adquisición temprano, con ventaja para quien llega primero. | none | Closing statement |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | n/a | Static section rendered | n/a | No async state |
| loading | n/a | n/a | n/a | WordPress page-level load only |
| empty | n/a | n/a | n/a | Static content |
| partial | n/a | n/a | n/a | Static content |
| error | n/a | n/a | n/a | Public page fallback handled by WordPress/CDN |
| denied | n/a | n/a | n/a | Public page |

## Accessibility Contract

- Heading order: section heading remains the primary heading inside the pipeline section.
- Chart/table alternatives: metrics are textual KPIs with supporting prose and sources; no chart alternative required.
- Aria labels: no custom interactive control added.
- Focus notes: cards are non-interactive, so no hover-only or focus-only affordance.
- Color-independent state labels: no state is communicated by color alone.

## Implementation Mapping

- Route / surface: WordPress public landing `/aeo-2/`, Elementor post `250265`.
- Primitives: no portal primitive at runtime; Semrush source mark reuses the same AXIS asset as `GreenhouseBrandLogoMark kind='semrushLogotype'` by inlining `semrush-logotype.svg` in Elementor.
- Variants / kinds: `gh-aeo-pipeline-compact-proof-tiles-v1`.
- Component candidates: existing Elementor containers/widgets and existing `gh-aeo-*` classes.
- Copy source: live Elementor static HTML, mirrored in public-site AEO documentation.
- Data reader / command: `pnpm public-website:wpcli -- --eval-file <script> --wp-user 12`.
- API parity: not applicable; public marketing copy/layout.
- Access / capability: public anonymous route.
- Runtime consumers: `efeoncepro.com/aeo-2/`.
- Print/email/PDF considerations: none.
- GVC markers: existing CSS classes `.gh-aeo-pipeline-optimized`, `.gh-aeo-pipeline-proof-grid`, `.gh-aeo-metric-card`.

## GVC Scenario Plan

- Scenario file: ad-hoc Playwright verification for this live WordPress iteration.
- Route: `https://efeoncepro.com/aeo-2/?v=<cache-bust>`.
- Viewports: desktop `1440x1100`; mobile `390x1100`.
- Required steps: navigate with `domcontentloaded`; scroll pipeline into view; wait for fonts; capture screenshots.
- Required captures: desktop and mobile pipeline screenshots under `.captures/`.
- Required `data-capture` markers: not added in Elementor; use stable `gh-aeo-*` classes.
- Assertions: exact copy, two proof cards, compact card heights, hero protected widget hash, no console-blocking failure.
- Scroll-width checks: `document.documentElement.scrollWidth - clientWidth === 0` on desktop and mobile.
- Accessibility/focus checks: no custom focusable element added.
- Reduced-motion evidence: no motion added.

## Design Decision Log

- Decision: replace the oversized row-card feeling with compact proof tiles while keeping the reference copy and existing section structure; use the real Semrush SVG logotype instead of a text-styled wordmark.
- Alternatives considered: retain giant split cards; add carousel/tabs; animate metrics on scroll.
- Why this pattern: the visitor needs to scan proof quickly; two static evidence cards communicate enough without implying interactivity.
- Reuse / extend / new primitive: reuse existing Elementor structure; extend page CSS only.
- Open risks: WordPress cache may delay visual refresh until Kinsta purge completes.
- Follow-up: promote to a durable public-site visual check if the AEO landing continues to receive iterative design changes.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
