import type { PayrollPeriod } from '@/types/payroll'

import {
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
  getLastBusinessDayOfMonth,
  getOperationalDateKey,
  getOperationalPayrollMonth,
  type OperationalCalendarContextInput
} from '@/lib/calendar/operational-calendar'

const comparePayrollPeriodsDesc = (a: PayrollPeriod, b: PayrollPeriod) =>
  b.year - a.year || b.month - a.month

const toPeriodMonthKey = (period: PayrollPeriod) => `${period.year}-${String(period.month).padStart(2, '0')}`

export interface PayrollCalculationDeadlineStatus {
  deadlineDate: string
  isDue: boolean
  isLastBusinessDay: boolean
  calculatedOnTime: boolean
  state: 'pending' | 'due' | 'calculated_on_time' | 'calculated_late'
}

export const sortPayrollPeriodsDescending = (periods: PayrollPeriod[]) =>
  [...periods].sort(comparePayrollPeriodsDesc)

export const getCurrentPayrollPeriod = (
  periods: PayrollPeriod[],
  referenceDate: Date | string = new Date(),
  options?: OperationalCalendarContextInput | null
) => {
  const normalizedOptions = {
    timezone: options?.timezone ?? DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
    countryCode: options?.countryCode ?? null,
    holidayCalendarCode: options?.holidayCalendarCode ?? null,
    holidayDates: options?.holidayDates ?? null,
    closeWindowBusinessDays: options?.closeWindowBusinessDays ?? null
  }

  const operationalMonth = getOperationalPayrollMonth(referenceDate, normalizedOptions)

  const currentPeriod = sortPayrollPeriodsDescending(periods).find(
    period => toPeriodMonthKey(period) === operationalMonth.operationalMonthKey
  )

  if (!currentPeriod || currentPeriod.status === 'exported') {
    return null
  }

  return currentPeriod
}

export const getNextPayrollPeriodSuggestion = (
  periods: PayrollPeriod[],
  referenceDate = new Date()
): { year: number; month: number } => {
  const [latestPeriod] = sortPayrollPeriodsDescending(periods)

  if (!latestPeriod) {
    return {
      year: referenceDate.getFullYear(),
      month: referenceDate.getMonth() + 1
    }
  }

  if (latestPeriod.month === 12) {
    return { year: latestPeriod.year + 1, month: 1 }
  }

  return { year: latestPeriod.year, month: latestPeriod.month + 1 }
}

export const getPayrollCalculationDeadlineStatus = (
  period: PayrollPeriod,
  referenceDate: Date | string = new Date(),
  options?: OperationalCalendarContextInput | null
): PayrollCalculationDeadlineStatus => {
  const normalizedOptions = {
    timezone: options?.timezone ?? DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
    countryCode: options?.countryCode ?? null,
    holidayCalendarCode: options?.holidayCalendarCode ?? null,
    holidayDates: options?.holidayDates ?? null,
    closeWindowBusinessDays: options?.closeWindowBusinessDays ?? null
  }

  const deadlineDate = getLastBusinessDayOfMonth(period.year, period.month, normalizedOptions)
  const referenceDateKey = getOperationalDateKey(referenceDate, normalizedOptions)
  const calculatedDateKey = period.calculatedAt ? getOperationalDateKey(period.calculatedAt, normalizedOptions) : null
  const calculatedOnTime = calculatedDateKey != null && calculatedDateKey <= deadlineDate
  const isDue = !period.calculatedAt && referenceDateKey >= deadlineDate
  const isLastBusinessDay = referenceDateKey === deadlineDate

  if (period.calculatedAt) {
    return {
      deadlineDate,
      isDue,
      isLastBusinessDay,
      calculatedOnTime,
      state: calculatedOnTime ? 'calculated_on_time' : 'calculated_late'
    }
  }

  return {
    deadlineDate,
    isDue,
    isLastBusinessDay,
    calculatedOnTime,
    state: isDue ? 'due' : 'pending'
  }
}
