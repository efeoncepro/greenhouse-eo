import type { PeriodStatus } from '@/types/payroll'

export const isPayrollPeriodFinalized = (status: PeriodStatus) => status === 'exported'

export const canRecalculatePayrollPeriod = (status: PeriodStatus) => !isPayrollPeriodFinalized(status)

export const canSetPayrollPeriodCalculated = (status: PeriodStatus) =>
  status === 'draft' || status === 'calculated' || status === 'approved' || status === 'reopened'

export const canSetPayrollPeriodApproved = (status: PeriodStatus) => status === 'calculated'

export const canSetPayrollPeriodExported = (status: PeriodStatus) => status === 'approved'

export const canEditPayrollEntries = (status: PeriodStatus) =>
  status === 'calculated' || status === 'reopened'

export const shouldReopenApprovedPayrollPeriod = (status: PeriodStatus) => status === 'approved'

export const canEditPayrollPeriodMetadata = (status: PeriodStatus) => !isPayrollPeriodFinalized(status)

// TASK-410: only exported periods can be reopened for reliquidación.
// A reopened period transitions back into the calculate → approve → export cycle
// but surfaces v2 entries through the versioning machinery.
export const canReopenPayrollPeriod = (status: PeriodStatus) => status === 'exported'

// TASK-410: while a period is reopened, entries accept edits but v1 rows remain
// immutable — mutations create a superseding v2 row instead of updating v1.
export const isPayrollPeriodReopened = (status: PeriodStatus) => status === 'reopened'

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
