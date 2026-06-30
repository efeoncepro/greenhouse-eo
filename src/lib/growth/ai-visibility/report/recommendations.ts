/**
 * TASK-1235 — Growth AI Visibility · Recommendation engine V1 (Slice 1).
 *
 * Mapeo DETERMINISTA gap→recomendación (arch §8.4). PURO (sin IO, sin LLM): el
 * mismo score produce las mismas recomendaciones. Las 6 dimensiones DRIVER mapean
 * a una acción; `ai_visibility` es el RESULTADO compuesto (sin recomendación
 * propia — es el KPI del headline, explicado por los drivers). Las recomendaciones
 * salen PRIORIZADAS (peso × tamaño del gap, estilo RICE), no como lista plana.
 * El copy es plantilla es-CL (`GH_GROWTH_AI_VISIBILITY`), fundado en `seo-aeo`.
 */

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import { SCORE_DIMENSION_CONFIG_BY_KEY, type ScoreDimensionKey } from '../scoring/config'
import {
  GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION,
  type GraderReportSeverity,
  type PublicReportRecommendation,
  type RecommendationMappingEntry,
  type ReportRecommendation
} from './contracts'

export const RECOMMENDATION_PACK_VERSION = GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION

/** Umbrales de severidad (score 0..100). `sin_dato` se resuelve aparte (score null). */
export const SEVERITY_CRITICAL_BELOW = 40
export const SEVERITY_ATTENTION_BELOW = 70

/** Score bajo el cual una dimensión driver dispara recomendación (gap real). */
export const RECOMMENDATION_GAP_BELOW = SEVERITY_ATTENTION_BELOW

/** Severidad nombrada desde el score (NUNCA un color). null → sin_dato (no es 0). */
export const resolveSeverity = (score: number | null): GraderReportSeverity => {
  if (score === null) return 'sin_dato'
  if (score < SEVERITY_CRITICAL_BELOW) return 'critico'
  if (score < SEVERITY_ATTENTION_BELOW) return 'atencion'

  return 'optimo'
}

/** Mapeo canónico §8.4: las 6 dimensiones driver → gap → motion (HubSpot handoff). */
export const RECOMMENDATION_MAPPING: RecommendationMappingEntry[] = [
  { dimensionKey: 'entity_clarity', gapKey: 'low_entity_clarity', motion: 'entity_foundation' },
  { dimensionKey: 'category_ownership', gapKey: 'low_category_ownership', motion: 'category_authority' },
  { dimensionKey: 'citation_quality', gapKey: 'weak_citation_quality', motion: 'digital_pr_citations' },
  { dimensionKey: 'competitive_sov', gapKey: 'competitors_dominate', motion: 'competitive_content' },
  { dimensionKey: 'message_alignment', gapKey: 'message_drift', motion: 'message_alignment' },
  { dimensionKey: 'revenue_intent_coverage', gapKey: 'weak_revenue_intent', motion: 'bottom_funnel_content' }
]

const MAPPING_BY_DIMENSION = new Map<ScoreDimensionKey, RecommendationMappingEntry>(
  RECOMMENDATION_MAPPING.map(entry => [entry.dimensionKey, entry])
)

/** Prioridad RICE-ish: peso de la dimensión × tamaño normalizado del gap (0..1). */
export const computePriority = (weight: number, score: number): number =>
  Math.round(weight * ((100 - score) / 100) * 100) / 100

export interface ScoredDimensionInput {
  key: ScoreDimensionKey
  score: number | null
  weight: number
}

/**
 * Construye la recomendación de una dimensión driver con gap (score < 70).
 * Devuelve null si: no es driver (`ai_visibility`), sin evidencia (`null`) u óptima.
 */
export const buildRecommendation = (input: ScoredDimensionInput): ReportRecommendation | null => {
  const mapping = MAPPING_BY_DIMENSION.get(input.key)

  if (!mapping || input.score === null || input.score >= RECOMMENDATION_GAP_BELOW) {
    return null
  }

  const copy = GH_GROWTH_AI_VISIBILITY.recommendation[mapping.gapKey]

  return {
    gapKey: mapping.gapKey,
    dimensionKey: mapping.dimensionKey,
    title: copy.title,
    action: copy.action,
    motion: mapping.motion,
    severity: resolveSeverity(input.score),
    priority: computePriority(input.weight, input.score)
  }
}

/**
 * Orden determinista: prioridad desc, luego peso de la dimensión desc, luego
 * dimensionKey asc (tiebreak estable → mismo input produce el mismo orden). El
 * peso es canónico por dimensión (`SCORE_DIMENSION_CONFIG_BY_KEY`).
 */
const compareRecommendations = (a: ReportRecommendation, b: ReportRecommendation): number => {
  if (b.priority !== a.priority) return b.priority - a.priority

  const weightA = SCORE_DIMENSION_CONFIG_BY_KEY[a.dimensionKey].weight
  const weightB = SCORE_DIMENSION_CONFIG_BY_KEY[b.dimensionKey].weight

  if (weightB !== weightA) return weightB - weightA

  return a.dimensionKey.localeCompare(b.dimensionKey)
}

/** Construye + prioriza todas las recomendaciones desde las dimensiones scored. */
export const buildRecommendations = (dimensions: ScoredDimensionInput[]): ReportRecommendation[] =>
  dimensions
    .map(buildRecommendation)
    .filter((recommendation): recommendation is ReportRecommendation => recommendation !== null)
    .sort(compareRecommendations)

/** El gap dominante = la recomendación de mayor prioridad (o null si no hay gaps). */
export const pickPrimaryGap = (recommendations: ReportRecommendation[]): ReportRecommendation | null =>
  recommendations[0] ?? null

/** Proyección pública de una recomendación (sin `priority` interno). */
export const toPublicRecommendation = (recommendation: ReportRecommendation): PublicReportRecommendation => ({
  gapKey: recommendation.gapKey,
  dimensionKey: recommendation.dimensionKey,
  title: recommendation.title,
  action: recommendation.action,
  motion: recommendation.motion,
  severity: recommendation.severity
})
