/**
 * TASK-1227 — Growth AI Visibility · Scoring config V1 (Slice 3).
 *
 * Configuración VERSIONADA del score. Los pesos son los del arch V1 (§7.6),
 * tratados como HIPÓTESIS calibrada: el spike TASK-1228 dio escala real (5→0) +
 * golden set para anclarlos pero NO los recalibró. Revisables si la evidencia
 * productiva contradice (ADR `revisit when`). Recomputar con el mismo
 * `score_version` produce el mismo score (determinismo). PURO.
 */

export const AI_VISIBILITY_SCORE_VERSION = 'ai_visibility_score_v1' as const

export type GraderScoreVersion = typeof AI_VISIBILITY_SCORE_VERSION

export const SCORE_DIMENSION_KEYS = [
  'ai_visibility',
  'entity_clarity',
  'category_ownership',
  'competitive_sov',
  'citation_quality',
  'message_alignment',
  'revenue_intent_coverage'
] as const

export type ScoreDimensionKey = (typeof SCORE_DIMENSION_KEYS)[number]

export interface ScoreDimensionConfig {
  key: ScoreDimensionKey
  label: string
  weight: number
  meaning: string
}

/** Pesos arch V1 (suma 100). Hipótesis calibrada — ver Handoff TASK-1227 + calibración §4. */
export const SCORE_DIMENSIONS: ScoreDimensionConfig[] = [
  { key: 'ai_visibility', label: 'AI Visibility', weight: 25, meaning: 'La marca aparece en respuestas de answer engines relevantes.' },
  { key: 'entity_clarity', label: 'Entity Clarity', weight: 15, meaning: 'Los motores entienden quién es la marca, qué vende y para quién.' },
  { key: 'category_ownership', label: 'Category Ownership', weight: 15, meaning: 'La marca se asocia con la categoría y casos de uso buscados.' },
  { key: 'competitive_sov', label: 'Competitive Share of Voice', weight: 15, meaning: 'La marca aparece frente a competidores declarados/detectados.' },
  { key: 'citation_quality', label: 'Citation Quality', weight: 15, meaning: 'Las fuentes que moldean las respuestas son creíbles y útiles.' },
  { key: 'message_alignment', label: 'Message Alignment', weight: 10, meaning: 'La narrativa de la IA coincide con el posicionamiento deseado.' },
  { key: 'revenue_intent_coverage', label: 'Revenue Intent Coverage', weight: 5, meaning: 'La marca aparece en prompts de compra/comparación/implementación.' }
]

export const SCORE_DIMENSION_CONFIG_BY_KEY: Record<ScoreDimensionKey, ScoreDimensionConfig> = Object.fromEntries(
  SCORE_DIMENSIONS.map(dimension => [dimension.key, dimension])
) as Record<ScoreDimensionKey, ScoreDimensionConfig>

/** Suma total de pesos (debe ser 100). */
export const SCORE_TOTAL_WEIGHT = SCORE_DIMENSIONS.reduce((total, dimension) => total + dimension.weight, 0)

// ── Minimum gate defaults (coverage para score interno; los gates viven en review-gates/) ──

export const MIN_SUCCESSFUL_OBSERVATIONS = 3
export const MIN_PROMPT_FAMILIES_COVERED = 2
