import type { OperationalCalendarContextInput } from '@/lib/calendar/operational-calendar'
import {
  getNthBusinessDayOfMonth,
  getOperationalDateKey,
  resolveOperationalCalendarContext
} from '@/lib/calendar/operational-calendar'
import type { PayrollCalculationDeadlineState, PayrollPeriod } from '@/types/payroll'

export type PayrollCalculationDeadlinePolicy = {
  deadlineDate: string
  isDue: boolean
  isDeadlineDay: boolean
  isOverdue: boolean
  calculatedOnTime: boolean | null
  state: PayrollCalculationDeadlineState
  blocksCalculation: boolean
}

/**
 * Canonical payroll calculation deadline policy.
 *
 * Efeonce paga la nómina dentro de los primeros N días hábiles **posteriores al
 * cierre de mes** (`closeWindowBusinessDays`, default 5). Por eso el deadline del
 * período (mes M) es el **N-ésimo día hábil del mes siguiente (M+1)**, NO el
 * último día hábil del mes M. Ejemplo: la nómina de junio se calcula dentro de
 * los primeros 5 días hábiles de julio.
 *
 * El deadline es una SLA operativa, no un gate de cálculo. El cálculo puede
 * correr fuera de plazo cuando readiness no tiene blockers reales y el lifecycle
 * lo permite. Se mantiene la distinción aquí para que UI, APIs y automatización
 * no traduzcan "overdue" en "blocked".
 */
export const resolvePayrollCalculationDeadline = (
  period: PayrollPeriod,
  referenceDate: Date | string = new Date(),
  options?: OperationalCalendarContextInput | null
): PayrollCalculationDeadlinePolicy => {
  const context = resolveOperationalCalendarContext(options ?? null, null, null)
  const closeWindowBusinessDays = context.closeWindowBusinessDays

  // Mes siguiente al período (con rollover de año en diciembre).
  const nextMonthYear = period.month === 12 ? period.year + 1 : period.year
  const nextMonth = period.month === 12 ? 1 : period.month + 1

  const deadlineDate = getNthBusinessDayOfMonth(nextMonthYear, nextMonth, closeWindowBusinessDays, context)
  const referenceDateKey = getOperationalDateKey(referenceDate, context)
  const calculatedOnTime = period.calculatedAt ? getOperationalDateKey(period.calculatedAt, context) <= deadlineDate : null

  const isDeadlineDay = referenceDateKey === deadlineDate
  const isDue = isDeadlineDay && !period.calculatedAt
  const isOverdue = referenceDateKey > deadlineDate && period.status === 'draft' && !period.calculatedAt

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
    deadlineDate,
    isDue,
    isDeadlineDay,
    isOverdue,
    calculatedOnTime,
    state,
    blocksCalculation: false
  }
}
