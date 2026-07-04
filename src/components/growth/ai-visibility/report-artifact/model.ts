/**
 * TASK-1252 — AI Visibility Report Artifact · Report MODEL (Slice A).
 *
 * SoT REUSABLE del informe (arch §7.7 + Full API Parity): orden de secciones,
 * mapeo de campos del DTO, disclosure matrix por variant y mapeo de las 7
 * dimensiones canónicas a los 5 niveles del framework Efeonce (Delta 2026-06-27).
 * El RENDER es un adapter por target (web React/MUI, print/PDF); este módulo es
 * PURO (sin IO, sin JSX) y lo comparten todos los adapters/consumers.
 *
 * Invariantes (heredados del contrato TASK-1235, defensa en profundidad):
 *  - Cada variant consume el DTO leak-safe de su audiencia: `publicWeb`/`attachment`
 *    → `PublicGraderReport`; `clientPortal` → `ClientGraderReport`; `adminPreview`
 *    → `GraderReport` (interno). Los tipos ya bloquean el leak por construcción.
 *  - `null ≠ 0`: una dimensión/eje sin evidencia es `sin_dato`, NUNCA 0.
 *  - `engineSnapshot` = presencia por motor (CONTEOS) de la marca evaluada, con logo +
 *    nombre por motor → PÚBLICO-SAFE (el headline del lead magnet), se muestra en todas
 *    las variants. Lo único internal-only es `providerFindings` (la NARRATIVA cruda por
 *    motor), que NUNCA entra al modelo público/cliente.
 *  - Dos ejes ortogonales: percepción (¿te mencionan?) y operabilidad agéntica
 *    (¿te pueden usar?). NUNCA se fusionan en un número único.
 */

import {
  SCORE_DIMENSION_CONFIG_BY_KEY,
  type ScoreDimensionKey
} from '@/lib/growth/ai-visibility/scoring/config'
import type {
  CategoryTaxonomySummary,
  ClientGraderReport,
  CompetitiveShareOfVoice,
  CitationInsight,
  CitationSourceBreakdown,
  GraderReport,
  GraderReportAudience,
  GraderReportGate,
  GraderReportSeverity,
  PositionSummary,
  ProviderPresence,
  PublicReportViewFacts,
  PublicGraderReport,
  PublicPrimaryGap,
  PublicReportDimension,
  PublicReportReadiness,
  PublicReportRecommendation,
  RecommendedMotion,
  ReportHeadline,
  ReportProvenance,
  ReportTrend,
  SentimentSummary,
  SourceTypeCount
} from '@/lib/growth/ai-visibility/report/contracts'
import {
  buildPublicReportViewFacts,
  type PublicReportViewFactOptions
} from '@/lib/growth/ai-visibility/report/view-facts'

// ── Variants + audiences ──────────────────────────────────────────────────────

export const REPORT_ARTIFACT_VARIANTS = ['publicWeb', 'clientPortal', 'attachment', 'adminPreview'] as const
export type ReportArtifactVariant = (typeof REPORT_ARTIFACT_VARIANTS)[number]

/** Render target del variant: web (React/MUI, charts vivos) vs print (PDF/HTML estático). */
export type ReportRenderTarget = 'web' | 'print'

export const REPORT_VARIANT_TARGET: Record<ReportArtifactVariant, ReportRenderTarget> = {
  publicWeb: 'web',
  clientPortal: 'web',
  adminPreview: 'web',
  attachment: 'print'
}

/** Audiencia del DTO que alimenta cada variant (leak boundary). */
export const REPORT_VARIANT_AUDIENCE: Record<ReportArtifactVariant, GraderReportAudience> = {
  publicWeb: 'public',
  attachment: 'public',
  clientPortal: 'client',
  adminPreview: 'internal_sales'
}

// ── 5-level framework (Delta 2026-06-27) ──────────────────────────────────────

export const REPORT_LEVEL_IDS = ['found', 'readable', 'correct', 'actionable', 'intrinsic'] as const
export type ReportLevelId = (typeof REPORT_LEVEL_IDS)[number]

/** Eje del nivel: percepción (¿te mencionan?) vs operabilidad agéntica (¿te pueden usar?). */
export type ReportLevelAxis = 'perception' | 'agentic'

export const REPORT_LEVEL_AXIS: Record<ReportLevelId, ReportLevelAxis> = {
  found: 'perception',
  readable: 'perception',
  correct: 'perception',
  actionable: 'agentic',
  intrinsic: 'perception'
}

/**
 * Mapeo canónico nivel → dimensiones del grader que lo explican (Delta 2026-06-27:
 * "las 7 dimensiones mapeadas debajo de cada nivel"). `actionable` pertenece al
 * eje agéntico y espera los readiness probes de TASK-1266; por eso queda en cobertura
 * hasta recibir métricas propias, nunca mezclado dentro del score de percepción.
 */
export const REPORT_LEVEL_DIMENSIONS: Record<ReportLevelId, ScoreDimensionKey[]> = {
  found: ['ai_visibility'],
  readable: ['entity_clarity', 'category_ownership', 'citation_quality'],
  correct: ['message_alignment'],
  actionable: [],
  intrinsic: ['competitive_sov', 'revenue_intent_coverage']
}

/** Mapeo inverso para que los adapters agrupen la explicación técnica bajo el framework público. */
export const REPORT_DIMENSION_LEVEL: Record<ScoreDimensionKey, ReportLevelId> = {
  ai_visibility: 'found',
  entity_clarity: 'readable',
  category_ownership: 'readable',
  citation_quality: 'readable',
  message_alignment: 'correct',
  competitive_sov: 'intrinsic',
  revenue_intent_coverage: 'intrinsic'
}

// ── Sections + disclosure matrix ──────────────────────────────────────────────

export const REPORT_SECTION_IDS = [
  'verdict',
  'levels',
  'dimensions',
  'primaryGap',
  'aeoSignals',
  'competitiveSov',
  'trend',
  'recommendations',
  'engineSnapshot',
  'provenance',
  'disclaimer'
] as const
export type ReportArtifactSectionId = (typeof REPORT_SECTION_IDS)[number]

/**
 * Disclosure matrix: qué secciones se muestran por variant, en orden de lectura
 * editorial. `engineSnapshot` = presencia por motor (CONTEOS) de la marca evaluada,
 * con logo + nombre por motor → es público-safe (el headline del lead magnet) y se
 * muestra en TODAS las variants. Lo único internal-only es `providerFindings` (la
 * narrativa cruda por motor), que NUNCA entra al modelo público/cliente.
 */
export const REPORT_SECTION_VISIBILITY: Record<ReportArtifactVariant, ReportArtifactSectionId[]> = {
  publicWeb: [
    'verdict',
    'levels',
    'engineSnapshot',
    'primaryGap',
    'dimensions',
    'aeoSignals',
    'competitiveSov',
    'trend',
    'recommendations',
    'provenance',
    'disclaimer'
  ],
  clientPortal: [
    'verdict',
    'levels',
    'engineSnapshot',
    'primaryGap',
    'dimensions',
    'aeoSignals',
    'competitiveSov',
    'trend',
    'recommendations',
    'provenance',
    'disclaimer'
  ],
  attachment: [
    'verdict',
    'levels',
    'engineSnapshot',
    'primaryGap',
    'dimensions',
    'aeoSignals',
    'competitiveSov',
    'recommendations',
    'provenance',
    'disclaimer'
  ],
  adminPreview: [
    'verdict',
    'levels',
    'primaryGap',
    'dimensions',
    'aeoSignals',
    'competitiveSov',
    'trend',
    'engineSnapshot',
    'recommendations',
    'provenance',
    'disclaimer'
  ]
}

export const reportSectionVisible = (variant: ReportArtifactVariant, section: ReportArtifactSectionId): boolean =>
  REPORT_SECTION_VISIBILITY[variant].includes(section)

// ── Severity tone (named → semantic token role; never color-only) ─────────────

export type ReportSeverityTone = 'success' | 'warning' | 'error' | 'neutral'

export const REPORT_SEVERITY_TONE: Record<GraderReportSeverity, ReportSeverityTone> = {
  optimo: 'success',
  atencion: 'warning',
  critico: 'error',
  sin_dato: 'neutral'
}

// ── Normalized model the render adapters consume ──────────────────────────────

export interface ReportArtifactLevel {
  id: ReportLevelId
  axis: ReportLevelAxis
  /** Score agregado (promedio ponderado de sus dimensiones medidas); null = en cobertura. */
  score: number | null
  severity: GraderReportSeverity
  /** `measured` = tiene ≥1 dimensión con evidencia; `coverage` = aún sin medición. */
  status: 'measured' | 'coverage'
  dimensionKeys: ScoreDimensionKey[]
  /** Primer nivel no óptimo; server-derived para que el render no decida el "empieza aquí". */
  isNext: boolean
}

/**
 * Modelo normalizado del informe — superset que los adapters de render consumen.
 * El modelo público se alimenta de DTOs public-safe; `engineSnapshot` son conteos
 * por motor y es público-safe. La narrativa cruda de providers no entra a este modelo.
 */
export interface ReportArtifactModel {
  variant: ReportArtifactVariant
  audience: GraderReportAudience
  renderTarget: ReportRenderTarget
  gate: GraderReportGate
  headline: ReportHeadline
  overallScore: number | null
  overallSeverity: GraderReportSeverity
  /** Eje percepción: promedio ponderado de las dimensiones de los niveles de percepción medidos. */
  perceptionAxisScore: number | null
  /** Eje operabilidad agéntica: null si no hubo probes/readiness; nunca fabricado ni mezclado. */
  agenticAxisScore: number | null
  levels: ReportArtifactLevel[]
  dimensions: PublicReportDimension[]
  primaryGap: PublicPrimaryGap | null
  recommendations: PublicReportRecommendation[]
  recommendedMotion: RecommendedMotion | null
  competitiveSov: CompetitiveShareOfVoice
  sourceTypeSummary: SourceTypeCount[]
  citationInsight: CitationInsight
  citationSourceBreakdown: CitationSourceBreakdown
  categoryTaxonomySummary: CategoryTaxonomySummary
  sentimentSummary: SentimentSummary
  positionSummary: PositionSummary
  trend: ReportTrend
  readiness: PublicReportReadiness | null
  provenance: ReportProvenance
  disclaimer: string
  /** Presencia por motor (conteos) de la marca evaluada — público-safe, con logo + nombre. */
  engineSnapshot?: ProviderPresence[]
  /** Facts render-ready public-safe; Greenhouse los deriva, consumers sólo pintan. */
  viewFacts: PublicReportViewFacts
}

// ── Derivations ───────────────────────────────────────────────────────────────

const severityFromScore = (score: number | null): GraderReportSeverity => {
  if (score === null) return 'sin_dato'
  if (score >= 70) return 'optimo'
  if (score >= 45) return 'atencion'
  
return 'critico'
}

/** Promedio ponderado (por peso de dimensión) de las dimensiones medidas dadas; null si ninguna mide. */
const weightedAverage = (
  dimensions: PublicReportDimension[],
  keys: ScoreDimensionKey[]
): number | null => {
  let weightSum = 0
  let scoreSum = 0

  for (const dim of dimensions) {
    if (!keys.includes(dim.key) || dim.score === null) continue
    const weight = SCORE_DIMENSION_CONFIG_BY_KEY[dim.key]?.weight ?? 0

    weightSum += weight
    scoreSum += dim.score * weight
  }

  if (weightSum === 0) return null

  return Math.round(scoreSum / weightSum)
}

const buildLevels = (
  dimensions: PublicReportDimension[],
  readiness: PublicReportReadiness | null
): ReportArtifactLevel[] => {
  const levels: ReportArtifactLevel[] = REPORT_LEVEL_IDS.map(id => {
    const dimensionKeys = REPORT_LEVEL_DIMENSIONS[id]

    const score =
      id === 'actionable'
        ? readiness?.agentic.overallScore ?? null
        : weightedAverage(dimensions, dimensionKeys)

    return {
      id,
      axis: REPORT_LEVEL_AXIS[id],
      score,
      severity: severityFromScore(score),
      status: score === null ? 'coverage' : 'measured',
      dimensionKeys,
      isNext: false
    }
  })

  const nextIndex = levels.findIndex(level => level.severity !== 'optimo')

  return levels.map((level, index) => ({ ...level, isNext: index === nextIndex }))
}

const perceptionAxisScore = (dimensions: PublicReportDimension[]): number | null => {
  const perceptionKeys = REPORT_LEVEL_IDS.filter(id => REPORT_LEVEL_AXIS[id] === 'perception').flatMap(
    id => REPORT_LEVEL_DIMENSIONS[id]
  )

  
return weightedAverage(dimensions, perceptionKeys)
}

// ── Adapters DTO → model ──────────────────────────────────────────────────────

const baseModel = (
  report: PublicGraderReport | ClientGraderReport,
  variant: ReportArtifactVariant,
  viewFactOptions: PublicReportViewFactOptions = {}
): ReportArtifactModel => ({
  variant,
  audience: report.audience,
  renderTarget: REPORT_VARIANT_TARGET[variant],
  gate: report.gate,
  headline: report.headline,
  overallScore: report.overallScore,
  overallSeverity: report.overallSeverity,
  perceptionAxisScore: perceptionAxisScore(report.dimensions),
  agenticAxisScore: report.readiness?.agentic.overallScore ?? null,
  levels: buildLevels(report.dimensions, report.readiness),
  dimensions: report.dimensions,
  primaryGap: report.primaryGap,
  recommendations: report.recommendations,
  recommendedMotion: report.recommendedMotion,
  competitiveSov: report.competitiveSov,
  sourceTypeSummary: report.sourceTypeSummary,
  citationInsight: report.citationInsight,
  citationSourceBreakdown: report.citationSourceBreakdown,
  categoryTaxonomySummary: report.categoryTaxonomySummary,
  sentimentSummary: report.sentimentSummary,
  positionSummary: report.positionSummary,
  trend: report.trend,
  readiness: report.readiness,
  provenance: report.provenance,
  disclaimer: report.disclaimer,
  // TASK-1252 — presencia por motor (conteos) de la marca evaluada. Público-safe: es la
  // visibilidad del sujeto por canal (el valor del lead magnet), con logo + nombre por motor.
  engineSnapshot: report.providerPresence,
  viewFacts: buildPublicReportViewFacts(report, viewFactOptions)
})

/** publicWeb / attachment ← `PublicGraderReport` (lead magnet, leak-safe por tipo). */
export const modelFromPublicReport = (
  report: PublicGraderReport,
  variant: 'publicWeb' | 'attachment' = 'publicWeb',
  viewFactOptions: PublicReportViewFactOptions = {}
): ReportArtifactModel => baseModel(report, variant, viewFactOptions)

/** clientPortal ← `ClientGraderReport` (set completo de recomendaciones, sin internals de scoring). */
export const modelFromClientReport = (report: ClientGraderReport): ReportArtifactModel =>
  baseModel(report, 'clientPortal')

/** adminPreview ← `GraderReport` (interno): incluye engine snapshot por proveedor. */
export const modelFromInternalReport = (report: GraderReport): ReportArtifactModel => {
  const dimensions: PublicReportDimension[] = report.dimensions.map(dim => ({
    key: dim.key,
    label: dim.label,
    explainer: dim.explainer,
    score: dim.score,
    max: dim.max,
    status: dim.status,
    severity: dim.severity
  }))

  
return {
    variant: 'adminPreview',
    audience: report.audience,
    renderTarget: REPORT_VARIANT_TARGET.adminPreview,
    gate: report.gate,
    headline: report.headline,
    overallScore: report.overallScore,
    overallSeverity: report.overallSeverity,
    perceptionAxisScore: perceptionAxisScore(dimensions),
    agenticAxisScore: report.readiness?.agentic.overallScore ?? null,
    levels: buildLevels(dimensions, report.readiness),
    dimensions,
    primaryGap: report.primaryGap
      ? {
          gapKey: report.primaryGap.gapKey,
          dimensionKey: report.primaryGap.dimensionKey,
          title: report.primaryGap.title,
          severity: report.primaryGap.severity
        }
      : null,
    recommendations: report.recommendations.map(rec => ({
      gapKey: rec.gapKey,
      dimensionKey: rec.dimensionKey,
      title: rec.title,
      action: rec.action,
      motion: rec.motion,
      severity: rec.severity
    })),
    recommendedMotion: report.recommendedMotion,
    competitiveSov: report.competitiveSov,
    sourceTypeSummary: report.sourceTypeSummary,
    citationInsight: report.citationInsight,
    citationSourceBreakdown: report.citationSourceBreakdown,
    categoryTaxonomySummary: report.categoryTaxonomySummary,
    sentimentSummary: report.sentimentSummary,
    positionSummary: report.positionSummary,
    trend: report.trend,
    readiness: report.readiness,
    provenance: report.provenance,
    disclaimer: report.disclaimer,
    engineSnapshot: report.providerPresence,
    viewFacts: buildPublicReportViewFacts(report)
  }
}
