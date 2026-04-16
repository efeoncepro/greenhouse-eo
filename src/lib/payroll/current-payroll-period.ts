import type { PayrollPeriod, PeriodStatus } from '@/types/payroll'

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

// ────────────────────────────────────────────────────────────────────────────
// Active periods model (TASK-409)
// ────────────────────────────────────────────────────────────────────────────
//
// Multiple payroll periods can legitimately demand operator attention at the
// same time:
//
//  · `reopened`     — a finalized period that was re-opened for reliquidación
//                     and is mid-supersede. Highest priority because the
//                     operator has an in-flight correction that must be
//                     closed.
//  · `current_month`— the operational-month period still in draft/calculated/
//                     approved. This is the normal monthly cycle surface.
//  · `pending_export`— any period that is `approved` but hasn't been
//                     exported yet, regardless of which month it belongs to.
//                     Covers the edge case of a month that was approved late.
//  · `future_draft` — a period ahead of the current operational month that
//                     was created early (rare but possible).
//
// `getActivePayrollPeriods` returns all of them, ordered by priority. Callers
// that only need a single "current" period can use the thin
// `getCurrentPayrollPeriod` wrapper that returns the top-priority entry.
// This keeps the old single-period API working while unlocking multi-period
// awareness for surfaces that want to render them all.

export type ActivePayrollReason =
  | 'reopened_for_reliquidation'
  | 'current_operational_month'
  | 'approved_pending_export'
  | 'future_draft'

/**
 * Priority order (lower = more urgent). Consumers should not depend on the
 * exact numeric values, only on the relative ordering.
 */
const ACTIVE_PAYROLL_REASON_PRIORITY: Record<ActivePayrollReason, number> = {
  reopened_for_reliquidation: 10,
  current_operational_month: 20,
  approved_pending_export: 30,
  future_draft: 40
}

export interface ActivePayrollPeriodEntry {
  period: PayrollPeriod
  reason: ActivePayrollReason
  priority: number
  operationalMonthKey: string
}

/**
 * Terminal statuses — a period in one of these does NOT demand attention.
 * `exported` is the only terminal status today. `approved` is deliberately
 * excluded because it can still be re-exported (and the UI should surface it
 * under `approved_pending_export`).
 */
const TERMINAL_STATUSES: readonly PeriodStatus[] = ['exported'] as const

const isTerminalStatus = (status: PeriodStatus) => TERMINAL_STATUSES.includes(status)

/**
 * Classifies a single period against the operational calendar and returns
 * the active-reason entry that best describes why it demands attention,
 * or null if it doesn't.
 */
const classifyPayrollPeriod = (
  period: PayrollPeriod,
  operationalMonthKey: string
): ActivePayrollPeriodEntry | null => {
  if (isTerminalStatus(period.status)) {
    return null
  }

  const periodMonthKey = toPeriodMonthKey(period)

  // 1. Reopened always wins, regardless of month alignment.
  if (period.status === 'reopened') {
    return {
      period,
      reason: 'reopened_for_reliquidation',
      priority: ACTIVE_PAYROLL_REASON_PRIORITY.reopened_for_reliquidation,
      operationalMonthKey: periodMonthKey
    }
  }

  // 2. The operational-month period in any non-terminal state is the
  //    primary monthly cycle surface.
  if (periodMonthKey === operationalMonthKey) {
    return {
      period,
      reason: 'current_operational_month',
      priority: ACTIVE_PAYROLL_REASON_PRIORITY.current_operational_month,
      operationalMonthKey: periodMonthKey
    }
  }

  // 3. Approved periods that don't match the operational month — still need
  //    to be exported.
  if (period.status === 'approved') {
    return {
      period,
      reason: 'approved_pending_export',
      priority: ACTIVE_PAYROLL_REASON_PRIORITY.approved_pending_export,
      operationalMonthKey: periodMonthKey
    }
  }

  // 4. Future months already in draft (early preparation).
  if (periodMonthKey > operationalMonthKey && period.status === 'draft') {
    return {
      period,
      reason: 'future_draft',
      priority: ACTIVE_PAYROLL_REASON_PRIORITY.future_draft,
      operationalMonthKey: periodMonthKey
    }
  }

  // Everything else (e.g. a prior month in draft/calculated that isn't
  // approved) is noise — hide it from the "active" surface. The operator
  // can still reach it via the history tab.
  return null
}

/**
 * Returns all payroll periods that currently demand operator attention,
 * in priority order. Empty array if no period is active.
 *
 * Tie-break within the same priority bucket: most recent period first
 * (by year/month descending).
 */
export const getActivePayrollPeriods = (
  periods: PayrollPeriod[],
  referenceDate: Date | string = new Date(),
  options?: OperationalCalendarContextInput | null
): ActivePayrollPeriodEntry[] => {
  const normalizedOptions = {
    timezone: options?.timezone ?? DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
    countryCode: options?.countryCode ?? null,
    holidayCalendarCode: options?.holidayCalendarCode ?? null,
    holidayDates: options?.holidayDates ?? null,
    closeWindowBusinessDays: options?.closeWindowBusinessDays ?? null
  }

  const operational = getOperationalPayrollMonth(referenceDate, normalizedOptions)
  const sorted = sortPayrollPeriodsDescending(periods)

  return sorted
    .map(period => classifyPayrollPeriod(period, operational.operationalMonthKey))
    .filter((entry): entry is ActivePayrollPeriodEntry => entry !== null)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      // Within the same priority bucket, prefer the most recent period.
      return (
        b.period.year - a.period.year ||
        b.period.month - a.period.month
      )
    })
}

/**
 * Thin wrapper that returns the single top-priority active period, keeping
 * backward compatibility with callers that don't yet handle multi-period
 * awareness. New surfaces should prefer `getActivePayrollPeriods` directly.
 */
export const getCurrentPayrollPeriod = (
  periods: PayrollPeriod[],
  referenceDate: Date | string = new Date(),
  options?: OperationalCalendarContextInput | null
): PayrollPeriod | null => {
  const active = getActivePayrollPeriods(periods, referenceDate, options)

  return active[0]?.period ?? null
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
