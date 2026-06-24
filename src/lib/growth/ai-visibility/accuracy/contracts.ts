/**
 * TASK-1238 — Growth AI Visibility · Brand accuracy contract V1 (Slice 1).
 *
 * Contrato del detector de exactitud de marca: contrasta lo que la IA AFIRMA de la
 * marca contra la VERDAD DECLARADA del perfil (categoría / competidores / identidad).
 * PURO (sin IO). Invariantes:
 *  - El LLM NUNCA asigna el score: el detector es determinista sobre los findings ya
 *    normalizados (la extracción LLM aporta evidencia vía findings, no veredicto).
 *  - Sin verdad declarada suficiente → no se fabrica inexactitud (degradación honesta).
 *  - Conservador YMYL: la inexactitud probable escala a revisión humana (`review_required`),
 *    nunca a una afirmación auto-publicada de "la IA miente".
 */

/**
 * Tipo de inexactitud detectada. `category_mismatch`/`entity_collision` se detectan
 * deterministas; `misattribution`/`unverifiable_claim` dependen de evidencia LLM
 * (afirmaciones libres) y en V1 son señales de baja confianza / reservadas.
 */
export const ACCURACY_FINDING_KINDS = [
  'category_mismatch',
  'entity_collision',
  'misattribution',
  'unverifiable_claim'
] as const
export type AccuracyFindingKind = (typeof ACCURACY_FINDING_KINDS)[number]

/** Confianza del detector en la inexactitud. Solo `high` escala el gate (conservador). */
export const ACCURACY_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
export type AccuracyConfidence = (typeof ACCURACY_CONFIDENCE_LEVELS)[number]

/** Verdad declarada de la marca (subset del perfil). NO inferida — declarada. */
export interface BrandTruth {
  brandName: string
  category: string | null
  competitorsDeclared: string[]
}

/**
 * Hallazgo de inexactitud. `reason` es detalle INTERNO (no viaja al público).
 * `evidenceCount` = nº de respuestas que sustentan el hallazgo.
 */
export interface AccuracyFinding {
  kind: AccuracyFindingKind
  confidence: AccuracyConfidence
  evidenceCount: number
  reason: string
}
