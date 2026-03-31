import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCalculatePayroll = vi.fn()

vi.mock('@/lib/payroll/calculate-payroll', () => ({
  calculatePayroll: (...args: unknown[]) => mockCalculatePayroll(...args)
}))

import { leavePayrollRecalculationProjection } from '@/lib/sync/projections/leave-payroll-recalculation'

describe('leavePayrollRecalculationProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts period scope from leave payroll impact events', () => {
    expect(
      leavePayrollRecalculationProjection.extractScope({
        periodId: '2026-03'
      })
    ).toEqual({
      entityType: 'finance_period',
      entityId: '2026-03'
    })
  })

  it('recalculates official payroll for non-exported impacted periods', async () => {
    mockCalculatePayroll.mockResolvedValue({})

    const result = await leavePayrollRecalculationProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { periodStatus: 'approved' }
    )

    expect(mockCalculatePayroll).toHaveBeenCalledWith({
      periodId: '2026-03',
      actorIdentifier: 'reactive:leave_request.payroll_impact_detected'
    })
    expect(result).toContain('2026-03')
  })

  it('skips exported periods and leaves adjustment to downstream manual handling', async () => {
    const result = await leavePayrollRecalculationProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { periodStatus: 'exported' }
    )

    expect(mockCalculatePayroll).not.toHaveBeenCalled()
    expect(result).toBe('skipped payroll recalculation for 2026-03 (exported)')
  })
})
