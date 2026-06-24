/**
 * TASK-1235 — Growth AI Visibility · Report builder V1 (Slice 2).
 *
 * Deriva el `grader_report` (arch §7.7) desde `grader_score` + `normalized_findings`
 * (TASK-1227) + metadata del run/perfil. PURO (sin IO) → testeable sin PG y
 * recomputable: el mismo input produce el mismo reporte (determinismo).
 *
 * Separa el reporte INTERNO completo (`GraderReport`) del DTO PÚBLICO
 * (`PublicGraderReport`, tipo distinto sin campos para raw text): el builder público
 * sólo lee campos seguros (defensa capa B). Honestidad `null ≠ 0`: dimensión sin
 * evidencia → `status='empty'`, NUNCA `score: 0`. Los gates se propagan con razón.
 */

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import { type GrowthAiVisibilityRunStatus } from '../contracts'
import { type NormalizedFinding } from '../normalization/contracts'
import { SCORE_DIMENSION_CONFIG_BY_KEY, type ScoreDimensionKey } from '../scoring/config'
import { type DimensionScore, type PersistedGraderScore } from '../scoring/engine'
import {
  GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION,
  GROWTH_AI_VISIBILITY_REPORT_VERSION,
  type CompetitiveShareOfVoice,
  type GraderReport,
  type GraderReportGate,
  type GraderReportGateStatus,
  type ProviderPresence,
  type PublicGraderReport,
  type ReportDimension,
  type ReportFinding,
  type ReportHeadline,
  type ReportProvenance,
  type ReportRecommendation,
  type SourceTypeCount
} from './contracts'
import {
  buildRecommendations,
  pickPrimaryGap,
  resolveSeverity,
  toPublicRecommendation
} from './recommendations'
import { buildReportTrend, type PreviousScoreInput } from './trend'

/** Metadata del run necesaria para el reporte (subset de `GraderRunRow`). */
export interface ReportRunMeta {
  runId: string
  status: GrowthAiVisibilityRunStatus
  promptPackVersion: string
  finishedAt: string | null
}

export interface BuildGraderReportInput {
  score: PersistedGraderScore
  findings: NormalizedFinding[]
  run: ReportRunMeta
  /** Run previo comparable para la tendencia (TASK-1236); null/undefined → sin histórico. */
  previous?: PreviousScoreInput | null
}

const FINDINGS_MAX = 5

// ── Gate ─────────────────────────────────────────────────────────────────────

const resolveGateStatus = (
  score: PersistedGraderScore,
  runStatus: GrowthAiVisibilityRunStatus
): GraderReportGateStatus => {
  if (score.scoreStatus === 'insufficient_data') return 'insufficient_data'
  if (score.scoreStatus === 'review_required') return 'review_required'
  if (runStatus === 'partial') return 'partial'

  return 'ready'
}

const buildGate = (status: GraderReportGateStatus): GraderReportGate => ({
  status,
  reason: GH_GROWTH_AI_VISIBILITY.gate[status].reason,
  nextAction: GH_GROWTH_AI_VISIBILITY.gate[status].nextAction
})

// ── Dimensions (viz-ready, SourceResult honesto) ─────────────────────────────

const buildDimension = (dimension: DimensionScore): ReportDimension => {
  const isEmpty = dimension.score === null

  return {
    key: dimension.key,
    label: dimension.label,
    explainer: GH_GROWTH_AI_VISIBILITY.dimension_explainer[dimension.key],
    weight: dimension.weight,
    score: dimension.score,
    max: 100,
    status: isEmpty ? 'empty' : 'ok',
    severity: resolveSeverity(dimension.score),
    reason: isEmpty ? dimension.reasons[0] ?? null : null,
    recommendation: null
  }
}

// ── Headline (KPI dominante = mayor brecha ponderada) ────────────────────────

const pickHeadlineDimension = (dimensions: DimensionScore[]): DimensionScore => {
  const scored = dimensions.filter((d): d is DimensionScore & { score: number } => d.score !== null)

  if (scored.length === 0) {
    // Sin evidencia: el headline usa ai_visibility (resultado) en estado sin_dato.
    return dimensions.find(d => d.key === 'ai_visibility') ?? dimensions[0]
  }

  // Brecha ponderada = weight × (100 - score). Tiebreak: peso desc, luego key asc.
  return [...scored].sort((a, b) => {
    const deficitA = a.weight * (100 - a.score)
    const deficitB = b.weight * (100 - b.score)

    if (deficitB !== deficitA) return deficitB - deficitA
    if (b.weight !== a.weight) return b.weight - a.weight

    return a.key.localeCompare(b.key)
  })[0]
}

const buildHeadline = (dimension: DimensionScore): ReportHeadline => {
  const severity = resolveSeverity(dimension.score)

  return {
    dimensionKey: dimension.key,
    metric: dimension.label,
    value: dimension.score === null ? null : `${dimension.score}/100`,
    frame: GH_GROWTH_AI_VISIBILITY.headline_frame[severity](dimension.label),
    severity
  }
}

// ── Findings (answer-first, "nunca un número sin contexto") ──────────────────

const findingText = (
  severity: ReturnType<typeof resolveSeverity>,
  dimensionLabel: string,
  score: number | null,
  tail: string
): string => {
  const severityLabel = GH_GROWTH_AI_VISIBILITY.severity_label[severity]
  const frame = GH_GROWTH_AI_VISIBILITY.dimension_metric_frame(dimensionLabel, score)

  return `${severityLabel} — ${frame} ${tail}`.trim()
}

const buildFindings = (
  headline: DimensionScore,
  recommendations: ReportRecommendation[],
  scoreByDimension: Map<ScoreDimensionKey, number | null>
): ReportFinding[] => {
  const findings: ReportFinding[] = []

  // 1. Finding headline (siempre). Si la dimensión dominante es un driver con gap,
  //    incluye su acción; si es el resultado (ai_visibility) u óptima, una nota.
  const headlineRec = recommendations.find(r => r.dimensionKey === headline.key)
  const headlineSeverity = resolveSeverity(headline.score)

  const headlineTail = headlineRec
    ? headlineRec.action
    : headlineSeverity === 'optimo'
      ? GH_GROWTH_AI_VISIBILITY.headline_strength_note
      : GH_GROWTH_AI_VISIBILITY.outcome_note

  findings.push({
    key: `headline:${headline.key}`,
    severity: headlineSeverity,
    text: findingText(headlineSeverity, headline.label, headline.score, headlineTail)
  })

  // 2. Gaps priorizados restantes (excluye el ya cubierto por el headline). Cap a 5.
  for (const recommendation of recommendations) {
    if (findings.length >= FINDINGS_MAX) break
    if (recommendation.dimensionKey === headline.key) continue

    const label = SCORE_DIMENSION_CONFIG_BY_KEY[recommendation.dimensionKey].label
    const score = scoreByDimension.get(recommendation.dimensionKey) ?? null

    findings.push({
      key: `gap:${recommendation.gapKey}`,
      severity: recommendation.severity,
      text: findingText(recommendation.severity, label, score, recommendation.action)
    })
  }

  return findings
}

// ── Comparables + presence + provenance ──────────────────────────────────────

const buildCompetitiveSov = (findings: NormalizedFinding[]): CompetitiveShareOfVoice => {
  const brandMentions = findings.filter(f => f.brandMentioned === 'yes').length
  const counts = new Map<string, number>()

  for (const finding of findings) {
    for (const competitor of finding.competitorsMentioned) {
      counts.set(competitor, (counts.get(competitor) ?? 0) + 1)
    }
  }

  const competitors = [...counts.entries()]
    .map(([name, mentions]) => ({ name, mentions }))
    .sort((a, b) => (b.mentions !== a.mentions ? b.mentions - a.mentions : a.name.localeCompare(b.name)))

  return { brandMentions, competitors }
}

const buildSourceTypeSummary = (findings: NormalizedFinding[]): SourceTypeCount[] => {
  const counts = new Map<string, number>()

  for (const finding of findings) {
    for (const sourceType of finding.sourceTypes) {
      counts.set(sourceType, (counts.get(sourceType) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([sourceType, count]) => ({ sourceType, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.sourceType.localeCompare(b.sourceType)))
}

const buildProviderPresence = (findings: NormalizedFinding[]): ProviderPresence[] => {
  const byProvider = new Map<string, { resolved: number; present: number }>()

  for (const finding of findings) {
    const entry = byProvider.get(finding.provider) ?? { resolved: 0, present: 0 }

    if (finding.brandMentioned !== 'unknown') entry.resolved += 1
    if (finding.brandMentioned === 'yes') entry.present += 1

    byProvider.set(finding.provider, entry)
  }

  return [...byProvider.entries()]
    .map(([provider, entry]) => ({ provider, ...entry }))
    .sort((a, b) => a.provider.localeCompare(b.provider))
}

const buildProvenance = (
  score: PersistedGraderScore,
  findings: NormalizedFinding[],
  run: ReportRunMeta
): ReportProvenance => ({
  asOfDate: run.finishedAt,
  promptPackVersion: run.promptPackVersion,
  scoreVersion: score.scoreVersion,
  providersSampled: [...new Set(findings.map(f => f.provider))].sort(),
  promptCount: new Set(findings.map(f => f.promptId)).size
})

// ── Public projection (defensa capa B: sólo campos seguros) ──────────────────

/**
 * Proyecta el reporte interno al DTO público. Estructuralmente NO copia
 * `providerPresence`, reasons internos de dimensión ni el `priority` de las
 * recomendaciones. Las recomendaciones públicas se acotan a las 3 más prioritarias.
 */
export const PUBLIC_RECOMMENDATIONS_MAX = 3

export const toPublicGraderReport = (report: GraderReport): PublicGraderReport => ({
  reportVersion: report.reportVersion,
  recommendationPackVersion: report.recommendationPackVersion,
  audience: 'public',
  gate: report.gate,
  headline: report.headline,
  overallScore: report.overallScore,
  overallSeverity: report.overallSeverity,
  findings: report.findings,
  dimensions: report.dimensions.map(dimension => ({
    key: dimension.key,
    label: dimension.label,
    explainer: dimension.explainer,
    score: dimension.score,
    max: dimension.max,
    status: dimension.status,
    severity: dimension.severity
  })),
  recommendations: report.recommendations.slice(0, PUBLIC_RECOMMENDATIONS_MAX).map(toPublicRecommendation),
  primaryGap: report.primaryGap
    ? {
        gapKey: report.primaryGap.gapKey,
        dimensionKey: report.primaryGap.dimensionKey,
        title: report.primaryGap.title,
        severity: report.primaryGap.severity
      }
    : null,
  recommendedMotion: report.recommendedMotion,
  competitiveSov: report.competitiveSov,
  sourceTypeSummary: report.sourceTypeSummary,
  // El trend es agregado puro (deltas numéricos, sin raw text) → public-safe.
  trend: report.trend,
  provenance: report.provenance,
  disclaimer: report.disclaimer
})

// ── Builder (internal) ───────────────────────────────────────────────────────

/** Deriva el reporte INTERNO completo. PURO + determinista. */
export const buildGraderReport = (input: BuildGraderReportInput): GraderReport => {
  const { score, findings, run, previous } = input

  const gateStatus = resolveGateStatus(score, run.status)
  const scoredInputs = score.dimensions.map(d => ({ key: d.key, score: d.score, weight: d.weight }))
  const recommendations = buildRecommendations(scoredInputs)
  const recommendationByDimension = new Map(recommendations.map(r => [r.dimensionKey, r]))

  const dimensions = score.dimensions.map(dimension => {
    const built = buildDimension(dimension)

    return { ...built, recommendation: recommendationByDimension.get(dimension.key) ?? null }
  })

  const headlineDimension = pickHeadlineDimension(score.dimensions)
  const primaryGap = pickPrimaryGap(recommendations)

  const scoreByDimension = new Map<ScoreDimensionKey, number | null>(
    score.dimensions.map(d => [d.key, d.score])
  )

  return {
    reportVersion: GROWTH_AI_VISIBILITY_REPORT_VERSION,
    recommendationPackVersion: GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION,
    scoreVersion: score.scoreVersion,
    runId: run.runId,
    audience: 'internal_sales',
    gate: buildGate(gateStatus),
    headline: buildHeadline(headlineDimension),
    overallScore: score.overallScore,
    overallSeverity: resolveSeverity(score.overallScore),
    findings: buildFindings(headlineDimension, recommendations, scoreByDimension),
    dimensions,
    recommendations,
    primaryGap,
    recommendedMotion: primaryGap?.motion ?? null,
    competitiveSov: buildCompetitiveSov(findings),
    sourceTypeSummary: buildSourceTypeSummary(findings),
    providerPresence: buildProviderPresence(findings),
    trend: buildReportTrend(score, run.promptPackVersion, previous ?? null),
    provenance: buildProvenance(score, findings, run),
    disclaimer: GH_GROWTH_AI_VISIBILITY.disclaimer
  }
}
