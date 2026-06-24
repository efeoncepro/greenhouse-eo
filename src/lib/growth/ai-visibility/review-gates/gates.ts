/**
 * TASK-1227 — Growth AI Visibility · Review gates (Slice 5).
 *
 * Resuelve el `score_status` desde el score crudo + findings, con degradación
 * honesta:
 *  - sin cobertura mínima → `insufficient_data` (nunca precisión falsa);
 *  - lenguaje riesgoso/difamatorio O sentimiento negativo de baja confianza →
 *    `review_required` (OQ#3 conservador: NO todo negativo, solo riesgo real);
 *  - en otro caso → `completed`.
 * `auto_releasable` queda SIEMPRE `false` en este task (la auto-release pública es
 * una task posterior). PURO.
 */

import { hasLikelyHallucination, type AccuracyFinding } from '../accuracy'
import { type NormalizedFinding } from '../normalization/contracts'
import {
  MIN_PROMPT_FAMILIES_COVERED,
  MIN_SUCCESSFUL_OBSERVATIONS,
  type GraderScoreStatus
} from '../scoring/config'
import { type RawGraderScore } from '../scoring/engine'

export interface ScoreStatusResolution {
  scoreStatus: GraderScoreStatus
  autoReleasable: boolean
  reviewReasons: string[]
}

/** Observaciones "resueltas" = findings con presencia de marca determinada (no unknown). */
export const countResolvedFindings = (findings: NormalizedFinding[]): number =>
  findings.filter(finding => finding.brandMentioned !== 'unknown').length

/** Confianza por debajo de la cual un sentimiento negativo dispara revisión humana. */
export const REVIEW_LOW_CONFIDENCE_THRESHOLD = 0.6

/**
 * Términos de riesgo legal/reputacional (es/en). Si aparecen en la narrativa
 * derivada (drift/categoría), el score se gatea a revisión humana — evita publicar
 * lenguaje difamatorio sobre la marca o competidores sin revisión.
 */
export const RISKY_REVIEW_TERMS = [
  'estafa',
  'fraude',
  'fraudulent',
  'scam',
  'demanda',
  'lawsuit',
  'ilegal',
  'illegal',
  'denuncia',
  'quiebra',
  'bankrupt',
  'corrupc',
  'incompeten'
]

const containsRiskyLanguage = (findings: NormalizedFinding[]): boolean =>
  findings.some(finding =>
    [...finding.messageDriftClaims, ...finding.categoryAssociations].some(text =>
      RISKY_REVIEW_TERMS.some(term => text.toLowerCase().includes(term))
    )
  )

const hasLowConfidenceNegative = (findings: NormalizedFinding[]): boolean =>
  findings.some(
    finding => finding.sentimentLabel === 'negative' && finding.confidence < REVIEW_LOW_CONFIDENCE_THRESHOLD
  )

/** Razón de revisión por inexactitud de marca probable (TASK-1238). Interno (admin review). */
export const BRAND_ACCURACY_REVIEW_REASON =
  'Posible inexactitud de marca (la IA podría afirmar algo incorrecto) — requiere revisión humana antes de publicar.'

export const resolveScoreStatus = (
  raw: RawGraderScore,
  findings: NormalizedFinding[],
  accuracyFindings: AccuracyFinding[] = []
): ScoreStatusResolution => {
  const resolved = countResolvedFindings(findings)

  // Gate de cobertura: sin evidencia mínima no se emite score (insufficient_data).
  if (
    raw.overallScore === null ||
    resolved < MIN_SUCCESSFUL_OBSERVATIONS ||
    raw.coverage.promptFamilies < MIN_PROMPT_FAMILIES_COVERED
  ) {
    return {
      scoreStatus: 'insufficient_data',
      autoReleasable: false,
      reviewReasons: [
        `Cobertura insuficiente: ${resolved} observaciones resueltas (mín ${MIN_SUCCESSFUL_OBSERVATIONS}), ` +
          `${raw.coverage.promptFamilies} familias de prompt (mín ${MIN_PROMPT_FAMILIES_COVERED}).`
      ]
    }
  }

  // Gate de seguridad (OQ#3 conservador): lenguaje riesgoso/difamatorio o
  // sentimiento negativo de baja confianza → revisión humana, no auto-release.
  const reasons: string[] = []

  if (containsRiskyLanguage(findings)) {
    reasons.push('Lenguaje riesgoso/difamatorio en la narrativa derivada — requiere revisión humana.')
  }

  if (hasLowConfidenceNegative(findings)) {
    reasons.push('Sentimiento negativo con confianza baja — requiere revisión humana antes de publicar.')
  }

  // Gate de exactitud (TASK-1238, conservador YMYL): inexactitud de marca PROBABLE
  // (sólo hallazgos de confianza `high`) → revisión humana. El detector es determinista
  // sobre los findings; ningún LLM asigna el veredicto.
  if (hasLikelyHallucination(accuracyFindings)) {
    reasons.push(BRAND_ACCURACY_REVIEW_REASON)
  }

  if (reasons.length > 0) {
    return { scoreStatus: 'review_required', autoReleasable: false, reviewReasons: reasons }
  }

  // Auto-release público fuera de scope de TASK-1227 → siempre false.
  return { scoreStatus: 'completed', autoReleasable: false, reviewReasons: [] }
}
