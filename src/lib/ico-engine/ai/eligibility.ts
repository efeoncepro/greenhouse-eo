import 'server-only'

import { toNumber } from '../shared'

import type { AiEligibilityResult, AiMetricSnapshotRow } from './types'

const toPeriodKey = (row: Pick<AiMetricSnapshotRow, 'period_year' | 'period_month'>) =>
  toNumber(row.period_year) * 100 + toNumber(row.period_month)

export const evaluateAiEligibility = (
  rows: AiMetricSnapshotRow[],
  options: {
    minCompletedTasks?: number
    rollingMonths?: number
  } = {}
): AiEligibilityResult => {
  const minCompletedTasks = options.minCompletedTasks ?? 30
  const rollingMonths = options.rollingMonths ?? 3

  const rollingRows = [...rows]
    .sort((left, right) => toPeriodKey(right) - toPeriodKey(left))
    .slice(0, rollingMonths)

  const completedTasks3m = rollingRows.reduce((sum, row) => sum + toNumber(row.completed_tasks), 0)

  if (rollingRows.length === 0) {
    return {
      aiEligible: false,
      completedTasks3m: 0,
      reason: 'No hay historial mensual materializado para evaluar elegibilidad AI.'
    }
  }

  if (completedTasks3m < minCompletedTasks) {
    return {
      aiEligible: false,
      completedTasks3m,
      reason: `Rolling 3M con ${completedTasks3m} tareas completadas; mínimo requerido ${minCompletedTasks}.`
    }
  }

  return {
    aiEligible: true,
    completedTasks3m,
    reason: null
  }
}

