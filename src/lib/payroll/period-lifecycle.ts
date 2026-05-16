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

/**
 * TASK-893 Slice 4 BL-5 — Reopened recompute guard predicate.
 *
 * Returns `true` when the period is in `reopened` state AND
 * `PAYROLL_PARTICIPATION_WINDOW_ENABLED` is ON in this environment. That
 * combination is canonically blocked because recomputing v2 entries with the
 * NEW participation-window semantic while v1 was computed under legacy creates
 * contradictory accounting entries against DTE/F29/Previred already submitted
 * under v1.
 *
 * V1 conservative (Opción B per ADR Delta 2026-05-16): block hard. The
 * operator can:
 *   - Cancel reopen + re-export legacy and let next period use new semantic.
 *   - Edit entries manually in reopened without triggering recompute.
 *
 * V1.1 follow-up: capability `payroll.period.force_recompute` (EFEONCE_ADMIN +
 * FINANCE_ADMIN, reason >= 20 chars, audit row) will allow explicit override.
 *
 * Pure function: takes the period status + the flag-enabled flag as inputs.
 * Callers (notably `calculatePayroll`) read the flag separately so this
 * helper stays pure and unit-testable in isolation.
 */
export const isReopenedRecomputeBlockedByParticipationWindow = (
  status: PeriodStatus,
  participationWindowEnabled: boolean
): boolean => participationWindowEnabled && isPayrollPeriodReopened(status)

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
