/**
 * TASK-1227 — Growth AI Visibility · Review gates (Slice 4 base; Slice 5 enriquece).
 *
 * Resuelve el `score_status` desde el score crudo + findings, con degradación
 * honesta: sin cobertura mínima → `insufficient_data` (nunca precisión falsa).
 * `auto_releasable` queda SIEMPRE `false` en este task (la auto-release pública es
 * una task posterior). Slice 5 añade `review_required` (lenguaje riesgoso /
 * sentimiento negativo de baja confianza). PURO.
 */

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

export const resolveScoreStatus = (
  raw: RawGraderScore,
  findings: NormalizedFinding[]
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

  // Auto-release público fuera de scope de TASK-1227 → siempre false.
  return { scoreStatus: 'completed', autoReleasable: false, reviewReasons: [] }
}
