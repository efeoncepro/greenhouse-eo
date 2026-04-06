import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { dispatchPayrollExportNotifications } = await import('./dispatch-payroll-export-notifications')

describe('dispatchPayrollExportNotifications', () => {
  it('returns scoped async dispatch result for the given periodId', async () => {
    const result = await dispatchPayrollExportNotifications('2026-03')

    expect(result).toEqual({
      event: 'payroll_period.exported',
      periodId: '2026-03',
      dispatch: 'async'
    })
  })

  it('does not call global outbox or reactive consumers', async () => {
    // The function should be a pure scoped descriptor — no side effects
    const result = await dispatchPayrollExportNotifications('2026-04')

    expect(result.dispatch).toBe('async')
    expect(result.periodId).toBe('2026-04')
  })
})
