import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetOperationalPayrollMonth = vi.fn()
const mockIsLastBusinessDayOfMonth = vi.fn()
const mockGetPayrollPeriod = vi.fn()
const mockCreatePayrollPeriod = vi.fn()
const mockGetPayrollPeriodReadiness = vi.fn()
const mockCalculatePayroll = vi.fn()

vi.mock('@/lib/calendar/operational-calendar', () => ({
  getOperationalPayrollMonth: (...args: unknown[]) => mockGetOperationalPayrollMonth(...args),
  isLastBusinessDayOfMonth: (...args: unknown[]) => mockIsLastBusinessDayOfMonth(...args)
}))

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args),
  createPayrollPeriod: (...args: unknown[]) => mockCreatePayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/payroll-readiness', () => ({
  getPayrollPeriodReadiness: (...args: unknown[]) => mockGetPayrollPeriodReadiness(...args)
}))

vi.mock('@/lib/payroll/calculate-payroll', () => ({
  calculatePayroll: (...args: unknown[]) => mockCalculatePayroll(...args)
}))

import { runPayrollAutoCalculation } from '@/lib/payroll/auto-calculate-payroll'

describe('runPayrollAutoCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOperationalPayrollMonth.mockReturnValue({
      calendarYear: 2026,
      calendarMonth: 3
    })
  })

  it('skips when today is not the last business day', async () => {
    mockIsLastBusinessDayOfMonth.mockReturnValue(false)

    const result = await runPayrollAutoCalculation()

    expect(result.status).toBe('skipped_not_due')
    expect(mockGetPayrollPeriod).not.toHaveBeenCalled()
  })

  it('auto-creates the period and calculates it when due and ready', async () => {
    mockIsLastBusinessDayOfMonth.mockReturnValue(true)
    mockGetPayrollPeriod.mockResolvedValueOnce(null)
    mockCreatePayrollPeriod.mockResolvedValue({ periodId: '2026-03', status: 'draft' })
    mockGetPayrollPeriodReadiness.mockResolvedValue({
      calculation: {
        ready: true,
        blockingIssues: [],
        warnings: []
      }
    })
    mockCalculatePayroll.mockResolvedValue({})

    const result = await runPayrollAutoCalculation()

    expect(mockCreatePayrollPeriod).toHaveBeenCalledWith({ year: 2026, month: 3 })
    expect(mockCalculatePayroll).toHaveBeenCalledWith({
      periodId: '2026-03',
      actorIdentifier: 'system:cron/payroll-auto-calculate'
    })
    expect(result).toMatchObject({
      status: 'calculated',
      periodId: '2026-03',
      createdPeriod: true,
      calculationTriggered: true
    })
  })

  it('returns blocked when calculation readiness has blockers', async () => {
    mockIsLastBusinessDayOfMonth.mockReturnValue(true)
    mockGetPayrollPeriod.mockResolvedValue({ periodId: '2026-03', status: 'draft' })
    mockGetPayrollPeriodReadiness.mockResolvedValue({
      calculation: {
        ready: false,
        blockingIssues: [{ code: 'missing_tax_table_version', severity: 'blocking', message: 'missing tax table' }],
        warnings: []
      }
    })

    const result = await runPayrollAutoCalculation()

    expect(result.status).toBe('blocked')
    expect(mockCalculatePayroll).not.toHaveBeenCalled()
    expect(result.blockingIssues).toHaveLength(1)
  })

  it('does not recalculate periods that are already resolved', async () => {
    mockIsLastBusinessDayOfMonth.mockReturnValue(true)
    mockGetPayrollPeriod.mockResolvedValue({ periodId: '2026-03', status: 'calculated' })

    const result = await runPayrollAutoCalculation()

    expect(result.status).toBe('already_resolved')
    expect(mockCalculatePayroll).not.toHaveBeenCalled()
  })
})
