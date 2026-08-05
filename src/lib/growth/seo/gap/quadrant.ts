/**
 * TASK-1305 Slice 2 — Clasificador puro de la matriz quadrant 360 (SEO × AEO).
 *
 * Dos ejes ORTOGONALES que NUNCA se colapsan a un número único (boundary §1.1):
 * - Eje X (SEO): posición orgánica medida (GSC, ponderada por impresiones).
 * - Eje Y (AEO): citabilidad IA (`grader_scores.overall_score`, 0–100).
 *
 * Umbrales (Open Question 1 de la spec, resueltos en Discovery 2026-08-05):
 * - Rankeo "alto" = posición ≤ 10 (página 1 de Google). Top-3 sería más estricto, pero
 *   página 1 es el corte con significado de negocio: hay presencia orgánica real.
 * - Citabilidad "alta" = overall_score ≥ 50 (mitad de la escala 0–100 del grader,
 *   verificada contra el CHECK de `grader_scores`). Ambos son overridables por options
 *   en el reader — nunca promediados.
 *
 * Sin `server-only`: función pura, testeable y usable por cualquier consumer (la UI del
 * quadrant 360 la puede importar para leyendas, sin re-implementar la clasificación).
 */

import { type SeoAeoQuadrant } from '../contracts'

/** Posición máxima (inclusive) para considerar el rankeo "alto" (página 1). */
export const RANK_HIGH_MAX_POSITION = 10

/** Score AEO mínimo (inclusive) para considerar la citabilidad "alta". */
export const AEO_CITED_MIN_SCORE = 50

export interface QuadrantThresholds {
  rankHighMaxPosition: number
  aeoCitedMinScore: number
}

export const DEFAULT_QUADRANT_THRESHOLDS: QuadrantThresholds = {
  rankHighMaxPosition: RANK_HIGH_MAX_POSITION,
  aeoCitedMinScore: AEO_CITED_MIN_SCORE
}

/**
 * Clasifica una celda de la matriz 2×2.
 *
 * | rankeo alto | citación alta | → `dominante`   (dueño de los dos internets)
 * | rankeo alto | citación baja | → `riesgo`      (autoridad orgánica sin citabilidad → CTA AEO)
 * | rankeo bajo | citación alta | → `oportunidad` (entidad reconocida sin click clásico)
 * | rankeo bajo | citación baja | → `invisible`
 */
export const classifyQuadrant = (
  rankPosition: number,
  aeoScore: number,
  thresholds: QuadrantThresholds = DEFAULT_QUADRANT_THRESHOLDS
): SeoAeoQuadrant => {
  const rankHigh = rankPosition <= thresholds.rankHighMaxPosition
  const cited = aeoScore >= thresholds.aeoCitedMinScore

  if (rankHigh && cited) return 'dominante'

  if (rankHigh) return 'riesgo'

  if (cited) return 'oportunidad'

  return 'invisible'
}
