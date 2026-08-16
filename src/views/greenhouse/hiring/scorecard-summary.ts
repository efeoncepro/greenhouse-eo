/**
 * ISSUE-159 — Resumen honesto del scorecard de assessment (pure, testeable).
 *
 * Bug class que cierra: el "Global (referencia)" se computaba SOLO con las competencias ya
 * corregidas e ignoraba las pendientes — un test con 2 competencias objetivas perfectas y
 * 10 respuestas abiertas sin corregir mostraba "100/100 Óptimo" como si fuera resultado
 * final (caso fuente EO-ASM-0050, 2026-08-16). El promedio parcial NUNCA se presenta como
 * headline: mientras exista una competencia pendiente el estado es `partial` y el global
 * es null. La matemática del estado `complete` es EXACTAMENTE la previa (ponderado por
 * peso; simple si el peso total es 0) para no alterar scorecards ya finalizados.
 */

export interface ScorecardSummaryRow {
  score: number | null
  weight: number
  pending: boolean
}

export type ScorecardSummaryState = 'empty' | 'partial' | 'complete'

export interface ScorecardSummary {
  state: ScorecardSummaryState
  /** Global 0-100 redondeado. SOLO existe cuando state === 'complete'. */
  overall: number | null
  /** Competencias completamente corregidas (sin respuestas pendientes). */
  scoredCount: number
  totalCount: number
}

export const computeScorecardSummary = (rows: ScorecardSummaryRow[]): ScorecardSummary => {
  const totalCount = rows.length
  const scoredCount = rows.filter((row) => !row.pending && row.score != null).length

  if (totalCount === 0) {
    return { state: 'empty', overall: null, scoredCount: 0, totalCount: 0 }
  }

  const hasPending = rows.some((row) => row.pending || row.score == null)

  if (hasPending) {
    return { state: 'partial', overall: null, scoredCount, totalCount }
  }

  const scoredRows = rows.filter((row): row is ScorecardSummaryRow & { score: number } => row.score != null)
  const totalWeight = scoredRows.reduce((sum, row) => sum + row.weight, 0)

  const overall =
    totalWeight > 0
      ? Math.round(scoredRows.reduce((sum, row) => sum + row.score * row.weight, 0) / totalWeight)
      : Math.round(scoredRows.reduce((sum, row) => sum + row.score, 0) / scoredRows.length)

  return { state: 'complete', overall, scoredCount, totalCount }
}
