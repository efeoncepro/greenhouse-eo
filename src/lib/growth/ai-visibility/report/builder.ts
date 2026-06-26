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

import { detectBrandInaccuracies, type BrandTruth } from '../accuracy'
import { type GrowthAiVisibilityRunStatus } from '../contracts'
import { type NormalizedFinding } from '../normalization/contracts'
import { SCORE_DIMENSION_CONFIG_BY_KEY, type ScoreDimensionKey } from '../scoring/config'
import { type DimensionScore, type PersistedGraderScore } from '../scoring/engine'
import {
  GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION,
  GROWTH_AI_VISIBILITY_REPORT_VERSION,
  type CitationInsight,
  type ClientGraderReport,
  type CompetitiveShareOfVoice,
  type GraderReport,
  type GraderReportGate,
  type GraderReportGateStatus,
  type PositionSummary,
  type ProviderPresence,
  type PublicGraderReport,
  type ReportAccuracyFinding,
  type ReportDimension,
  type ReportFinding,
  type ReportHeadline,
  type ReportProvenance,
  type ReportRecommendation,
  type SentimentNet,
  type SentimentSummary,
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
  /** Dominio normalizado del sujeto para el citation share propio (TASK-1237); null si el perfil no tiene website. */
  subjectDomain?: string | null
  /** Verdad declarada de la marca para el detector de exactitud (TASK-1238); ausente → sin hallazgos. */
  brandTruth?: BrandTruth | null
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

// ── Signal enrichment (TASK-1237) ────────────────────────────────────────────

const round1Safe = (value: number): number => Math.round(value * 10) / 10

/**
 * Citation share del sitio propio: de las respuestas CON citas, qué fracción cita
 * el dominio del sujeto. `null` (sin dato) si no hay respuestas con citas — NUNCA 0.
 * Solo %/conteos; los dominios crudos no salen del finding.
 */
const buildCitationInsight = (findings: NormalizedFinding[], subjectDomain: string | null): CitationInsight => {
  const withCitations = findings.filter(f => f.citationDomains.length > 0)

  const citingOwn = subjectDomain
    ? withCitations.filter(f => f.citationDomains.includes(subjectDomain)).length
    : 0

  return {
    ownDomainShare: withCitations.length === 0 ? null : round1Safe((citingOwn / withCitations.length) * 100),
    findingsWithCitations: withCitations.length,
    findingsCitingOwnDomain: citingOwn
  }
}

/** Resumen de sentimiento sobre la marca sujeto: conteos por etiqueta + saldo nombrado. */
const buildSentimentSummary = (findings: NormalizedFinding[]): SentimentSummary => {
  const counts = { positive: 0, neutral: 0, negative: 0, mixed: 0 }

  for (const finding of findings) {
    if (finding.sentimentLabel === 'positive') counts.positive += 1
    else if (finding.sentimentLabel === 'neutral') counts.neutral += 1
    else if (finding.sentimentLabel === 'negative') counts.negative += 1
    else if (finding.sentimentLabel === 'mixed') counts.mixed += 1
  }

  const evaluated = counts.positive + counts.neutral + counts.negative + counts.mixed

  return { ...counts, evaluated, net: resolveSentimentNet(counts, evaluated) }
}

const resolveSentimentNet = (
  counts: { positive: number; neutral: number; negative: number; mixed: number },
  evaluated: number
): SentimentNet => {
  if (evaluated === 0) return 'sin_dato'

  const entries: Array<[SentimentNet, number]> = [
    ['positivo', counts.positive],
    ['neutral', counts.neutral],
    ['negativo', counts.negative],
    ['mixto', counts.mixed]
  ]

  const max = Math.max(...entries.map(([, count]) => count))
  const leaders = entries.filter(([, count]) => count === max)

  // Empate entre etiquetas distintas → saldo mixto (no se favorece una arbitrariamente).
  return leaders.length === 1 ? leaders[0][0] : 'mixto'
}

/** Posición/prominencia: mejor (min) + promedio del `brandRank`. `null` honesto si nunca hubo rank. */
const buildPositionSummary = (findings: NormalizedFinding[]): PositionSummary => {
  const ranks = findings.map(f => f.brandRank).filter((rank): rank is number => rank !== null)

  if (ranks.length === 0) {
    return { best: null, average: null, ranked: 0 }
  }

  return {
    best: Math.min(...ranks),
    average: round1Safe(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length),
    ranked: ranks.length
  }
}

/**
 * Hallazgos narrativos por motor (cada motor es un canal distinto) desde la
 * presencia por proveedor. INTERNAL ONLY. Solo motores con respuestas evaluables.
 */
const buildProviderFindings = (presence: ProviderPresence[]): ReportFinding[] =>
  presence
    .filter(entry => entry.resolved > 0)
    .map(entry => {
      const label = GH_GROWTH_AI_VISIBILITY.provider_label[entry.provider as keyof typeof GH_GROWTH_AI_VISIBILITY.provider_label] ?? entry.provider
      const present = entry.present > 0

      return {
        key: `provider:${entry.provider}`,
        severity: present ? resolveSeverity((entry.present / entry.resolved) * 100) : 'critico',
        text: present
          ? GH_GROWTH_AI_VISIBILITY.provider_finding_present(label, entry.present, entry.resolved)
          : GH_GROWTH_AI_VISIBILITY.provider_finding_absent(label, entry.resolved)
      }
    })

/**
 * Hallazgos de exactitud de marca (TASK-1238) para el reporte — INTERNAL ONLY.
 * Mapea el detector puro a una forma con etiqueta es-CL. Sin verdad declarada → [].
 */
const buildAccuracyFindings = (
  findings: NormalizedFinding[],
  brandTruth: BrandTruth | null
): ReportAccuracyFinding[] => {
  if (!brandTruth) return []

  return detectBrandInaccuracies(findings, brandTruth).map(finding => ({
    kind: finding.kind,
    confidence: finding.confidence,
    evidenceCount: finding.evidenceCount,
    label: GH_GROWTH_AI_VISIBILITY.accuracy_kind_label[finding.kind],
    detail: finding.reason
  }))
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
  // TASK-1237 — agregados seguros (%/conteos). `providerFindings` se OMITE (detalle por canal, internal-only).
  citationInsight: report.citationInsight,
  sentimentSummary: report.sentimentSummary,
  positionSummary: report.positionSummary,
  // El trend es agregado puro (deltas numéricos, sin raw text) → public-safe.
  trend: report.trend,
  provenance: report.provenance,
  disclaimer: report.disclaimer
})

/**
 * TASK-1243 — Proyecta el reporte interno al DTO CLIENTE (3.er consumer de la parity).
 * Reusa exactamente las mismas proyecciones leak-safe que el público (dimensiones sin
 * `reason`/`recommendation`, recomendaciones sin `priority`, primaryGap sin `action`, y
 * estructuralmente SIN `providerPresence`/`providerFindings`/`accuracyFindings`), con una
 * sola diferencia: las recomendaciones NO se acotan a 3 (el cliente autenticado ve el set
 * completo accionable). Mismo `buildGraderReport` upstream — sin reimplementación.
 */
export const toClientGraderReport = (report: GraderReport): ClientGraderReport => ({
  reportVersion: report.reportVersion,
  recommendationPackVersion: report.recommendationPackVersion,
  audience: 'client',
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
  // Sin cap (el público acota a PUBLIC_RECOMMENDATIONS_MAX; el cliente ve todas).
  recommendations: report.recommendations.map(toPublicRecommendation),
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
  citationInsight: report.citationInsight,
  sentimentSummary: report.sentimentSummary,
  positionSummary: report.positionSummary,
  trend: report.trend,
  provenance: report.provenance,
  disclaimer: report.disclaimer
})

// ── Builder (internal) ───────────────────────────────────────────────────────

/** Deriva el reporte INTERNO completo. PURO + determinista. */
export const buildGraderReport = (input: BuildGraderReportInput): GraderReport => {
  const { score, findings, run, previous } = input
  const providerPresence = buildProviderPresence(findings)

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
    providerPresence,
    providerFindings: buildProviderFindings(providerPresence),
    accuracyFindings: buildAccuracyFindings(findings, input.brandTruth ?? null),
    citationInsight: buildCitationInsight(findings, input.subjectDomain ?? null),
    sentimentSummary: buildSentimentSummary(findings),
    positionSummary: buildPositionSummary(findings),
    trend: buildReportTrend(score, run.promptPackVersion, previous ?? null),
    provenance: buildProvenance(score, findings, run),
    disclaimer: GH_GROWTH_AI_VISIBILITY.disclaimer
  }
}
