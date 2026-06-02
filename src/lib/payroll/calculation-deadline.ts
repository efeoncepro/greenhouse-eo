import type { OperationalCalendarContextInput } from '@/lib/calendar/operational-calendar'
import {
  getLastBusinessDayOfMonth,
  getOperationalDateKey
} from '@/lib/calendar/operational-calendar'
import type { PayrollCalculationDeadlineState, PayrollPeriod } from '@/types/payroll'

export type PayrollCalculationDeadlinePolicy = {
  lastBusinessDay: string
  isDue: boolean
  isLastBusinessDay: boolean
  isOverdue: boolean
  calculatedOnTime: boolean | null
  state: PayrollCalculationDeadlineState
  blocksCalculation: boolean
}

/**
 * Canonical payroll calculation deadline policy.
 *
 * The deadline is an operational SLA, not a calculation gate. Calculation can
 * still run late when readiness has no real blockers and the period lifecycle
 * allows recalculation. Keep this distinction here so UI, APIs and automation
 * do not translate "overdue" into "blocked".
 */
export const resolvePayrollCalculationDeadline = (
  period: PayrollPeriod,
  referenceDate: Date | string = new Date(),
  options?: OperationalCalendarContextInput | null
): PayrollCalculationDeadlinePolicy => {
  const lastBusinessDay = getLastBusinessDayOfMonth(period.year, period.month, options)
  const referenceDateKey = getOperationalDateKey(referenceDate, options)
  const calculatedOnTime = period.calculatedAt ? getOperationalDateKey(period.calculatedAt, options) <= lastBusinessDay : null

  const isLastBusinessDay = referenceDateKey === lastBusinessDay
  const isDue = isLastBusinessDay && !period.calculatedAt
  const isOverdue = referenceDateKey > lastBusinessDay && period.status === 'draft' && !period.calculatedAt

  let state: PayrollCalculationDeadlineState = 'pending'

  if (calculatedOnTime === true) {
    state = 'calculated_on_time'
  } else if (calculatedOnTime === false) {
    state = 'calculated_late'
  } else if (isOverdue) {
    state = 'overdue_allowed'
  } else if (isDue) {
    state = 'due_today'
  }

  return {
    lastBusinessDay,
    isDue,
    isLastBusinessDay,
    isOverdue,
    calculatedOnTime,
    state,
    blocksCalculation: false
  }
}
