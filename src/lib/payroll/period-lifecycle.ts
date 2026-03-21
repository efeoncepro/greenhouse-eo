import type { PeriodStatus } from '@/types/payroll'

export const isPayrollPeriodFinalized = (status: PeriodStatus) => status === 'exported'

export const canRecalculatePayrollPeriod = (status: PeriodStatus) => !isPayrollPeriodFinalized(status)

export const canEditPayrollEntries = (status: PeriodStatus) => status === 'calculated' || status === 'approved'

export const shouldReopenApprovedPayrollPeriod = (status: PeriodStatus) => status === 'approved'

export const canEditPayrollPeriodMetadata = (status: PeriodStatus) => !isPayrollPeriodFinalized(status)

export const doesPayrollPeriodUpdateRequireReset = ({
  currentYear,
  currentMonth,
  currentUfValue,
  currentTaxTableVersion,
  nextYear,
  nextMonth,
  nextUfValue,
  nextTaxTableVersion
}: {
  currentYear: number
  currentMonth: number
  currentUfValue: number | null
  currentTaxTableVersion: string | null
  nextYear: number
  nextMonth: number
  nextUfValue: number | null
  nextTaxTableVersion: string | null
}) =>
  currentYear !== nextYear
  || currentMonth !== nextMonth
  || currentUfValue !== nextUfValue
  || currentTaxTableVersion !== nextTaxTableVersion
