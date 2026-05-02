import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockCan = vi.fn()
const mockMaterializePayroll = vi.fn()
const mockRunPg = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mockCan(...args)
}))

vi.mock('@/lib/finance/payroll-expense-reactive', () => ({
  materializePayrollExpensesForExportedPeriod: (...args: unknown[]) => mockMaterializePayroll(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunPg(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { POST } from './route'

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/admin/finance/payroll-expense-rematerialize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

describe('POST /api/admin/finance/payroll-expense-rematerialize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: {
        userId: 'usr-admin-1',
        roleCodes: ['efeonce_admin'],
        routeGroups: ['internal', 'admin']
      },
      errorResponse: null
    })
    mockCan.mockReturnValue(true)
    mockPublishOutboxEvent.mockResolvedValue('outbox-event-1')
  })

  it('returns 400 with code=validation_error when periodId is missing', async () => {
    const response = await POST(buildRequest({ year: 2026, month: 4 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
    expect(mockMaterializePayroll).not.toHaveBeenCalled()
  })

  it('returns 400 when month is out of range', async () => {
    const response = await POST(buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 13 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
  })

  it('returns 400 when year is not an integer', async () => {
    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 'abc', month: 4 })
    )

    expect(response.status).toBe(400)
    expect(mockMaterializePayroll).not.toHaveBeenCalled()
  })

  it('returns 403 when tenant lacks finance.payroll.rematerialize capability', async () => {
    mockCan.mockReturnValue(false)

    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 4 })
    )

    expect(response.status).toBe(403)
    expect(mockMaterializePayroll).not.toHaveBeenCalled()
    expect(mockCan).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'usr-admin-1' }),
      'finance.payroll.rematerialize',
      'update',
      'tenant'
    )
  })

  it('returns preview without invoking materializer when dryRun=true', async () => {
    // First call: candidates from payroll_entries
    mockRunPg
      .mockResolvedValueOnce([{ member_id: 'mem-1' }, { member_id: 'mem-2' }, { member_id: 'mem-3' }])
      // Second call: existing payroll expenses
      .mockResolvedValueOnce([{ member_id: 'mem-1' }])
      // Third call: existing social_security
      .mockResolvedValueOnce([])

    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 4, dryRun: true })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.dryRun).toBe(true)
    expect(body.result).toEqual({
      payrollCreated: 2,
      payrollSkipped: 1,
      socialSecurityCreated: true,
      socialSecuritySkipped: false
    })
    expect(mockMaterializePayroll).not.toHaveBeenCalled()
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'payroll_expense',
        aggregateId: 'pp-2026-04',
        eventType: 'finance.payroll_expenses.rematerialized',
        payload: expect.objectContaining({
          eventVersion: 'v1',
          dryRun: true,
          payrollCreated: 2,
          payrollSkipped: 1,
          actorUserId: 'usr-admin-1'
        })
      })
    )
  })

  it('invokes materializer and publishes outbox event on happy path (dryRun=false)', async () => {
    mockMaterializePayroll.mockResolvedValue({
      payrollCreated: 5,
      payrollSkipped: 2,
      socialSecurityCreated: true,
      socialSecuritySkipped: false
    })

    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 4 })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.dryRun).toBe(false)
    expect(body.result.payrollCreated).toBe(5)
    expect(body.eventId).toBe('outbox-event-1')

    expect(mockMaterializePayroll).toHaveBeenCalledWith({
      periodId: 'pp-2026-04',
      year: 2026,
      month: 4
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'payroll_expense',
        aggregateId: 'pp-2026-04',
        eventType: 'finance.payroll_expenses.rematerialized',
        payload: expect.objectContaining({
          eventVersion: 'v1',
          dryRun: false,
          payrollCreated: 5,
          actorUserId: 'usr-admin-1'
        })
      })
    )
  })

  it('returns 500 with sanitized error and captures Sentry when materializer throws', async () => {
    const boom = new Error('PG: column count mismatch in expenses INSERT')

    mockMaterializePayroll.mockRejectedValue(boom)

    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 4 })
    )

    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.code).toBe('rematerialize_failed')
    expect(body.error).toContain('column count mismatch')

    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      boom,
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'payroll_expense_rematerialize_endpoint' }),
        extra: expect.objectContaining({
          periodId: 'pp-2026-04',
          year: 2026,
          month: 4,
          dryRun: false,
          actorUserId: 'usr-admin-1'
        })
      })
    )

    // Must not have published a "success" event after the failure.
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('still returns 200 when audit outbox publish fails (non-blocking)', async () => {
    mockMaterializePayroll.mockResolvedValue({
      payrollCreated: 1,
      payrollSkipped: 0,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    })

    mockPublishOutboxEvent.mockRejectedValue(new Error('outbox transient'))

    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 4 })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.payrollCreated).toBe(1)
    expect(body.eventId).toBeUndefined()
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ op: 'audit_publish' })
      })
    )
  })

  it('returns 401 when no tenant context', async () => {
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: null,
      errorResponse: null
    })

    const response = await POST(
      buildRequest({ periodId: 'pp-2026-04', year: 2026, month: 4 })
    )

    expect(response.status).toBe(401)
    expect(mockMaterializePayroll).not.toHaveBeenCalled()
  })
})
