/**
 * TASK-1227 — Growth AI Visibility · Scoring engine V1 (Slice 3).
 *
 * Scorers PUROS por dimensión + agregación determinista sobre `NormalizedFinding[]`.
 * Recomputar con el mismo `score_version` + mismos findings → mismo score.
 * Honestidad: una dimensión sin evidencia devuelve `score=null` y queda EXCLUIDA
 * del promedio ponderado (no se asume 0 ni 100). El gate de
 * insufficient_data/review_required vive en `review-gates/` (Slice 5).
 */

import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  type GrowthAiVisibilityPromptDefinition
} from '../prompt-packs/prompt-pack-v1'
import { type NormalizedFinding } from '../normalization/contracts'
import {
  AI_VISIBILITY_SCORE_VERSION,
  SCORE_DIMENSION_CONFIG_BY_KEY,
  type GraderScoreStatus,
  type GraderScoreVersion,
  type ScoreDimensionKey
} from './config'

const REVENUE_INTENT_STAGES = new Set(['consideration', 'comparison', 'purchase_intent', 'enterprise', 'local'])
const CREDIBLE_SOURCE_TYPES = new Set(['owned', 'earned', 'news'])

export interface DimensionScore {
  key: ScoreDimensionKey
  label: string
  weight: number
  /** 0..100, o null si no hay evidencia para la dimensión (excluida del promedio). */
  score: number | null
  evidenceCount: number
  confidence: number
  reasons: string[]
}

export interface RawGraderScore {
  scoreVersion: GraderScoreVersion
  runId: string
  /** 0..100 (promedio ponderado de dimensiones con evidencia), o null si ninguna tiene evidencia. */
  overallScore: number | null
  dimensions: DimensionScore[]
  confidence: number
  evidenceCount: number
  coverage: {
    successfulObservations: number
    promptFamilies: number
  }
}

/** Score con el gate de status aplicado (review-gates/, Slice 5) — el shape que se persiste. */
export interface PersistedGraderScore extends RawGraderScore {
  scoreStatus: GraderScoreStatus
  autoReleasable: boolean
  reviewReasons: string[]
}

const round1 = (value: number): number => Math.round(value * 10) / 10

const lookupPrompt = (promptId: string): GrowthAiVisibilityPromptDefinition | undefined =>
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.find(prompt => prompt.id === promptId)

const isDiscovery = (finding: NormalizedFinding): boolean => {
  const prompt = lookupPrompt(finding.promptId)

  return prompt ? !prompt.namesBrand : false
}

const isRevenueIntent = (finding: NormalizedFinding): boolean => {
  const prompt = lookupPrompt(finding.promptId)

  return prompt ? REVENUE_INTENT_STAGES.has(prompt.intentStage) : false
}

const avgConfidence = (findings: NormalizedFinding[]): number =>
  findings.length === 0 ? 0 : round1(findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length)

const emptyDimension = (key: ScoreDimensionKey, reason: string): DimensionScore => {
  const config = SCORE_DIMENSION_CONFIG_BY_KEY[key]

  return { key, label: config.label, weight: config.weight, score: null, evidenceCount: 0, confidence: 0, reasons: [reason] }
}

const dimension = (
  key: ScoreDimensionKey,
  score: number,
  evidenceCount: number,
  confidence: number,
  reasons: string[]
): DimensionScore => {
  const config = SCORE_DIMENSION_CONFIG_BY_KEY[key]

  return { key, label: config.label, weight: config.weight, score: round1(Math.max(0, Math.min(100, score))), evidenceCount, confidence, reasons }
}

// ── Dimension scorers ────────────────────────────────────────────────────────

const scoreAiVisibility = (findings: NormalizedFinding[]): DimensionScore => {
  const discovery = findings.filter(f => isDiscovery(f) && (f.brandMentioned === 'yes' || f.brandMentioned === 'no'))

  if (discovery.length === 0) {
    return emptyDimension('ai_visibility', 'Sin prompts de descubrimiento resueltos.')
  }

  const present = discovery.filter(f => f.brandMentioned === 'yes').length

  return dimension(
    'ai_visibility',
    (present / discovery.length) * 100,
    discovery.length,
    avgConfidence(discovery),
    [`Presente en ${present}/${discovery.length} prompts de descubrimiento.`]
  )
}

const scoreEntityClarity = (findings: NormalizedFinding[]): DimensionScore => {
  const engaged = findings.filter(f => f.brandMentioned === 'yes' || f.brandMentioned === 'ambiguous')

  if (engaged.length === 0) {
    return emptyDimension('entity_clarity', 'La marca no fue mencionada de forma evaluable.')
  }

  const clear = engaged.filter(f => f.brandMentioned === 'yes').length
  const ambiguous = engaged.length - clear

  return dimension(
    'entity_clarity',
    (clear / engaged.length) * 100,
    engaged.length,
    avgConfidence(engaged),
    [`${clear} menciones claras, ${ambiguous} ambiguas (colisión de entidad).`]
  )
}

const scoreCategoryOwnership = (findings: NormalizedFinding[]): DimensionScore => {
  const discovery = findings.filter(f => isDiscovery(f) && (f.brandMentioned === 'yes' || f.brandMentioned === 'no'))

  if (discovery.length === 0) {
    return emptyDimension('category_ownership', 'Sin prompts de descubrimiento de categoría resueltos.')
  }

  // Dueño de categoría = presente en descubrimiento Y asociado a la categoría.
  // Si hay datos de categoría (LLM) se exige asociación explícita; si no, se usa
  // la sola presencia en descubrimiento (determinista, menor señal).
  const present = discovery.filter(f => f.brandMentioned === 'yes').length
  const owns = discovery.filter(f => f.brandMentioned === 'yes' && f.categoryAssociations.length > 0).length
  const hasCategoryData = discovery.some(f => f.categoryAssociations.length > 0)
  const base = hasCategoryData ? owns : present

  return dimension(
    'category_ownership',
    (base / discovery.length) * 100,
    discovery.length,
    avgConfidence(discovery),
    [`Presente en ${present}/${discovery.length} prompts de descubrimiento (con categoría explícita: ${owns}).`]
  )
}

const scoreCompetitiveSov = (findings: NormalizedFinding[]): DimensionScore => {
  const brandMentions = findings.filter(f => f.brandMentioned === 'yes').length
  const competitorMentions = new Set(findings.flatMap(f => f.competitorsMentioned)).size
  const total = brandMentions + competitorMentions

  if (total === 0) {
    return emptyDimension('competitive_sov', 'Sin menciones de marca ni competidores.')
  }

  const relevant = findings.filter(f => f.brandMentioned === 'yes' || f.competitorsMentioned.length > 0)

  return dimension(
    'competitive_sov',
    (brandMentions / total) * 100,
    relevant.length,
    avgConfidence(relevant),
    [`Marca ${brandMentions} vs ${competitorMentions} competidores distintos.`]
  )
}

const scoreCitationQuality = (findings: NormalizedFinding[]): DimensionScore => {
  const withCitations = findings.filter(f => f.citationDomains.length > 0)

  if (withCitations.length === 0) {
    return emptyDimension('citation_quality', 'Sin citations para evaluar calidad.')
  }

  const credible = withCitations.filter(f => f.sourceTypes.some(type => CREDIBLE_SOURCE_TYPES.has(type))).length

  return dimension(
    'citation_quality',
    (credible / withCitations.length) * 100,
    withCitations.length,
    avgConfidence(withCitations),
    [`${credible}/${withCitations.length} observaciones con fuentes creíbles (owned/earned/news).`]
  )
}

const scoreMessageAlignment = (findings: NormalizedFinding[]): DimensionScore => {
  // Alineamiento de mensaje requiere lectura de prosa (drift/sentiment): solo hay
  // evidencia si el hook LLM corrió (drift claims o sentiment resuelto). Sin eso → null.
  const withProse = findings.filter(
    f => (f.brandMentioned === 'yes' || f.brandMentioned === 'ambiguous') && (f.messageDriftClaims.length > 0 || f.sentimentLabel !== 'unknown')
  )

  if (withProse.length === 0) {
    return emptyDimension('message_alignment', 'Sin evidencia de prosa (requiere extracción LLM).')
  }

  const drifted = withProse.filter(f => f.messageDriftClaims.length > 0).length

  return dimension(
    'message_alignment',
    ((withProse.length - drifted) / withProse.length) * 100,
    withProse.length,
    avgConfidence(withProse),
    [`${drifted}/${withProse.length} observaciones con drift de mensaje.`]
  )
}

const scoreRevenueIntentCoverage = (findings: NormalizedFinding[]): DimensionScore => {
  const revenue = findings.filter(f => isRevenueIntent(f) && (f.brandMentioned === 'yes' || f.brandMentioned === 'no'))

  if (revenue.length === 0) {
    return emptyDimension('revenue_intent_coverage', 'Sin prompts de revenue intent resueltos.')
  }

  const present = revenue.filter(f => f.brandMentioned === 'yes').length

  return dimension(
    'revenue_intent_coverage',
    (present / revenue.length) * 100,
    revenue.length,
    avgConfidence(revenue),
    [`Presente en ${present}/${revenue.length} prompts de intención de compra.`]
  )
}

const SCORERS: Array<(findings: NormalizedFinding[]) => DimensionScore> = [
  scoreAiVisibility,
  scoreEntityClarity,
  scoreCategoryOwnership,
  scoreCompetitiveSov,
  scoreCitationQuality,
  scoreMessageAlignment,
  scoreRevenueIntentCoverage
]

/**
 * Computa el score crudo (sin gates de status). Promedio ponderado SOLO sobre
 * dimensiones con evidencia (score != null), renormalizando pesos. PURO.
 * El brand ya viene resuelto en los findings, así que no requiere contexto extra.
 */
export const computeGraderScore = (runId: string, findings: NormalizedFinding[]): RawGraderScore => {
  const dimensions = SCORERS.map(scorer => scorer(findings))
  const scored = dimensions.filter((d): d is DimensionScore & { score: number } => d.score !== null)

  const weightSum = scored.reduce((sum, d) => sum + d.weight, 0)

  const overallScore =
    weightSum === 0 ? null : round1(scored.reduce((sum, d) => sum + d.score * d.weight, 0) / weightSum)

  const confidence =
    weightSum === 0 ? 0 : round1(scored.reduce((sum, d) => sum + d.confidence * d.weight, 0) / weightSum)

  const promptFamilies = new Set(
    findings
      .map(f => GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.find(p => p.id === f.promptId)?.family)
      .filter((family): family is string => Boolean(family))
  ).size

  return {
    scoreVersion: AI_VISIBILITY_SCORE_VERSION,
    runId,
    overallScore,
    dimensions,
    confidence,
    evidenceCount: scored.reduce((sum, d) => sum + d.evidenceCount, 0),
    coverage: {
      successfulObservations: findings.length,
      promptFamilies
    }
  }
}
