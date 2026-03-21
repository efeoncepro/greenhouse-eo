import type { PeriodStatus } from '@/types/payroll'

export const isPayrollPeriodFinalized = (status: PeriodStatus) => status === 'exported'

export const canRecalculatePayrollPeriod = (status: PeriodStatus) => !isPayrollPeriodFinalized(status)

export const canEditPayrollEntries = (status: PeriodStatus) => status === 'calculated' || status === 'approved'

export const shouldReopenApprovedPayrollPeriod = (status: PeriodStatus) => status === 'approved'
