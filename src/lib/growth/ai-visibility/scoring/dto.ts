/**
 * TASK-1227 — Growth AI Visibility · Score DTOs (Slice 4).
 *
 * Separa output INTERNO (completo: dimensiones con reasons/evidenceCount, findings)
 * del PUBLIC-SAFE (resumen sin raw provider text, prompts ni detalle por finding).
 * Invariante: el DTO público NUNCA incluye excerpts/prompts/citations crudas ni
 * razones que puedan filtrar texto de terceros. PURO.
 */

import { type NormalizedFinding } from '../normalization/contracts'
import { type GraderScoreStatus, type ScoreDimensionKey } from './config'
import { type PersistedGraderScore } from './engine'

export interface PublicSafeDimension {
  key: ScoreDimensionKey
  label: string
  weight: number
  score: number | null
}

export interface PublicSafeScore {
  scoreVersion: string
  overallScore: number | null
  scoreStatus: GraderScoreStatus
  confidence: number
  dimensions: PublicSafeDimension[]
}

/** Proyección public-safe: solo el resumen ponderado, sin reasons/evidencia cruda. */
export const toPublicSafeScore = (score: PersistedGraderScore): PublicSafeScore => ({
  scoreVersion: score.scoreVersion,
  overallScore: score.overallScore,
  scoreStatus: score.scoreStatus,
  confidence: score.confidence,
  dimensions: score.dimensions.map(dimension => ({
    key: dimension.key,
    label: dimension.label,
    weight: dimension.weight,
    score: dimension.score
  }))
})

export interface InternalScoreView {
  score: PersistedGraderScore
  findings: NormalizedFinding[]
}

/** Vista interna completa (admin/evidence review). Incluye dimensiones con reasons + findings. */
export const toInternalScoreView = (
  score: PersistedGraderScore,
  findings: NormalizedFinding[]
): InternalScoreView => ({ score, findings })
