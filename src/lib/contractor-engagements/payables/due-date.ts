import {
  DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS,
  addBusinessDays,
  getLastBusinessDayOfMonth,
  getOperationalPayrollMonth,
  type DateLike,
  type OperationalCalendarContextInput
} from '@/lib/calendar/operational-calendar'

/**
 * TASK-978 — Canonical contractor-payment due-date derivation.
 *
 * Efeonce commits to pay collaborators AND contractors within the first 5
 * **business days** after the month close. This helper derives that committed
 * date for a contractor payable:
 *
 *   due_date = addBusinessDays(close_of_operational_month, 5 business days)
 *
 * Anchor = the close (last business day) of the payable's OPERATIONAL month,
 * resolved via `getOperationalPayrollMonth` (which already rolls back to the
 * prior month when we're inside that month's close window). The contractor
 * payable has NO `service_period` column, so the operational month of the
 * `referenceDate` (creation time by default) is the canonical anchor.
 *
 * Pure (no IO) — composes only the canonical operational-calendar primitives
 * (business days, holidays, timezone). NEVER recompute business-day windows
 * locally; this helper is the single source of truth for the contractor domain.
 *
 * Manual override wins: callers apply this ONLY when no `dueDate` was provided.
 */
export interface ResolveContractorPaymentDueDateInput {
  /** Date anchoring the operational month. Defaults to now (creation time). */
  referenceDate?: DateLike
  /**
   * Business days after the operational month close. Defaults to the canonical
   * `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS` (= 5). Reuse the constant;
   * do NOT introduce a parallel config.
   */
  businessDays?: number
  /** Optional operational-calendar context override (timezone, holidays). */
  calendarOptions?: OperationalCalendarContextInput | null
}

/** Returns the committed payment due-date (`YYYY-MM-DD`) for a contractor payable. */
export const resolveContractorPaymentDueDate = (
  input: ResolveContractorPaymentDueDateInput = {}
): string => {
  const referenceDate = input.referenceDate ?? new Date()
  const businessDays = input.businessDays ?? DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS
  const calendarOptions = input.calendarOptions ?? null

  const { operationalYear, operationalMonth } = getOperationalPayrollMonth(referenceDate, calendarOptions)
  const close = getLastBusinessDayOfMonth(operationalYear, operationalMonth, calendarOptions)

  return addBusinessDays(close, businessDays, calendarOptions)
}
