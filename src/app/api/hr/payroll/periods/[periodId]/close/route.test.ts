import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockClosePayrollPeriod = vi.fn()
const mockDispatchPayrollExportNotifications = vi.fn()
const mockGetPayrollPeriod = vi.fn()
const mockRequireHrTenantContext = vi.fn()
const mockToPayrollErrorResponse = vi.fn()

vi.mock('@/lib/payroll/close-payroll-period', () => ({
  closePayrollPeriod: (...args: unknown[]) => mockClosePayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/dispatch-payroll-export-notifications', () => ({
  dispatchPayrollExportNotifications: (...args: unknown[]) =>
    mockDispatchPayrollExportNotifications(...args)
}))

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireHrTenantContext: (...args: unknown[]) => mockRequireHrTenantContext(...args)
}))

vi.mock('@/lib/payroll/api-response', () => ({
  toPayrollErrorResponse: (...args: unknown[]) => mockToPayrollErrorResponse(...args)
}))

const { POST } = await import('./route')

describe('POST /api/hr/payroll/periods/[periodId]/close', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireHrTenantContext.mockResolvedValue({
      tenant: { id: 'tenant-1' },
      errorResponse: null
    })
    mockToPayrollErrorResponse.mockReturnValue(new Response(JSON.stringify({ error: 'mock' }), { status: 500 }))
  })

  it('dispatches notifications only when the period actually transitions to exported', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      status: 'approved'
    })
    mockClosePayrollPeriod.mockResolvedValueOnce({
      period: {
        periodId: '2026-03',
        status: 'exported'
      },
      exportedNow: true
    })
    mockDispatchPayrollExportNotifications.mockResolvedValueOnce({
      outbox: { runId: 'outbox-1' },
      reactive: { runId: 'react-1' }
    })

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ periodId: '2026-03' })
    })

    const body = await response.json()

    expect(mockDispatchPayrollExportNotifications).toHaveBeenCalledTimes(1)
    expect(body.notificationDispatch).toEqual({
      outbox: { runId: 'outbox-1' },
      reactive: { runId: 'react-1' }
    })
  })

  it('skips notification dispatch when the period was already exported', async () => {
    mockGetPayrollPeriod.mockResolvedValueOnce({
      periodId: '2026-03',
      status: 'exported'
    })
    mockClosePayrollPeriod.mockResolvedValueOnce({
      period: {
        periodId: '2026-03',
        status: 'exported'
      },
      exportedNow: false
    })

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ periodId: '2026-03' })
    })

    const body = await response.json()

    expect(mockDispatchPayrollExportNotifications).not.toHaveBeenCalled()
    expect(body.notificationDispatch).toBeNull()
  })
})
