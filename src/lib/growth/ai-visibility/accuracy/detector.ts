/**
 * TASK-1238 — Growth AI Visibility · Brand accuracy detector V1 (Slice 1).
 *
 * DETERMINISTA-first (sin IO, sin LLM): contrasta los findings ya normalizados
 * contra la verdad declarada. El mismo input produce los mismos hallazgos. La
 * extracción LLM (flag OFF por defecto) sólo enriquece los findings que el detector
 * lee — NUNCA asigna el veredicto. Conservador: sólo `entity_collision` claro escala
 * el gate; el resto se surfacea para revisión humana sin auto-gatear.
 */

import { type NormalizedFinding } from '../normalization/contracts'
import { type AccuracyFinding, type BrandTruth } from './contracts'

const normalizeToken = (value: string): string => value.toLowerCase().trim()

/** Verdad declarada desde el perfil (subset). NO infiere — toma lo declarado. */
export const buildBrandTruth = (profile: {
  brandName: string
  category: string | null
  competitorsDeclared: string[]
}): BrandTruth => ({
  brandName: profile.brandName,
  category: profile.category,
  competitorsDeclared: profile.competitorsDeclared
})

/**
 * Colisión de entidad: la marca se mencionó de forma AMBIGUA (la IA no la identificó
 * limpiamente → posible confusión con otra empresa). ≥2 ambiguas → `high` (escala gate).
 */
const detectEntityCollision = (findings: NormalizedFinding[]): AccuracyFinding | null => {
  const ambiguous = findings.filter(f => f.brandMentioned === 'ambiguous').length

  if (ambiguous === 0) return null

  return {
    kind: 'entity_collision',
    confidence: ambiguous >= 2 ? 'high' : 'medium',
    evidenceCount: ambiguous,
    reason: `La marca se mencionó de forma ambigua en ${ambiguous} respuesta(s) — posible confusión con otra entidad.`
  }
}

/**
 * Categoría equivocada: en las respuestas donde la marca SÍ aparece con categoría
 * asociada, la categoría DECLARADA no aparece en ninguna → la IA la ubica en otra
 * categoría. Sin categoría declarada → no se evalúa (degradación honesta).
 */
const detectCategoryMismatch = (findings: NormalizedFinding[], truth: BrandTruth): AccuracyFinding | null => {
  if (!truth.category) return null

  const categoryToken = normalizeToken(truth.category)

  if (categoryToken.length === 0) return null

  const branded = findings.filter(f => f.brandMentioned === 'yes' && f.categoryAssociations.length > 0)

  if (branded.length === 0) return null

  const anyDeclaredMatch = branded.some(f =>
    f.categoryAssociations.some(association => {
      const token = normalizeToken(association)

      return token.includes(categoryToken) || categoryToken.includes(token)
    })
  )

  if (anyDeclaredMatch) return null

  return {
    kind: 'category_mismatch',
    confidence: 'medium',
    evidenceCount: branded.length,
    reason: `La IA asoció la marca a categorías distintas de la declarada ("${truth.category}") en ${branded.length} respuesta(s).`
  }
}

/**
 * Atribución desviada: afirmaciones libres (extraídas por el hook LLM, flag OFF por
 * defecto) sobre la marca. Evidencia de BAJA confianza (no gatea sola) — surfacea
 * para que el humano contraste contra los hechos declarados.
 */
const detectMisattribution = (findings: NormalizedFinding[]): AccuracyFinding | null => {
  const withDrift = findings.filter(
    f => (f.brandMentioned === 'yes' || f.brandMentioned === 'ambiguous') && f.messageDriftClaims.length > 0
  ).length

  if (withDrift === 0) return null

  return {
    kind: 'misattribution',
    confidence: 'low',
    evidenceCount: withDrift,
    reason: `${withDrift} respuesta(s) con afirmaciones desviadas sobre la marca — revisar contra los hechos declarados.`
  }
}

/** Detector canónico: hallazgos de inexactitud deterministas + evidencia LLM (si existe). */
export const detectBrandInaccuracies = (
  findings: NormalizedFinding[],
  truth: BrandTruth
): AccuracyFinding[] =>
  [detectEntityCollision(findings), detectCategoryMismatch(findings, truth), detectMisattribution(findings)].filter(
    (finding): finding is AccuracyFinding => finding !== null
  )

/**
 * Predicado del gate (conservador): hay alucinación PROBABLE sólo si algún hallazgo
 * es de confianza `high`. Evita sobre-escalar a `review_required` por ruido.
 */
export const hasLikelyHallucination = (accuracyFindings: AccuracyFinding[]): boolean =>
  accuracyFindings.some(finding => finding.confidence === 'high')
