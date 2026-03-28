import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetPayrollPeriod = vi.fn()
const mockPgSetPeriodExported = vi.fn()
const mockIsPayrollPostgresEnabled = vi.fn()

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  isPayrollPostgresEnabled: () => mockIsPayrollPostgresEnabled(),
  pgSetPeriodExported: (...args: unknown[]) => mockPgSetPeriodExported(...args)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project',
  getBigQueryClient: () => ({
    query: vi.fn()
  })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

const { closePayrollPeriod } = await import('./close-payroll-period')

describe('closePayrollPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPayrollPostgresEnabled.mockReturnValue(true)
  })

  it('marks approved periods as exported', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      status: 'approved',
      year: 2026,
      month: 3
    })
    mockPgSetPeriodExported.mockResolvedValueOnce(undefined)
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      status: 'exported',
      year: 2026,
      month: 3
    })

    const period = await closePayrollPeriod('2026-03')

    expect(mockPgSetPeriodExported).toHaveBeenCalledWith('2026-03')
    expect(period.status).toBe('exported')
  })

  it('returns exported periods as-is', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      status: 'exported',
      year: 2026,
      month: 3
    })

    const period = await closePayrollPeriod('2026-03')

    expect(mockPgSetPeriodExported).not.toHaveBeenCalled()
    expect(period.status).toBe('exported')
  })
})
