import 'server-only'

export interface PayrollExportNotificationDispatchResult {
  event: 'payroll_period.exported'
  periodId: string
  dispatch: 'async'
}

/**
 * Returns a scoped notification dispatch result for the period that was just exported.
 *
 * The actual outbox event is emitted transactionally by `closePayrollPeriod()`.
 * Publishing and reactive processing are handled asynchronously by the ops-worker
 * cron (every ~5 min) — not inline in the close request.
 *
 * See ISSUE-005: the previous implementation drained the global outbox backlog
 * and processed all pending reactive notifications inline, coupling unrelated
 * side effects to the payroll close action.
 */
export const dispatchPayrollExportNotifications = async (
  periodId: string
): Promise<PayrollExportNotificationDispatchResult> => {
  return {
    event: 'payroll_period.exported',
    periodId,
    dispatch: 'async'
  }
}
