/**
 * TASK-1236 — Growth AI Visibility · Report temporal trend V1.
 *
 * Cómputo PURO (sin IO) del bloque `trend` del reporte: delta run-over-run del
 * score vigente vs el run previo COMPARABLE (mismo `prompt_pack_version` +
 * `score_version`). Determinista: mismos dos scores → mismo delta.
 *
 * Honestidad:
 *  - sin run previo → `sin_historico` (sin delta fabricado);
 *  - prompt-pack distinto → `incomparable` (no se compara contra otra muestra);
 *  - `null ≠ 0`: dimensión `null` en cualquiera de los dos extremos → delta `null`
 *    (dirección `sin_dato`), NUNCA `0`.
 */

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import { type ScoreDimensionKey } from '../scoring/config'
import { type PersistedGraderScore } from '../scoring/engine'
import {
  type DimensionTrend,
  type ReportTrend,
  type TrendDelta,
  type TrendDirection
} from './contracts'

/** Score previo comparable + metadata del run que lo produjo. */
export interface PreviousScoreInput {
  score: PersistedGraderScore
  promptPackVersion: string
  finishedAt: string | null
}

const round1 = (value: number): number => Math.round(value * 10) / 10

const resolveDirection = (delta: number | null): TrendDirection => {
  if (delta === null) return 'sin_dato'
  if (delta > 0) return 'subio'
  if (delta < 0) return 'bajo'

  return 'sin_cambio'
}

/** Delta honesto: null si cualquiera de los dos extremos es null (sin dato), no 0. */
const buildDelta = (current: number | null, previous: number | null): TrendDelta => {
  const delta = current === null || previous === null ? null : round1(current - previous)

  return { current, previous, delta, direction: resolveDirection(delta) }
}

const trend = (status: ReportTrend['status'], previousAsOf: string | null, overall: TrendDelta | null, dimensions: DimensionTrend[]): ReportTrend => ({
  status,
  reason: GH_GROWTH_AI_VISIBILITY.trend_status[status],
  previousAsOf,
  overall,
  dimensions
})

/**
 * Construye el bloque de tendencia. `previous` = run previo comparable (mismo
 * profile + score_version), ya resuelto por el reader; null si no hay histórico.
 */
export const buildReportTrend = (
  current: PersistedGraderScore,
  currentPromptPackVersion: string,
  previous: PreviousScoreInput | null
): ReportTrend => {
  if (!previous) {
    return trend('sin_historico', null, null, [])
  }

  // Comparabilidad: el run previo debe usar el mismo prompt-pack que el vigente.
  if (previous.promptPackVersion !== currentPromptPackVersion) {
    return trend('incomparable', previous.finishedAt, null, [])
  }

  const previousByKey = new Map<ScoreDimensionKey, number | null>(
    previous.score.dimensions.map(d => [d.key, d.score])
  )

  const dimensions: DimensionTrend[] = current.dimensions.map(dimension => ({
    key: dimension.key,
    ...buildDelta(dimension.score, previousByKey.get(dimension.key) ?? null)
  }))

  const overall = buildDelta(current.overallScore, previous.score.overallScore)

  return trend('con_tendencia', previous.finishedAt, overall, dimensions)
}
