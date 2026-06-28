# TASK-1252 — AI Visibility Report Artifact Wireframe

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1252 — Growth AI Visibility: Report Artifact Design System`
- Product Design asset: [executive-report-atlas-final-artifact-contract.png](../../assets/product-design/task-1252-ai-visibility-report-artifact-design-system/executive-report-atlas-final-artifact-contract.png)
- Intended consumers: `publicWeb`, `clientPortal`, `attachment`, `adminPreview`
- Copy source: planned extension of `src/lib/copy/growth.ts`
- Primitive decision: feature-local report artifact model with render adapters; do not promote to platform primitive unless reuse appears outside AI Visibility.

## Brief

- Primary user: prospect, authenticated client, internal reviewer or email recipient reading the same public-safe report model.
- User moment: a `PublicGraderReport` is ready or partially ready and the user needs to understand score, gap, evidence-safe signals and next action.
- Job to be done: explain the AI visibility estimate in under 30 seconds without exposing raw evidence or implying guaranteed ranking.
- Primary decision signal: estimated visibility score plus primary gap and recommended motion.
- Non-goals: scoring changes, raw provider review, prompt disclosure, ranking guarantees, email body design.

## Delta 2026-06-28 — SEO/AEO narrative structure

- The top-line report narrative follows the Efeonce 5-level framework and keeps its two-axis truth visible:
  - Perception axis: `Be Found -> Be Readable -> Be Correct -> Be Intrinsic`.
  - Agentic operability axis: `Be Actionable` as an orthogonal track, not fused into the perception score.
- The dimension breakdown is no longer a flat scorecard. It groups each technical dimension under the level it explains:
  - `Be Found`: AI Visibility.
  - `Be Readable`: Entity Clarity, Category Ownership, Citation Quality.
  - `Be Correct`: Message Alignment until the dedicated accuracy signal lands.
  - `Be Intrinsic`: Competitive SoV, Revenue Intent Coverage.
- Engine presence is treated as channel evidence: each answer engine is a distinct AEO channel, with an explicit weakest-channel interpretation.
- Recommendations are framed as `Plan AEO prioritario`, not a generic task list.
- Provenance closes the loop as a measurement baseline: same prompt pack, same sampled engines and same score version for comparable trend.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Artifact header | Brand, report identity and public-safe status | report header adapter | `report.headline`, `report.provenance` |
| 0.1 | Variant switcher | Show adapter discipline for design-system preview | segmented control, docs-only | static variant metadata |
| 1 | Executive verdict | Score, severity, coverage and partial cue | `AiVisibilityScoreHero` | `score`, `gate`, `provenance` |
| 2 | Primary gap | Name the main opportunity and impact | `AiVisibilityPrimaryGapCard` | `primaryGap` |
| 3 | Recommended motion | Explain the motion without overpromising | `AiVisibilityRecommendedMotionCard` | `recommendations[0]`, `recommendedMotion` |
| 4 | 5-level framework | Two-axis maturity model: perception lane + agentic operability lane | `AiVisibilityLevelsBand` | derived from `dimensions[]` |
| 5 | Engine channels | Presence by answer engine + weakest-channel interpretation | `AiVisibilityEngineSnapshot` | `providerPresence[]` |
| 6 | Competitive benchmark | Share of Voice vs. competitors, tied to Be Intrinsic | `AiVisibilityCompetitiveSov` | `competitiveSov` |
| 7 | Dimension breakdown | Group dimensions by the framework level they explain | `AiVisibilityDimensionBreakdown` | `dimensions[]` + level mapping |
| 8 | AEO signals | Citation, sentiment, prominence, source mix and trend | `AiVisibilitySignalSummary` | `citationInsight`, `sentimentSummary`, `positionSummary`, `sourceTypeSummary`, `trend` |
| 9 | Plan AEO | Prioritized remediation plan linked back to the affected level | `AiVisibilityRecommendationList` | `recommendations[]` |
| 10 | Provenance | Method, versions, providers, baseline and generated date | `AiVisibilityProvenanceFooter` | `provenance` |
| 8 | PDF preview | Prove attachment adapter can stand alone | print/PDF adapter preview | same report model |
| 9 | Artifact contract | Make implementation boundaries visible | docs/preview table | static contract metadata |
| 10 | Disclaimer footer | Legal-safe report framing | report footer | copy + `provenance` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aiVisibility.reportArtifact.header.title` | Header | Informe de visibilidad en IA | none | Main h1 for web and print. |
| `growth.aiVisibility.reportArtifact.header.organizationLabel` | Header | {organizationName} | `organizationName` | Organization name from report. |
| `growth.aiVisibility.reportArtifact.header.reportDateLabel` | Header | Fecha del informe | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.header.reportDateValue` | Header | {reportDate} | `reportDate` | Format with locale. |
| `growth.aiVisibility.reportArtifact.header.analyzedPeriodLabel` | Header | Periodo analizado | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.header.comparisonPeriodLabel` | Header | Comparado con | none | Only when comparable trend exists. |
| `growth.aiVisibility.reportArtifact.header.publicSafeChip` | Header | Público-safe | none | Public/client safe disclosure. |
| `growth.aiVisibility.reportArtifact.header.publicSafeHelper` | Header | Contenido sin datos confidenciales ni crudos | none | Do not say "anonimizado" unless guaranteed. |
| `growth.aiVisibility.reportArtifact.variants.label` | Variant switcher | Variante del artefacto | none | Design-system preview only. |
| `growth.aiVisibility.reportArtifact.variants.publicWeb` | Variant switcher | publicWeb | none | Keep technical variant id. |
| `growth.aiVisibility.reportArtifact.variants.clientPortal` | Variant switcher | clientPortal | none | Keep technical variant id. |
| `growth.aiVisibility.reportArtifact.variants.attachment` | Variant switcher | attachment | none | Keep technical variant id. |
| `growth.aiVisibility.reportArtifact.variants.adminPreview` | Variant switcher | adminPreview | none | Keep technical variant id. |
| `growth.aiVisibility.reportArtifact.variants.sharedModelNote` | Variant switcher | Estas variantes comparten el mismo modelo de reporte. | none | Explains adapter contract. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.title` | Region 1 | Veredicto ejecutivo | none | Section h2. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.scoreLabel` | Region 1 | Visibilidad estimada | none | Score is an estimate. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.scoreValue` | Region 1 | {score} /100 | `score` | Use tabular numbers. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.scoreDisclaimer` | Region 1 | Estimación, no garantía de ranking | none | Required legal-safe frame. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.severityLabel` | Region 1 | Nivel: {severity} | `severity` | Named severity required. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.coverageLabel` | Region 1 | Cobertura de proveedores | none | Coverage block label. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.coverageValue` | Region 1 | {respondedProviders} de {sampledProviders} proveedores muestreados | `respondedProviders`, `sampledProviders` | No raw provider data. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.partialLabel` | Region 1 | Reporte parcial | none | Shows only when partial. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.pendingProvider` | Region 1 | {providerName} pendiente | `providerName` | If more than one, use count version. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.partialHelper` | Region 1 | Algunas fuentes no respondieron a tiempo. | none | Honest without internal detail. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.contextLabel` | Region 1 | Contexto del informe | none | Context block label. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.contextValue` | Region 1 | Datos agregados y públicos | none | Avoid "completo" when partial. |
| `growth.aiVisibility.reportArtifact.executiveVerdict.contextHelper` | Region 1 | Sin datos crudos ni confidenciales. | none | Public-safe reassurance. |
| `growth.aiVisibility.reportArtifact.primaryGap.title` | Region 2 | Brecha principal | none | Section h2. |
| `growth.aiVisibility.reportArtifact.primaryGap.name` | Region 2 | Autoridad temática y citas verificables | none | From `primaryGap.title` if available. |
| `growth.aiVisibility.reportArtifact.primaryGap.body` | Region 2 | Bajo nivel de citas y referencias en respuestas generadas por IA limita tu visibilidad y consideración. | none | Client-safe interpretation. |
| `growth.aiVisibility.reportArtifact.primaryGap.impactLabel` | Region 2 | Impacto: {impact} | `impact` | Named label, not color-only. |
| `growth.aiVisibility.reportArtifact.recommendedMotion.title` | Region 3 | Movimiento recomendado | none | Section h2. |
| `growth.aiVisibility.reportArtifact.recommendedMotion.name` | Region 3 | Construir autoridad citacional | none | From recommendation pack. |
| `growth.aiVisibility.reportArtifact.recommendedMotion.body` | Region 3 | Fortalecer cobertura en fuentes confiables, contenido especializado y datos verificables. | none | No ranking promise. |
| `growth.aiVisibility.reportArtifact.recommendedMotion.impactLabel` | Region 3 | Impacto esperado: {impact} | `impact` | "Esperado" keeps it non-guaranteed. |
| `growth.aiVisibility.reportArtifact.dimensions.title` | Region 4 | Desempeño por dimensión | none | Section h2. |
| `growth.aiVisibility.reportArtifact.dimensions.column.dimension` | Region 4 | Dimensión | none | Table column. |
| `growth.aiVisibility.reportArtifact.dimensions.column.score` | Region 4 | Puntaje (0-100) | none | Bar axis starts at 0. |
| `growth.aiVisibility.reportArtifact.dimensions.column.severity` | Region 4 | Severidad | none | Named severity. |
| `growth.aiVisibility.reportArtifact.dimensions.column.comment` | Region 4 | Comentario clave | none | One-line interpretation. |
| `growth.aiVisibility.reportArtifact.dimensions.aiVisibility` | Region 4 | AI Visibility | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.entityClarity` | Region 4 | Claridad de entidad | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.thematicAuthority` | Region 4 | Autoridad temática | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.verifiedCitations` | Region 4 | Citas verificables | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.competition` | Region 4 | Competencia | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.trust` | Region 4 | Confianza percibida | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.purchaseIntent` | Region 4 | Intención de compra | none | Dimension label. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.aiVisibility` | Region 4 | Buena presencia general en IA. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.entityClarity` | Region 4 | Mejorar desambiguación y aliases. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.thematicAuthority` | Region 4 | Cobertura limitada en temas clave. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.verifiedCitations` | Region 4 | Bajo nivel de citas y referencias. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.competition` | Region 4 | Presencia por debajo de líderes. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.trust` | Region 4 | Señales positivas, pero dispersas. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.dimensions.comment.purchaseIntent` | Region 4 | Debilidad en escenarios transaccionales. | none | Example default comment. |
| `growth.aiVisibility.reportArtifact.severity.low` | Shared | Baja | none | Severity enum label. |
| `growth.aiVisibility.reportArtifact.severity.medium` | Shared | Media | none | Severity enum label. |
| `growth.aiVisibility.reportArtifact.severity.attention` | Shared | Atención | none | Severity enum label. |
| `growth.aiVisibility.reportArtifact.severity.high` | Shared | Alta | none | Severity enum label. |
| `growth.aiVisibility.reportArtifact.severity.critical` | Shared | Crítica | none | Severity enum label. |
| `growth.aiVisibility.reportArtifact.signals.title` | Region 5 | Resumen de señales AEO | none | Section h2. |
| `growth.aiVisibility.reportArtifact.signals.citationShareTitle` | Region 5 | Share de citas (promedio) | none | Static chart title. |
| `growth.aiVisibility.reportArtifact.signals.citationShareValue` | Region 5 | {citationShare}% | `citationShare` | Text alternative required. |
| `growth.aiVisibility.reportArtifact.signals.citationShareHelper` | Region 5 | Menciones con cita: {citedMentions} de {totalMentions} | `citedMentions`, `totalMentions` | Aggregate only. |
| `growth.aiVisibility.reportArtifact.signals.sentimentTitle` | Region 5 | Sentimiento de menciones | none | Signal title. |
| `growth.aiVisibility.reportArtifact.signals.sentiment.positive` | Region 5 | Positivo | none | Bar label. |
| `growth.aiVisibility.reportArtifact.signals.sentiment.neutral` | Region 5 | Neutral | none | Bar label. |
| `growth.aiVisibility.reportArtifact.signals.sentiment.negative` | Region 5 | Negativo | none | Bar label. |
| `growth.aiVisibility.reportArtifact.signals.sentimentBasis` | Region 5 | Basado en {sampleSize} menciones calificadas por IA. | `sampleSize` | Disclose sample. |
| `growth.aiVisibility.reportArtifact.signals.prominenceTitle` | Region 5 | Prominencia de marca | none | Signal title. |
| `growth.aiVisibility.reportArtifact.signals.prominenceValue` | Region 5 | {prominence} /5 | `prominence` | Include scale. |
| `growth.aiVisibility.reportArtifact.signals.prominenceHelper` | Region 5 | Índice de prominencia en respuestas de IA. | none | Clarifies metric. |
| `growth.aiVisibility.reportArtifact.signals.trendTitle` | Region 5 | Tendencia de visibilidad | none | Trend title. |
| `growth.aiVisibility.reportArtifact.signals.trendComparison` | Region 5 | vs. periodo anterior | none | Period explicit. |
| `growth.aiVisibility.reportArtifact.signals.trendAxisLabel` | Region 5 | Puntaje de visibilidad estimada (0-100) | none | Chart/table alt. |
| `growth.aiVisibility.reportArtifact.recommendations.title` | Region 6 | Recomendaciones prioritarias | none | Section h2. |
| `growth.aiVisibility.reportArtifact.recommendations.column.action` | Region 6 | Acción recomendada | none | Table column. |
| `growth.aiVisibility.reportArtifact.recommendations.column.description` | Region 6 | Descripción | none | Table column. |
| `growth.aiVisibility.reportArtifact.recommendations.column.effort` | Region 6 | Esfuerzo | none | Table column. |
| `growth.aiVisibility.reportArtifact.recommendations.column.impact` | Region 6 | Impacto | none | Table column. |
| `growth.aiVisibility.reportArtifact.recommendations.item1.title` | Region 6 | Fortalecer citas en fuentes de alta autoridad | none | Example recommendation title. |
| `growth.aiVisibility.reportArtifact.recommendations.item1.body` | Region 6 | Obtener cobertura y menciones en medios, directorios y sitios de la industria. | none | Example recommendation body. |
| `growth.aiVisibility.reportArtifact.recommendations.item2.title` | Region 6 | Profundizar contenido temático | none | Example recommendation title. |
| `growth.aiVisibility.reportArtifact.recommendations.item2.body` | Region 6 | Publicar contenidos especializados con datos, casos y marcos propios. | none | Example recommendation body. |
| `growth.aiVisibility.reportArtifact.recommendations.item3.title` | Region 6 | Optimizar intención de compra | none | Example recommendation title. |
| `growth.aiVisibility.reportArtifact.recommendations.item3.body` | Region 6 | Crear páginas y contenidos que respondan escenarios transaccionales clave. | none | Example recommendation body. |
| `growth.aiVisibility.reportArtifact.recommendations.detailLink` | Region 6 | Ver plan detallado de acciones en la página {pageNumber} | `pageNumber` | Attachment/web long-report link. |
| `growth.aiVisibility.reportArtifact.effort.low` | Shared | Bajo | none | Effort enum. |
| `growth.aiVisibility.reportArtifact.effort.medium` | Shared | Medio | none | Effort enum. |
| `growth.aiVisibility.reportArtifact.effort.high` | Shared | Alto | none | Effort enum. |
| `growth.aiVisibility.reportArtifact.impact.medium` | Shared | Medio | none | Impact enum. |
| `growth.aiVisibility.reportArtifact.impact.high` | Shared | Alto | none | Impact enum. |
| `growth.aiVisibility.reportArtifact.provenance.title` | Region 7 | Proveniencia y metodología | none | Section h2. |
| `growth.aiVisibility.reportArtifact.provenance.reportId` | Region 7 | ID del informe | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.provenance.methodology` | Region 7 | Metodología | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.provenance.sampledProviders` | Region 7 | Proveedores muestreados (agregado) | none | Aggregate, no raw text. |
| `growth.aiVisibility.reportArtifact.provenance.scoreVersion` | Region 7 | Versión del score | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.provenance.promptPackVersion` | Region 7 | Versión del prompt pack | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.provenance.generatedAt` | Region 7 | Generado / actualizado | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.provenance.currency` | Region 7 | Moneda del reporte | none | Use only if present in artifact metadata. |
| `growth.aiVisibility.reportArtifact.provenance.language` | Region 7 | Idioma del análisis | none | Metadata label. |
| `growth.aiVisibility.reportArtifact.preview.title` | Region 8 | Vista previa de adjunto / PDF (print-safe) | none | Right panel title. |
| `growth.aiVisibility.reportArtifact.preview.pageLabel` | Region 8 | Página {currentPage} de {pageCount} | `currentPage`, `pageCount` | Print preview footer. |
| `growth.aiVisibility.reportArtifact.preview.summaryTitle` | Region 8 | Resumen ejecutivo | none | PDF preview section. |
| `growth.aiVisibility.reportArtifact.preview.summaryBody` | Region 8 | Tu marca tiene visibilidad moderada en IA generativa. La autoridad temática y el nivel de citas verificables son las principales oportunidades para aumentar relevancia y consideración en respuestas clave. | none | Use dynamic summary if report provides one. |
| `growth.aiVisibility.reportArtifact.contract.title` | Region 9 | Contrato del artefacto | none | Design-system metadata title. |
| `growth.aiVisibility.reportArtifact.contract.column.component` | Region 9 | Componente compartido | none | Table column. |
| `growth.aiVisibility.reportArtifact.contract.column.included` | Region 9 | Incluido | none | Table column. |
| `growth.aiVisibility.reportArtifact.contract.column.notes` | Region 9 | Notas | none | Table column. |
| `growth.aiVisibility.reportArtifact.contract.sharedModel` | Region 9 | Modelo de reporte compartido | none | Checklist item. |
| `growth.aiVisibility.reportArtifact.contract.disclosureMatrix` | Region 9 | Matriz de disclosure (público-safe) | none | Checklist item. |
| `growth.aiVisibility.reportArtifact.contract.copySources` | Region 9 | Fuentes de copy exportables | none | Checklist item. |
| `growth.aiVisibility.reportArtifact.contract.webAdapter` | Region 9 | Adaptador web (publicWeb / clientPortal) | none | Checklist item. |
| `growth.aiVisibility.reportArtifact.contract.pdfAdapter` | Region 9 | Adaptador PDF / impresión (attachment) | none | Checklist item. |
| `growth.aiVisibility.reportArtifact.contract.emailBodySeparate` | Region 9 | Cuerpo de email (separado) | none | Checklist item. |
| `growth.aiVisibility.reportArtifact.contract.helper` | Region 9 | Este artefacto está diseñado para ser reutilizable en web público, portal de cliente, adjuntos PDF e imagen administrativa, manteniendo consistencia y trazabilidad. | none | Docs/preview helper. |
| `growth.aiVisibility.reportArtifact.footer.disclaimer` | Footer | Estimación basada en respuestas generadas por IA a partir de fuentes públicas y señales agregadas. No es un ranking ni garantiza resultados futuros. | none | Required disclaimer. |
| `growth.aiVisibility.reportArtifact.footer.noRawData` | Footer | No incluye datos confidenciales ni crudos de proveedores. | none | Required public-safe note. |
| `growth.aiVisibility.reportArtifact.footer.scopeLink` | Footer | Ver alcance y limitaciones en la página {pageNumber}. | `pageNumber` | Attachment long-form link. |
| `growth.aiVisibility.reportArtifact.footer.publicSafeStamp` | Footer | Contenido público-safe: sin evidencia cruda. | none | Stamp text. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Informe listo | El informe ya puede compartirse como vista web o adjunto. | Ver informe | Consumer may choose CTA. |
| partial | Reporte parcial | Algunas fuentes no respondieron a tiempo. El puntaje y las conclusiones pueden cambiar cuando se complete la cobertura. | Ver cobertura disponible | Never expose internal provider errors. |
| noTrend | Sin histórico comparable | Este informe aún no tiene una medición anterior comparable. | none | Do not show fake trend or zero. |
| insufficientData | Datos insuficientes | La muestra disponible no alcanza para estimar visibilidad con confianza. | Solicitar nueva medición | Consumer decides if CTA exists. |
| reviewRequiredPublic | Tu reporte se está preparando | Estamos revisando que el informe no incluya datos internos ni señales incompletas. | Volver más tarde | Public/client wording; no internal gate reason. |
| expired | Este informe ya no está disponible | El enlace o adjunto pertenece a una versión vencida del reporte. | Solicitar una versión actualizada | Public/token consumer state. |
| renderError | No pudimos cargar el informe | La información del reporte no respondió a tiempo. Tus datos no se perdieron. | Reintentar | Web consumer only. |
| denied | Este informe no está disponible para tu espacio | No encontramos un reporte autorizado para esta organización. | Volver al portal | Client consumer only. |
| printReady | Preparado para adjuntar | El informe usa gráficos estáticos y tablas de respaldo para impresión/PDF. | Descargar PDF | TASK-1250 owns final action. |

## Accessibility Contract

- Heading order: one h1 (`Informe de visibilidad en IA`), then h2 sections numbered 1-9 in visual order.
- Score text alternative: `Visibilidad estimada {score} de 100. Nivel {severity}. Estimación, no garantía de ranking.`
- Dimension chart alternative: render the dimension breakdown as a real table or table-equivalent text for every adapter.
- Citation chart alternative: `Share de citas {citationShare} por ciento; {citedMentions} menciones con cita de {totalMentions}.`
- Sentiment chart alternative: `Sentimiento de menciones: positivo {positive} por ciento, neutral {neutral} por ciento, negativo {negative} por ciento.`
- Trend chart alternative: include a data table with period and score. Do not rely on line direction alone.
- Severity is never color-only: pair each label with text and an icon/shape.
- PDF/print adapter preserves headings, table labels and disclaimer text even if charts become static images.
- Interactive variant switcher is only for design-system preview; report consumers do not need it.

## Implementation Mapping

- Shared model: report section order, disclosure matrix, copy ids, chart encodings and public-safe rules.
- Web adapter: React/MUI feature-local components under `src/components/growth/ai-visibility/report-artifact/**`.
- Print/PDF adapter: print-safe HTML or PDF renderer with static SVG/PNG charts plus table fallback. No ECharts runtime, no hover, no motion, no container-query dependency.
- Email body: remains separate in `TASK-1250`; it may summarize this artifact but must not embed the whole report contract.
- Copy source: extend `src/lib/copy/growth.ts` with the ids above or a structured `GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT`.
- GVC markers: `ai-visibility-report`, `ai-visibility-report-score`, `ai-visibility-report-recommendations`, `ai-visibility-report-provenance`, `ai-visibility-report-attachment-preview`.
- Visual source: keep the Product Design PNG as a baseline reference; implementation should validate via GVC once runtime exists.

## GVC Scenario Plan

- Scenario file: create `scripts/frontend/scenarios/ai-visibility-report-artifact.scenario.ts` with web and static/attachment specimens.
- Route: design-system lab or report artifact preview route created by implementation.
- Viewports: desktop 1440px, laptop 1280px, mobile 390px and print/PDF preview width.
- Required steps: load full report, validate partial report, preview attachment/static variant, inspect chart/table fallback.
- Required captures: full artifact, partial artifact, insufficient data, public-safe review state, attachment preview and mobile stacked layout.
- Required `data-capture` markers: `ai-visibility-report`, `ai-visibility-report-score`, `ai-visibility-report-recommendations`, `ai-visibility-report-provenance`, `ai-visibility-report-attachment-preview`.
- Assertions: public artifact has no provider findings, raw prompts, raw text, raw citation URLs or internal ids; disclaimers remain visible.
- Scroll-width checks: desktop and mobile 390px must satisfy `scrollWidth <= clientWidth`; attachment preview must not clip tables.
- Accessibility/focus checks: chart table alternatives exist; headings preserve report order; static variants do not depend on hover.
- Reduced-motion evidence: web variant honors reduced motion; attachment/PDF variant is static by design.

## Design Decision Log

- Decision: define one report artifact system with web and static adapters instead of separate consumer-specific reports.
- Alternatives considered: embed the report design inside TASK-1241/1248, use only dashboard cards, or make PDF/email a separate visual language.
- Why this pattern: the same report must feed public page, client portal and attachment without disclosure drift or copy duplication.
- Reuse / extend / new primitive: likely new/extended report artifact primitive family under the growth domain; primitives must still reuse Greenhouse cards, charts, typography and motion contracts.
- Open risks: framework-level top-line changes from the Efeonce 5-level model must be reconciled before implementation finalizes the section order.
- Follow-up: update this contract after TASK-1265...1270 settle the additional grader/readiness signals.

## Acceptance Checklist

- [ ] All visible strings from the approved visual have a copy id.
- [ ] Dynamic values are explicit and locale-formatted.
- [ ] The word "estimación" appears wherever the score could be mistaken for a ranking guarantee.
- [ ] Partial state says what is missing without exposing provider internals.
- [ ] Public-safe disclaimer appears in web and attachment.
- [ ] Attachment/PDF adapter is explicitly separate from web components.
- [ ] Email body is not treated as the full report artifact.
- [ ] Charts have table/text alternatives.
- [ ] Severity and status are not color-only.
- [ ] No raw provider text, prompts, raw citation URLs, internal IDs or accuracy findings are exposed.
- [ ] Implementation mapping, GVC scenario plan and design decision log stay aligned before moving `UI ready` to `yes`.
