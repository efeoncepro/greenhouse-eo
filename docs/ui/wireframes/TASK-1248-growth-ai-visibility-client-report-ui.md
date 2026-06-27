# TASK-1248 — AI Visibility Client Report Wireframe

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1248 — Growth AI Visibility: Client Report UI`
- Product Design asset: [executive-signal-command-final-target.png](../../assets/product-design/task-1248-ai-visibility-client-report/executive-signal-command-final-target.png)
- Supporting asset: [evidence-safe-workbench-sidecar.png](../../assets/product-design/task-1248-ai-visibility-client-report/evidence-safe-workbench-sidecar.png)
- Intended consumers: authenticated client portal route, future Account 360 deep-link, future recurring monitor entry point.
- Copy source: planned extension of `src/lib/copy/growth.ts`
- Primitive decision: reuse `CompositionShell` (`leadPlusContext`), `ContextualSidecar` / Adaptive Sidecar `variant='inspector'`, Greenhouse breadcrumbs/chips/buttons, and **`AiVisibilityReportArtifact` (TASK-1252) as the report renderer** (variant `clientPortal`, charts in **Recharts** + table fallback). NOT ECharts; do not rebuild report sections.

> **Artifact reuse note (Delta 2026-06-27 PM):** regions 2–8 below (header score, dimensions, recommendations list, trend, signals) are **rendered by `AiVisibilityReportArtifact`** consumed with `model={modelFromClientReport(clientReport)}` — the "component candidates" `AiVisibilityScoreHero` / `AiVisibilityDimensionBreakdown` are the artifact's **internal sections**, not standalone components to build. The genuinely **net-new** UI in this task is: the client **page shell** (`CompositionShell`), the **`ContextualSidecar` recommendation inspector** (region 5 — the artifact has no per-recommendation sidecar), the safe-signal cards inside the sidecar (`MetricSummaryCard`), and the **client state surfaces** (region 9). Charts = the artifact's Recharts; no ECharts, no 2nd chart lib.

## Brief

- Primary user: authenticated client executive, manager or specialist with `growth.ai_visibility.report.read_client` scope for their own organization.
- User moment: the client opens Greenhouse to review the latest AI Visibility snapshot for their organization.
- Job to be done: understand the score, main gap, trend and recommended next step without needing sales or internal review context.
- Primary decision signal: current estimated visibility score plus named severity, trend context and priority recommendation.
- Non-goals: run providers, edit scoring, expose raw evidence, perform admin review, promise recurring monitoring, mutate commercial state silently.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Page shell | Client portal route with existing dashboard chrome | app shell / Vuexy layout | route + session |
| 1 | Breadcrumbs | Confirm hierarchy and recovery path | `GreenhouseBreadcrumbs kind='pageHierarchy'` | static route metadata |
| 2 | Header | Name the report and show tenant-safe context | page header / `CompositionShell` lead | `ClientGraderReport.headline`, session org |
| 2.1 | Tenant cue | Show the organization whose report is being read | chip + organization lockup | server-derived org context |
| 2.2 | Report metadata | Date, comparison period and sampled-provider status | metadata strip | `report.provenance`, `report.trend`, `report.gate` |
| 3 | Lead score region | Make the score legible with context | `AiVisibilityScoreHero` / metric card | `report.headline`, `score`, `trend`, `gate` |
| 3.1 | Provider coverage | Explain sample coverage and pending providers | provider list / coverage card | `provenance.sampledProviders`, `gate` |
| 4 | Primary dimensions | Scannable bar/table matrix | `AiVisibilityDimensionBreakdown` | `report.dimensions[]` |
| 5 | Recommendation sidecar | Explain selected recommendation in an in-flow inspector | `ContextualSidecar variant='inspector'` | selected `recommendations[]`, `primaryGap`, signals |
| 5.1 | Sidecar signals | Show safe aggregates only | signal rows | `citationInsight`, `sentimentSummary`, `positionSummary`, `trend` |
| 5.2 | Sidecar actions | Offer safe next steps | `GreenhouseButton`, secondary button | existing handoff/contact path or read-only links |
| 6 | Recommendation list | Show top prioritized actions | recommendation list/table | `recommendations[]` |
| 7 | Competitive / AEO signals | Summarize share of voice, citations and sentiment | compact chart cards + table fallback | public-safe aggregate signals |
| 8 | Footer disclosure | Explain sampling and last update | disclosure text / metadata footer | `provenance`, copy |
| 9 | State surfaces | Loading, empty, pending, partial, error, denied | state-specific wrappers | API status + canonical errors |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aiVisibility.clientReport.breadcrumb.home` | Breadcrumbs | Inicio | none | Client portal home. |
| `growth.aiVisibility.clientReport.breadcrumb.reports` | Breadcrumbs | Reportes | none | Parent label. |
| `growth.aiVisibility.clientReport.breadcrumb.current` | Breadcrumbs | AI Visibility | none | Current page. |
| `growth.aiVisibility.clientReport.header.title` | Header | AI Visibility Snapshot | none | Matches approved visual; do not imply monitor. |
| `growth.aiVisibility.clientReport.header.organization` | Header | {organizationName} | `organizationName` | Server-derived org only. |
| `growth.aiVisibility.clientReport.header.verifiedOrgLabel` | Header | Organización verificada | none | Optional tooltip text. |
| `growth.aiVisibility.clientReport.header.clientAuthenticated` | Header | Cliente autenticado | none | Tenant-safe cue. |
| `growth.aiVisibility.clientReport.header.secureEnvironment` | Header | Entorno seguro | none | Secondary cue, not legal promise. |
| `growth.aiVisibility.clientReport.header.partialChip` | Header | Reporte parcial | none | Show only when partial. |
| `growth.aiVisibility.clientReport.header.partialProvider` | Header | {providerName} pendiente | `providerName` | Prefer count if >1 provider. |
| `growth.aiVisibility.clientReport.header.dateRange` | Header | {startDate}–{endDate} | `startDate`, `endDate` | Date selector/display. |
| `growth.aiVisibility.clientReport.header.comparison` | Header | Comparado con {comparisonRange} | `comparisonRange` | Hide when no trend. |
| `growth.aiVisibility.clientReport.score.value` | Lead score | {score} /100 | `score` | Tabular numbers. |
| `growth.aiVisibility.clientReport.score.label` | Lead score | Puntaje general | none | Score is contextual, never isolated. |
| `growth.aiVisibility.clientReport.score.severity` | Lead score | {severity} | `severity` | Named severity chip. |
| `growth.aiVisibility.clientReport.score.deltaPositive` | Lead score | +{delta} vs. análisis anterior | `delta` | Use sign from data. |
| `growth.aiVisibility.clientReport.score.deltaNegative` | Lead score | {delta} vs. análisis anterior | `delta` | Include negative sign from formatter. |
| `growth.aiVisibility.clientReport.score.noTrend` | Lead score | Sin histórico comparable | none | Null trend is not zero. |
| `growth.aiVisibility.clientReport.score.partialHelper` | Lead score | Muestra parcial: los resultados pueden cambiar cuando se complete el análisis de todos los proveedores. | none | Approved visual language, client-safe. |
| `growth.aiVisibility.clientReport.providers.title` | Lead score | Proveedores muestreados | none | Coverage context. |
| `growth.aiVisibility.clientReport.providers.pendingStatus` | Lead score | Pendiente | none | Provider row status. |
| `growth.aiVisibility.clientReport.dimensions.title` | Dimensions | Desempeño por dimensión | none | Section h2. |
| `growth.aiVisibility.clientReport.dimensions.column.dimension` | Dimensions | Dimensión | none | Table column. |
| `growth.aiVisibility.clientReport.dimensions.column.score` | Dimensions | Puntaje | none | Table column. |
| `growth.aiVisibility.clientReport.dimensions.column.severity` | Dimensions | Severidad | none | Table column. |
| `growth.aiVisibility.clientReport.dimensions.axisStart` | Dimensions | 0 | none | Visual axis label. |
| `growth.aiVisibility.clientReport.dimensions.axisMiddle` | Dimensions | 50 | none | Visual axis label. |
| `growth.aiVisibility.clientReport.dimensions.axisEnd` | Dimensions | 100 | none | Visual axis label. |
| `growth.aiVisibility.clientReport.dimensions.aiVisibility` | Dimensions | AI Visibility | none | Dimension label. |
| `growth.aiVisibility.clientReport.dimensions.entityClarity` | Dimensions | Claridad de entidad | none | Dimension label. |
| `growth.aiVisibility.clientReport.dimensions.category` | Dimensions | Categoría | none | Dimension label. |
| `growth.aiVisibility.clientReport.dimensions.competition` | Dimensions | Competencia | none | Dimension label. |
| `growth.aiVisibility.clientReport.dimensions.citations` | Dimensions | Citas | none | Dimension label. |
| `growth.aiVisibility.clientReport.dimensions.message` | Dimensions | Mensaje | none | Dimension label. |
| `growth.aiVisibility.clientReport.dimensions.purchaseIntent` | Dimensions | Intención de compra | none | Dimension label. |
| `growth.aiVisibility.clientReport.severity.attention` | Shared | Atención | none | Severity label. |
| `growth.aiVisibility.clientReport.severity.inDevelopment` | Shared | En desarrollo | none | Severity label from visual. |
| `growth.aiVisibility.clientReport.severity.critical` | Shared | Crítico | none | Severity label. |
| `growth.aiVisibility.clientReport.severity.low` | Shared | Bajo | none | Severity label for sidecar variant. |
| `growth.aiVisibility.clientReport.recommendationPanel.title` | Sidecar | Prioridad recomendada | none | Default sidecar title. |
| `growth.aiVisibility.clientReport.recommendationPanel.detailTitle` | Sidecar | Detalle de recomendación | none | When a recommendation is selected. |
| `growth.aiVisibility.clientReport.recommendationPanel.primaryGapLabel` | Sidecar | Principal brecha | none | Label. |
| `growth.aiVisibility.clientReport.recommendationPanel.primaryGapTitle` | Sidecar | Bajo nivel de citas verificables | none | Use report-provided primary gap if available. |
| `growth.aiVisibility.clientReport.recommendationPanel.primaryGapBody` | Sidecar | Bajo nivel de citas y referencias en respuestas generadas por IA. Impacta en la autoridad percibida y en la consideración. | none | Public-safe; no raw evidence. |
| `growth.aiVisibility.clientReport.recommendationPanel.motionLabel` | Sidecar | Moción recomendada | none | Label. |
| `growth.aiVisibility.clientReport.recommendationPanel.motionTitle` | Sidecar | Aumentar autoridad citacional con contenido verificable y presencia en fuentes confiables. | none | No ranking guarantee. |
| `growth.aiVisibility.clientReport.recommendationPanel.nextStepLabel` | Sidecar | Próximo paso | none | Label. |
| `growth.aiVisibility.clientReport.recommendationPanel.whyTitle` | Sidecar | ¿Por qué importa? | none | Detail variant title. |
| `growth.aiVisibility.clientReport.recommendationPanel.whyBody` | Sidecar | Tu marca aparece con baja frecuencia en respuestas de IA frente a competidores directos, lo que limita la consideración en etapas tempranas de decisión. | none | Safe aggregate interpretation. |
| `growth.aiVisibility.clientReport.recommendationPanel.expectedOutcomeTitle` | Sidecar | Resultado esperado | none | Detail variant title. |
| `growth.aiVisibility.clientReport.recommendationPanel.expectedOutcomeBody` | Sidecar | Aumentar la frecuencia de mención en respuestas generadas por IA y mejorar el recall de marca en consultas relevantes. | none | "Esperado", not guaranteed. |
| `growth.aiVisibility.clientReport.recommendationPanel.safeSignalsTitle` | Sidecar | Señales (fuentes seguras) | none | Aggregate-only signal section. |
| `growth.aiVisibility.clientReport.recommendationPanel.citationInsight` | Sidecar | Participación de citas | none | Signal label. |
| `growth.aiVisibility.clientReport.recommendationPanel.sentimentSummary` | Sidecar | Sentimiento promedio | none | Signal label. |
| `growth.aiVisibility.clientReport.recommendationPanel.positionSummary` | Sidecar | Posición promedio | none | Signal label. |
| `growth.aiVisibility.clientReport.actions.scheduleConversation` | Sidecar | Agendar conversación | none | Primary CTA; must use governed command/contact path if mutative. |
| `growth.aiVisibility.clientReport.actions.viewPlan` | Sidecar | Ver plan recomendado | none | Secondary CTA / local anchor. |
| `growth.aiVisibility.clientReport.actions.viewSignalDetail` | Sidecar | Ver detalle de señales y fuentes | none | Safe details link; no raw provider text. |
| `growth.aiVisibility.clientReport.actions.askDiagnostic` | Empty state | Solicitar diagnóstico | none | Only if a governed intake path exists. |
| `growth.aiVisibility.clientReport.recommendations.title` | Lower region | Recomendaciones principales | none | Section h2. |
| `growth.aiVisibility.clientReport.recommendations.viewAll` | Lower region | Ver todas las recomendaciones | none | Link/CTA. |
| `growth.aiVisibility.clientReport.recommendations.impactHigh` | Lower region | Impacto alto | none | Impact chip. |
| `growth.aiVisibility.clientReport.recommendations.impactMedium` | Lower region | Impacto medio | none | Impact chip. |
| `growth.aiVisibility.clientReport.recommendations.item1Title` | Lower region | Fortalecer citaciones en fuentes de alta autoridad | none | Example copy; prefer report data. |
| `growth.aiVisibility.clientReport.recommendations.item1Body` | Lower region | Mejorar presencia y referencias en medios, directorios y sitios de la industria. | none | Example copy. |
| `growth.aiVisibility.clientReport.recommendations.item2Title` | Lower region | Clarificar propuesta de valor y diferenciadores | none | Example copy. |
| `growth.aiVisibility.clientReport.recommendations.item2Body` | Lower region | Alinear mensajes clave con las preguntas que hacen los usuarios y las IA. | none | Example copy. |
| `growth.aiVisibility.clientReport.recommendations.item3Title` | Lower region | Optimizar contenido para intención de compra | none | Example copy. |
| `growth.aiVisibility.clientReport.recommendations.item3Body` | Lower region | Crear y optimizar contenido que responda objeciones y criterios de evaluación. | none | Example copy. |
| `growth.aiVisibility.clientReport.signals.shareOfVoiceTitle` | Lower region | Share of Voice competitivo (IA) | none | Keep industry term. |
| `growth.aiVisibility.clientReport.signals.citationSentimentTitle` | Lower region | Citas y sentimiento | none | Section title. |
| `growth.aiVisibility.clientReport.signals.citationShare` | Lower region | Share de citas | none | Chart label. |
| `growth.aiVisibility.clientReport.signals.citedMentions` | Lower region | Menciones con cita: {citedMentions} de {totalMentions} | `citedMentions`, `totalMentions` | Text fallback. |
| `growth.aiVisibility.clientReport.signals.sentimentMentions` | Lower region | Sentimiento de menciones | none | Chart label. |
| `growth.aiVisibility.clientReport.signals.positive` | Lower region | Positivo | none | Sentiment label. |
| `growth.aiVisibility.clientReport.signals.neutral` | Lower region | Neutral | none | Sentiment label. |
| `growth.aiVisibility.clientReport.signals.negative` | Lower region | Negativo | none | Sentiment label. |
| `growth.aiVisibility.clientReport.footer.disclaimer` | Footer | Greenhouse utiliza múltiples proveedores de IA. Los resultados pueden variar según el proveedor y las actualizaciones de los modelos. | none | Sampling disclaimer. |
| `growth.aiVisibility.clientReport.footer.lastUpdated` | Footer | Última actualización: {updatedAt} | `updatedAt` | Locale-formatted. |
| `growth.aiVisibility.clientReport.footer.safeScope` | Footer | Reporte en modo solo lectura. Los datos corresponden al último análisis disponible. | none | Sidecar/detail footer. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Reporte disponible | Tu snapshot de AI Visibility está listo para revisar. | Ver recomendaciones | Default state; CTA may scroll to recommendations. |
| loading | Cargando tu reporte | Estamos preparando la vista con el último snapshot autorizado para tu organización. | none | Skeleton must match final layout. |
| empty | Aún no hay diagnóstico para tu organización | Cuando se publique el primer análisis de AI Visibility para tu espacio, lo verás aquí con score, brechas y recomendaciones. | Solicitar diagnóstico | Do not show retry for `grader_run_not_found`. CTA only if governed path exists. |
| pending | Tu reporte se está preparando | El análisis todavía no está listo para cliente. Te mostraremos el resultado cuando el snapshot esté revisado y sea seguro para compartir. | Volver al portal | Neutral wording for `review_required` or unfinished run; no internal reason. |
| partial | Reporte parcial | Algunas fuentes no respondieron a tiempo. La lectura disponible sirve para orientar prioridades, pero puede cambiar cuando se complete la cobertura. | Ver cobertura disponible | Never expose provider error internals. |
| noTrend | Sin histórico comparable | Este snapshot aún no tiene una medición anterior comparable. El próximo análisis mostrará movimiento y contexto temporal. | none | Null trend is not zero. |
| insufficientData | Datos insuficientes | La muestra disponible no alcanza para estimar visibilidad con confianza. | Solicitar nueva medición | Consumer decides if action exists. |
| denied | Este reporte no está disponible para tu espacio | No encontramos un reporte autorizado para esta organización o tu usuario no tiene el permiso necesario. | Volver al portal | Tenant-safe; no existence leak. |
| error | No pudimos cargar el reporte | La vista no respondió a tiempo. Tus datos no se perdieron; intenta de nuevo en unos minutos. | Reintentar | Only for actual API/runtime failure, not not-found. |

## Accessibility Contract

- Heading order: h1 `AI Visibility Snapshot`; h2 for score/context, `Desempeño por dimensión`, `Prioridad recomendada`, `Recomendaciones principales`, `Share of Voice competitivo (IA)`, `Citas y sentimiento`.
- Score text alternative: `Puntaje general {score} de 100. Severidad {severity}. {trendText}.`
- Dimension matrix alternative: render rows as a real table or table-equivalent structure with dimension, score, trend and severity. Bars start at 0 and cannot be the only signal.
- Sidecar role: desktop sidecar uses non-modal complementary semantics; mobile drawer uses the primitive's temporary drawer behavior with focus trap and restore to the selected recommendation.
- Sidecar close aria label: `Cerrar detalle de recomendación`.
- Date selector aria label: `Seleccionar periodo del reporte de AI Visibility`.
- Primary CTA aria label: `Agendar conversación sobre el reporte de AI Visibility`.
- Signal chart alternatives: provide text/table fallback for share of voice, citation share and sentiment percentages.
- Color-independent states: severity, impact, pending and partial status must include text plus icon/shape, never color alone.
- Reduced motion: score/charts render final values without animated counting or chart entrance.

## Implementation Mapping

- Route: client-scoped dashboard route under the active client portal convention; verify final path during implementation.
- Data boundary: consume `GET /api/client-portal/growth/ai-visibility/report[?runId=...]`; do not import growth producer readers directly into client views.
- Access: server-side session org + capability `growth.ai_visibility.report.read_client`; no browser-computed tenant scope.
- Primitives: `CompositionShell` `leadPlusContext`, `ContextualSidecar variant='inspector'`, `GreenhouseBreadcrumbs`, `GreenhouseButton`, `GreenhouseChip`, adaptive metric/report cards, ECharts with table fallback.
- Copy source: extend `src/lib/copy/growth.ts`, ideally alongside `GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT` from `TASK-1252`.
- GVC markers: `client-ai-visibility-report`, `client-ai-visibility-score`, `client-ai-visibility-dimensions`, `client-ai-visibility-actions`, `client-ai-visibility-recommendation-detail`, `client-ai-visibility-signals`.
- GVC captures: ready, loading, empty, pending, partial, denied, desktop, mobile 390px and sidecar open.
- Runtime consumers: authenticated client portal only in V1; do not imply recurring monitor until product exists.
- Print/email/PDF considerations: none in this view; full report artifact and attachment rules live in `TASK-1252` / `TASK-1250`.

## GVC Scenario Plan

- Scenario file: create or extend `scripts/frontend/scenarios/client-ai-visibility-report.scenario.ts`.
- Route: final client portal route for `GET /api/client-portal/growth/ai-visibility/report`; confirm during implementation.
- Viewports: desktop 1440px, laptop 1280px and mobile 390px.
- Required steps: load ready report, select a recommendation, open sidecar, close via Escape, restore focus, validate mobile drawer.
- Required captures: ready, loading/skeleton, empty/no report, partial, denied, sidecar open desktop, drawer open mobile.
- Required `data-capture` markers: `client-ai-visibility-report`, `client-ai-visibility-score`, `client-ai-visibility-dimensions`, `client-ai-visibility-actions`, `client-ai-visibility-recommendation-detail`, `client-ai-visibility-signals`.
- Assertions: no raw provider text, no internal ids, CTA present only when governed, `grader_run_not_found` renders empty/not-available.
- Scroll-width checks: desktop and mobile 390px must satisfy `scrollWidth <= clientWidth`.
- Accessibility/focus checks: selected recommendation restores focus after sidecar/drawer close; score and charts have text/table alternatives.
- Reduced-motion evidence: primitive-level reduced-motion contract or capture with reduced motion enabled.

## Design Decision Log

- Decision: use a client-scoped command/report surface with `CompositionShell leadPlusContext` plus contextual inspector.
- Alternatives considered: static report-only page, modal-only recommendation detail, full dashboard with recurring monitor controls.
- Why this pattern: the customer needs one decision path with supporting evidence; sidecar keeps context visible without overpromising a monitor product.
- Reuse / extend / new primitive: reuse Composition Shell, ContextualSidecar, report cards and chart primitives; extend only if TASK-1252 creates artifact-level primitives.
- Open risks: final client route and exact report DTO shape must be verified when implementation starts.
- Follow-up: promote this scenario to baseline diff once TASK-1252 artifact primitives exist.

## Acceptance Checklist

- [ ] All visible strings from the approved visual have a copy id or data-source note.
- [ ] The score is always shown with context, severity and trend/no-trend state.
- [ ] Partial/pending/review-required states do not expose provider internals or review reasons.
- [ ] `grader_run_not_found` maps to a structural empty/not-available state, not a retry loop.
- [ ] CTA copy does not imply recurring monitoring or create commercial work without a governed command.
- [ ] Dimension bars start at 0 and have table fallback.
- [ ] Severity and impact are not color-only.
- [ ] Desktop sidecar is in-flow; mobile sidecar uses primitive drawer behavior with focus restore.
- [ ] No raw provider text, prompts, raw citation URLs, internal IDs or accuracy findings are exposed.
- [ ] GVC markers and state captures are ready for implementation.
- [ ] Implementation mapping, GVC scenario plan and design decision log stay aligned before moving `UI ready` to `yes`.
