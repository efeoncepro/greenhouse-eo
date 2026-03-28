import type { PayrollPeriod } from '@/types/payroll'

const comparePayrollPeriodsDesc = (a: PayrollPeriod, b: PayrollPeriod) =>
  b.year - a.year || b.month - a.month

export const sortPayrollPeriodsDescending = (periods: PayrollPeriod[]) =>
  [...periods].sort(comparePayrollPeriodsDesc)

export const getCurrentPayrollPeriod = (periods: PayrollPeriod[]) => {
  const [latestPeriod] = sortPayrollPeriodsDescending(periods)

  if (!latestPeriod || latestPeriod.status === 'exported') {
    return null
  }

  return latestPeriod
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
