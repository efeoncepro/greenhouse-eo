import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockCan = vi.fn()
const mockRepairPayments = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mockCan(...args)
}))

vi.mock('@/lib/finance/repair-payments-clp-amount', () => ({
  repairPaymentsClpAmount: (...args: unknown[]) => mockRepairPayments(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { POST } from './route'

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/admin/finance/payments-clp-repair', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

describe('POST /api/admin/finance/payments-clp-repair (TASK-766 Slice 5)', () => {
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

  it('returns 401 when no tenant context', async () => {
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: null,
      errorResponse: null
    })

    const response = await POST(buildRequest({ kind: 'expense_payments' }))

    expect(response.status).toBe(401)
    expect(mockRepairPayments).not.toHaveBeenCalled()
  })

  it('returns 403 when tenant lacks finance.payments.repair_clp capability', async () => {
    mockCan.mockReturnValue(false)

    const response = await POST(buildRequest({ kind: 'expense_payments' }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.code).toBe('forbidden')
    expect(mockRepairPayments).not.toHaveBeenCalled()
    expect(mockCan).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'usr-admin-1' }),
      'finance.payments.repair_clp',
      'update',
      'tenant'
    )
  })

  it('returns 400 with validation_error when kind is missing', async () => {
    const response = await POST(buildRequest({}))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
    expect(body.error).toMatch(/kind requerido/)
    expect(mockRepairPayments).not.toHaveBeenCalled()
  })

  it('returns 400 when kind is not a supported table', async () => {
    const response = await POST(buildRequest({ kind: 'invalid_table' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
    expect(mockRepairPayments).not.toHaveBeenCalled()
  })

  it('returns 400 when fromDate has invalid format', async () => {
    const response = await POST(
      buildRequest({ kind: 'expense_payments', fromDate: '2026-4-1' })
    )

    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_error')
    expect(body.error).toMatch(/fromDate/)
  })

  it('returns 400 when paymentIds is not an array', async () => {
    const response = await POST(
      buildRequest({ kind: 'expense_payments', paymentIds: 'not-an-array' })
    )

    expect(response.status).toBe(400)
  })

  it('returns 400 when batchSize is not numeric', async () => {
    const response = await POST(
      buildRequest({ kind: 'expense_payments', batchSize: 'abc' })
    )

    expect(response.status).toBe(400)
  })

  it('happy path — runs repair, publishes outbox event, returns result', async () => {
    mockRepairPayments.mockResolvedValue({
      kind: 'expense_payments',
      candidatesScanned: 5,
      repaired: 4,
      skipped: [],
      errors: [],
      dryRun: false
    })

    const response = await POST(
      buildRequest({
        kind: 'expense_payments',
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.repaired).toBe(4)
    expect(body.eventId).toBe('outbox-event-1')

    expect(mockRepairPayments).toHaveBeenCalledWith({
      kind: 'expense_payments',
      paymentIds: undefined,
      fromDate: '2026-04-01',
      toDate: '2026-05-02',
      batchSize: undefined,
      dryRun: false
    })

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'finance_payments_clp_repair',
        eventType: 'finance.payments.clp_repaired',
        payload: expect.objectContaining({
          eventVersion: 'v1',
          kind: 'expense_payments',
          candidatesScanned: 5,
          repaired: 4,
          dryRun: false,
          actorUserId: 'usr-admin-1'
        })
      })
    )
  })

  it('dryRun=true forwards to helper and publishes audit event', async () => {
    mockRepairPayments.mockResolvedValue({
      kind: 'income_payments',
      candidatesScanned: 12,
      repaired: 0,
      skipped: [],
      errors: [],
      dryRun: true
    })

    const response = await POST(
      buildRequest({ kind: 'income_payments', dryRun: true })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.result.dryRun).toBe(true)
    expect(body.result.candidatesScanned).toBe(12)
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          dryRun: true,
          candidatesScanned: 12,
          repaired: 0
        })
      })
    )
  })

  it('truncates skipped/errors arrays to 50 in audit payload', async () => {
    const big = Array.from({ length: 200 }, (_, i) => ({
      paymentId: `exp-pay-${i}`,
      reason: `r-${i}`
    }))

    mockRepairPayments.mockResolvedValue({
      kind: 'expense_payments',
      candidatesScanned: 200,
      repaired: 0,
      skipped: big,
      errors: [],
      dryRun: false
    })

    await POST(buildRequest({ kind: 'expense_payments' }))

    const publishCall = mockPublishOutboxEvent.mock.calls[0][0] as {
      payload: { skipped: unknown[]; skippedCount: number }
    }

    expect(publishCall.payload.skipped).toHaveLength(50)
    expect(publishCall.payload.skippedCount).toBe(200)
  })

  it('returns 200 even when audit outbox publish fails (non-blocking)', async () => {
    mockRepairPayments.mockResolvedValue({
      kind: 'expense_payments',
      candidatesScanned: 1,
      repaired: 1,
      skipped: [],
      errors: [],
      dryRun: false
    })

    mockPublishOutboxEvent.mockRejectedValue(new Error('outbox down'))

    const response = await POST(buildRequest({ kind: 'expense_payments' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.repaired).toBe(1)
    expect(body.eventId).toBeNull()
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'payments_clp_repair_audit_publish'
        })
      })
    )
  })

  it('returns 500 with code=repair_failed when helper throws unexpected error', async () => {
    const boom = new Error('PG connection lost')

    mockRepairPayments.mockRejectedValue(boom)

    const response = await POST(buildRequest({ kind: 'expense_payments' }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.code).toBe('repair_failed')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      boom,
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'payments_clp_repair_endpoint'
        })
      })
    )
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })
})
