/**
 * TASK-1235 — Growth AI Visibility · Report contract V1 (Slice 1).
 *
 * Contrato del `grader_report` (arch §7.7) derivado de `grader_score` +
 * `normalized_findings` (TASK-1227). PURO (sin IO). Invariantes:
 *  - El reporte es FUNCIÓN PURA de `(run_id, score_version, report_version,
 *    recommendation_pack_version)`: recomputar produce el mismo reporte
 *    (determinismo, sin LLM en el score ni en los gaps; el copy es plantilla).
 *  - `null ≠ 0`: una dimensión sin evidencia es `status='empty'`/`severity='sin_dato'`
 *    (excluida del promedio), NUNCA `score: 0`. El 0 medido es un gap real.
 *  - El DTO público (`PublicGraderReport`) es un TIPO DISTINTO que estructuralmente
 *    NO puede cargar raw provider text, prompts ni evidencia cruda (defensa capa A).
 *  - Los gates (`insufficient_data`/`review_required`/`partial`) se propagan con
 *    razón + próxima acción renderizables, sin precisión falsa ni auto-release.
 */

import { type AccuracyConfidence, type AccuracyFindingKind } from '../accuracy/contracts'
import { type GrowthAiVisibilityProviderId } from '../contracts'
import { type ProbeAxis, type ProbeKind } from '../probes/contracts'
import { type ScoreDimensionKey } from '../scoring/config'
import { type CategoryTaxonomyLevel, type CategoryTaxonomyVersion } from '../taxonomy'

export const GROWTH_AI_VISIBILITY_REPORT_VERSION = 'ai_visibility_report_v1' as const
export const GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION = 'ai_visibility_recommendation_pack_v1' as const

export type GraderReportVersion = typeof GROWTH_AI_VISIBILITY_REPORT_VERSION
export type RecommendationPackVersion = typeof GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION

// ── Audience + gate ──────────────────────────────────────────────────────────

/** Audiencias del §7.7 (niveles de disclosure progresivo). V1 materializa internal_sales + public. */
export const GRADER_REPORT_AUDIENCES = ['public', 'internal_sales', 'client', 'executive'] as const
export type GraderReportAudience = (typeof GRADER_REPORT_AUDIENCES)[number]

/**
 * Estado del reporte (gate). Hereda del score (`insufficient_data`/`review_required`)
 * y del run (`partial`); `ready` sólo cuando hay cobertura suficiente y sin riesgo.
 */
export const GRADER_REPORT_GATE_STATUSES = ['ready', 'insufficient_data', 'review_required', 'partial'] as const
export type GraderReportGateStatus = (typeof GRADER_REPORT_GATE_STATUSES)[number]

/** Gate renderizable (state-design P-3): razón + próxima acción, no sólo un enum. */
export interface GraderReportGate {
  status: GraderReportGateStatus
  reason: string
  nextAction: string
}

// ── Severity (valor nombrado, NUNCA un color) ────────────────────────────────

export const GRADER_REPORT_SEVERITIES = ['critico', 'atencion', 'optimo', 'sin_dato'] as const
export type GraderReportSeverity = (typeof GRADER_REPORT_SEVERITIES)[number]

/** Estado por dimensión (patrón `SourceResult<T>`): ok = medido; empty = sin evidencia. */
export const GRADER_REPORT_DIMENSION_STATUSES = ['ok', 'empty'] as const
export type GraderReportDimensionStatus = (typeof GRADER_REPORT_DIMENSION_STATUSES)[number]

// ── Recommendation engine (§8.4) ─────────────────────────────────────────────

/**
 * Gaps por dimensión driver (§8.4). `ai_visibility` es el RESULTADO compuesto
 * (no genera recomendación propia; es el KPI del headline), explicado por los 6
 * drivers de abajo.
 */
export const RECOMMENDATION_GAP_KEYS = [
  'low_entity_clarity',
  'low_category_ownership',
  'weak_citation_quality',
  'competitors_dominate',
  'message_drift',
  'weak_revenue_intent'
] as const
export type RecommendationGapKey = (typeof RECOMMENDATION_GAP_KEYS)[number]

/** Motion sugerido (alimenta el HubSpot handoff §7.8). */
export const RECOMMENDED_MOTIONS = [
  'entity_foundation',
  'category_authority',
  'digital_pr_citations',
  'competitive_content',
  'message_alignment',
  'bottom_funnel_content'
] as const
export type RecommendedMotion = (typeof RECOMMENDED_MOTIONS)[number]

/** Mapeo canónico dimensión driver → gap → motion (§8.4). */
export interface RecommendationMappingEntry {
  dimensionKey: ScoreDimensionKey
  gapKey: RecommendationGapKey
  motion: RecommendedMotion
}

export interface ReportRecommendation {
  gapKey: RecommendationGapKey
  dimensionKey: ScoreDimensionKey
  title: string
  action: string
  motion: RecommendedMotion
  severity: GraderReportSeverity
  /** Prioridad RICE-ish: peso de la dimensión × tamaño del gap (0..1). Orden desc. */
  priority: number
}

/** Proyección pública de una recomendación (bounded, sin internals de scoring). */
export interface PublicReportRecommendation {
  gapKey: RecommendationGapKey
  dimensionKey: ScoreDimensionKey
  title: string
  action: string
  motion: RecommendedMotion
  severity: GraderReportSeverity
}

// ── Viz-ready dimensions (chart-agnostic, P-2) ───────────────────────────────

export interface ReportDimension {
  key: ScoreDimensionKey
  label: string
  /** Explainer plain-language de 1 línea (a11y cognitiva, P-6). */
  explainer: string
  weight: number
  score: number | null
  max: 100
  status: GraderReportDimensionStatus
  severity: GraderReportSeverity
  /** Razón renderizable cuando la dimensión está vacía (sin evidencia). */
  reason: string | null
  /** Recomendación asociada si la dimensión driver tiene gap; null si óptima/sin dato. */
  recommendation: ReportRecommendation | null
}

/** Dimensión pública: estructuralmente sin reasons internos ni recomendación cruda. */
export interface PublicReportDimension {
  key: ScoreDimensionKey
  label: string
  explainer: string
  score: number | null
  max: 100
  status: GraderReportDimensionStatus
  severity: GraderReportSeverity
}

// ── Narrative (answer-first, P-4/P-5) ────────────────────────────────────────

/** Headline con forma de KPI (métrica + valor + frame), factual no alarmista. */
export interface ReportHeadline {
  dimensionKey: ScoreDimensionKey
  metric: string
  /** Valor textual del KPI (ej. "0/100"); null si no hay evidencia. */
  value: string | null
  frame: string
  severity: GraderReportSeverity
}

/** Finding narrativo: severidad nombrada + métrica + contexto + acción (nunca número suelto). */
export interface ReportFinding {
  key: string
  severity: GraderReportSeverity
  text: string
}

// ── Comparables + metadata ───────────────────────────────────────────────────

export interface CompetitorPresence {
  name: string
  mentions: number
}

/** Share of voice como lista comparable (marca + competidores), NO pie. */
export interface CompetitiveShareOfVoice {
  brandMentions: number
  competitors: CompetitorPresence[]
}

export interface SourceTypeCount {
  sourceType: string
  count: number
}

/** Presencia por motor (OQ#3) — INTERNAL ONLY: nunca viaja al DTO público. */
export interface ProviderPresence {
  provider: string
  resolved: number
  present: number
}

/**
 * Hallazgo de exactitud de marca para el reporte (TASK-1238) — INTERNAL ONLY.
 * Exponer "la IA se equivoca sobre ti" al público es delicado (difamación/YMYL): la
 * señal pública es el gate `review_required`, no el detalle. `detail` = razón interna.
 */
export interface ReportAccuracyFinding {
  kind: AccuracyFindingKind
  confidence: AccuracyConfidence
  evidenceCount: number
  label: string
  detail: string
}

/** Procedencia: orienta + sostiene el disclaimer (P-4). */
export interface ReportProvenance {
  asOfDate: string | null
  promptPackVersion: string
  scoreVersion: string
  providersSampled: string[]
  promptCount: number
}

// ── Signal enrichment (TASK-1237) ────────────────────────────────────────────

/**
 * Citation share del sitio propio: % de respuestas con citas que citan el dominio
 * del sujeto (distinto de la calidad de fuente por tipo). `ownDomainShare` null si
 * no hay respuestas con citas evaluables (sin dato ≠ 0). Solo %/conteos — NUNCA
 * expone los dominios crudos.
 */
export interface CitationInsight {
  ownDomainShare: number | null
  findingsWithCitations: number
  findingsCitingOwnDomain: number
}

/** Saldo nombrado del sentimiento sobre la marca sujeto (NUNCA un color). */
export const SENTIMENT_NET_VALUES = ['positivo', 'neutral', 'negativo', 'mixto', 'sin_dato'] as const
export type SentimentNet = (typeof SENTIMENT_NET_VALUES)[number]

/** Resumen de sentimiento (conteos por etiqueta evaluada + saldo). Factual, sin difamación. */
export interface SentimentSummary {
  positive: number
  neutral: number
  negative: number
  mixed: number
  /** Total de respuestas con sentimiento resuelto (excluye `unknown`). */
  evaluated: number
  net: SentimentNet
}

/** Posición/prominencia de la marca en las respuestas (rank más bajo = más prominente). */
export interface PositionSummary {
  /** Mejor posición observada (mínimo `brandRank`); null si nunca se resolvió rank. */
  best: number | null
  /** Posición promedio (redondeada); null si no hay rank. */
  average: number | null
  /** Cantidad de respuestas con `brandRank` resuelto. */
  ranked: number
}

// ── Governed category taxonomy summary (TASK-1272) ──────────────────────────

export const CATEGORY_TAXONOMY_SUMMARY_STATUSES = ['mapped', 'unknown', 'needs_review'] as const
export type CategoryTaxonomySummaryStatus = (typeof CATEGORY_TAXONOMY_SUMMARY_STATUSES)[number]

/** Categoria agregada public-safe: ID canonico + labels, sin raw candidate text. */
export interface ReportCategoryAssociation {
  nodeId: string
  level: CategoryTaxonomyLevel
  label: { es: string; en: string }
  count: number
  taxonomyVersion: CategoryTaxonomyVersion
}

/** Resumen por taxonomia gobernada. `unmappedCount` no expone los strings crudos. */
export interface CategoryTaxonomySummary {
  taxonomyVersion: CategoryTaxonomyVersion
  status: CategoryTaxonomySummaryStatus
  categories: ReportCategoryAssociation[]
  totalSignals: number
  unmappedCount: number
  ambiguousCount: number
}

// ── Citation source domain breakdown (TASK-1268) ────────────────────────────

export const CITATION_SOURCE_CLASSIFICATIONS = ['own_domain', 'competitor', 'third_party', 'ugc'] as const
export type CitationSourceClassification = (typeof CITATION_SOURCE_CLASSIFICATIONS)[number]

export const CITATION_SOURCE_BREAKDOWN_REASONS = ['sin_citas_evaluables'] as const
export type CitationSourceBreakdownReason = (typeof CITATION_SOURCE_BREAKDOWN_REASONS)[number]

/** Dominio agregado public-safe: sin URL/path/title/raw text. */
export interface CitationSourceDomain {
  domain: string
  count: number
  engines: GrowthAiVisibilityProviderId[]
  classification: CitationSourceClassification
}

/** Top-N acotado de dominios que alimentan las respuestas del run. */
export interface CitationSourceBreakdown {
  domains: CitationSourceDomain[]
  totalCitations: number
  uniqueDomains: number
  reason: CitationSourceBreakdownReason | null
}

// ── Temporal trend (TASK-1236) ───────────────────────────────────────────────

/**
 * Estado de la tendencia run-over-run. `sin_historico` = no hay run previo;
 * `incomparable` = el run previo usó otra versión de prompt-pack/score (no se
 * computa delta falso); `con_tendencia` = delta computado vs run previo comparable.
 */
export const GRADER_REPORT_TREND_STATUSES = ['sin_historico', 'incomparable', 'con_tendencia'] as const
export type GraderReportTrendStatus = (typeof GRADER_REPORT_TREND_STATUSES)[number]

/** Dirección nombrada del delta (NUNCA un color). `sin_dato` = delta null (sin evidencia comparable). */
export const TREND_DIRECTIONS = ['subio', 'bajo', 'sin_cambio', 'sin_dato'] as const
export type TrendDirection = (typeof TREND_DIRECTIONS)[number]

export interface TrendDelta {
  current: number | null
  previous: number | null
  /** current - previous; null si cualquiera de los dos extremos es null (sin dato). */
  delta: number | null
  direction: TrendDirection
}

export interface DimensionTrend extends TrendDelta {
  key: ScoreDimensionKey
}

/**
 * Bloque de tendencia del reporte. `overall`/`dimensions` solo se pueblan en
 * `con_tendencia` (sin run previo comparable → null/[], sin delta fabricado).
 */
export interface ReportTrend {
  status: GraderReportTrendStatus
  reason: string
  /** Fecha (finishedAt) del run previo comparable; null si no hay. */
  previousAsOf: string | null
  overall: TrendDelta | null
  dimensions: DimensionTrend[]
}

// ── Readiness técnica (TASK-1266) — ejes ORTOGONALES al de percepción ─────────

/**
 * Readiness técnica del sitio analizado: dos ejes ORTOGONALES entre sí y al score de
 * percepción (`ai_visibility_score_v1`), reportados LADO A LADO, NUNCA fusionados al overall
 * de percepción. `structural` = "¿por qué no te citan?"; `agentic` = "¿te pueden usar los
 * agentes?". Cada dimensión = un probe kind. `null ≠ 0`: dimensión sin evidencia medible →
 * `status='empty'`/`severity='sin_dato'`, excluida del promedio del eje (NUNCA score 0).
 */
export interface ReportReadinessDimension {
  key: ProbeKind
  label: string
  weight: number
  score: number | null
  max: 100
  status: GraderReportDimensionStatus
  severity: GraderReportSeverity
  /** Razón renderizable (interna): qué se midió o por qué quedó sin medir. */
  reason: string | null
}

export interface ReportReadinessAxis {
  axis: ProbeAxis
  /** Promedio ponderado de las dimensiones medidas del eje; null si ninguna se midió. */
  overallScore: number | null
  severity: GraderReportSeverity
  dimensions: ReportReadinessDimension[]
  coverage: { probed: number; measured: number }
}

/** Bloque de readiness del reporte INTERNO (incluye `reason` por dimensión). */
export interface ReportReadiness {
  scoreVersion: string
  structural: ReportReadinessAxis
  agentic: ReportReadinessAxis
}

/** Dimensión de readiness pública: estructuralmente sin `reason` interno (mirror de PublicReportDimension). */
export interface PublicReportReadinessDimension {
  key: ProbeKind
  label: string
  score: number | null
  max: 100
  status: GraderReportDimensionStatus
  severity: GraderReportSeverity
}

export interface PublicReportReadinessAxis {
  axis: ProbeAxis
  overallScore: number | null
  severity: GraderReportSeverity
  dimensions: PublicReportReadinessDimension[]
  coverage: { probed: number; measured: number }
}

/** Bloque de readiness público/cliente (sin reasons internos; sólo scores + severidad + cobertura). */
export interface PublicReportReadiness {
  scoreVersion: string
  structural: PublicReportReadinessAxis
  agentic: PublicReportReadinessAxis
}

// ── Aggregates ───────────────────────────────────────────────────────────────

/** Reporte INTERNO completo (admin/sales). Incluye recomendaciones + presencia por motor. */
export interface GraderReport {
  reportVersion: GraderReportVersion
  recommendationPackVersion: RecommendationPackVersion
  scoreVersion: string
  runId: string
  audience: GraderReportAudience
  gate: GraderReportGate
  headline: ReportHeadline
  overallScore: number | null
  overallSeverity: GraderReportSeverity
  findings: ReportFinding[]
  dimensions: ReportDimension[]
  recommendations: ReportRecommendation[]
  primaryGap: ReportRecommendation | null
  recommendedMotion: RecommendedMotion | null
  competitiveSov: CompetitiveShareOfVoice
  sourceTypeSummary: SourceTypeCount[]
  providerPresence: ProviderPresence[]
  /** Hallazgos narrativos por motor (TASK-1237) — INTERNAL ONLY; no viaja al público. */
  providerFindings: ReportFinding[]
  /** Hallazgos de exactitud de marca (TASK-1238) — INTERNAL ONLY; la señal pública es el gate. */
  accuracyFindings: ReportAccuracyFinding[]
  citationInsight: CitationInsight
  citationSourceBreakdown: CitationSourceBreakdown
  categoryTaxonomySummary: CategoryTaxonomySummary
  sentimentSummary: SentimentSummary
  positionSummary: PositionSummary
  trend: ReportTrend
  /** TASK-1266 — readiness técnica (structural + agentic), LADO A LADO del de percepción; null si no se probó. */
  readiness: ReportReadiness | null
  provenance: ReportProvenance
  disclaimer: string
}

/**
 * TASK-1243 — Reporte CLIENTE (3.er consumer de la parity). TIPO DISTINTO, leak-safe por
 * construcción: como `PublicGraderReport` (sin campos para raw provider text, `providerFindings`,
 * `accuracyFindings`, reasons internos de dimensión ni `priority` de recomendación; SÍ lleva
 * `providerPresence` = conteos de visibilidad por canal, TASK-1252), PERO entre el público y el
 * interno — las recomendaciones NO se acotan a 3 (el cliente autenticado ve el set completo
 * accionable). El builder proyecta sólo campos seguros (capa B) + leak test (capa C). Lo consume el portal cliente vía su BFF.
 */
export interface ClientGraderReport {
  reportVersion: GraderReportVersion
  recommendationPackVersion: RecommendationPackVersion
  audience: 'client'
  gate: GraderReportGate
  headline: ReportHeadline
  overallScore: number | null
  overallSeverity: GraderReportSeverity
  findings: ReportFinding[]
  dimensions: PublicReportDimension[]
  /** Set COMPLETO de recomendaciones (sin el cap público de 3), sin `priority` interno. */
  recommendations: PublicReportRecommendation[]
  primaryGap: PublicPrimaryGap | null
  recommendedMotion: RecommendedMotion | null
  competitiveSov: CompetitiveShareOfVoice
  sourceTypeSummary: SourceTypeCount[]
  // TASK-1252 — presencia por motor (conteos), igual que el público: la visibilidad propia
  // por canal SÍ se muestra. `providerFindings` (narrativa cruda) sigue internal-only.
  providerPresence: ProviderPresence[]
  citationInsight: CitationInsight
  citationSourceBreakdown: CitationSourceBreakdown
  categoryTaxonomySummary: CategoryTaxonomySummary
  sentimentSummary: SentimentSummary
  positionSummary: PositionSummary
  trend: ReportTrend
  /** TASK-1266 — readiness técnica pública (sin reasons internos); null si no se probó. */
  readiness: PublicReportReadiness | null
  provenance: ReportProvenance
  disclaimer: string
}

/** Proyección pública del primaryGap (sin action interna, sólo scent + título). */
export interface PublicPrimaryGap {
  gapKey: RecommendationGapKey
  dimensionKey: ScoreDimensionKey
  title: string
  severity: GraderReportSeverity
}

/**
 * Reporte PÚBLICO (lead magnet). TIPO DISTINTO que estructuralmente NO tiene campos
 * para raw provider text, prompts, citation URLs, reasons internos ni la NARRATIVA cruda
 * por motor (`providerFindings`). SÍ lleva `providerPresence` (conteos de visibilidad
 * propia por canal, TASK-1252). El builder sólo lee campos seguros (capa B) + leak test (capa C).
 */
export interface PublicGraderReport {
  reportVersion: GraderReportVersion
  recommendationPackVersion: RecommendationPackVersion
  audience: 'public'
  gate: GraderReportGate
  headline: ReportHeadline
  overallScore: number | null
  overallSeverity: GraderReportSeverity
  findings: ReportFinding[]
  dimensions: PublicReportDimension[]
  recommendations: PublicReportRecommendation[]
  primaryGap: PublicPrimaryGap | null
  recommendedMotion: RecommendedMotion | null
  competitiveSov: CompetitiveShareOfVoice
  sourceTypeSummary: SourceTypeCount[]
  // TASK-1252 — presencia por motor (CONTEOS resolved/present). Es la visibilidad propia
  // de la marca por canal (headline del lead magnet "Visibilidad por motor"), público-safe.
  // `providerFindings` (la NARRATIVA cruda por motor) sigue siendo internal-only y NO va aquí.
  providerPresence: ProviderPresence[]
  // TASK-1237 — agregados seguros (%/conteos).
  citationInsight: CitationInsight
  citationSourceBreakdown: CitationSourceBreakdown
  categoryTaxonomySummary: CategoryTaxonomySummary
  sentimentSummary: SentimentSummary
  positionSummary: PositionSummary
  trend: ReportTrend
  /** TASK-1266 — readiness técnica pública (sin reasons internos); null si no se probó. */
  readiness: PublicReportReadiness | null
  provenance: ReportProvenance
  disclaimer: string
}
