import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockCan = vi.fn()
const mockQuery = vi.fn()
const mockWithTransaction = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mockCan(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { PATCH } from './route'

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/admin/finance/expenses/exp-1/economic-category', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

const params = { id: 'exp-1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdminTenantContext.mockResolvedValue({
    tenant: { userId: 'usr-admin', roleCodes: ['efeonce_admin'], routeGroups: ['internal', 'admin'] },
    errorResponse: null
  })
  mockCan.mockReturnValue(true)
  mockPublishOutboxEvent.mockResolvedValue('evt-1')
  mockWithTransaction.mockImplementation(async (cb: (c: unknown) => Promise<void>) => {
    await cb({ query: vi.fn().mockResolvedValue({ rowCount: 1 }) })
  })
})

describe('PATCH /api/admin/finance/expenses/[id]/economic-category', () => {
  it('returns 401 sin tenant', async () => {
    mockRequireAdminTenantContext.mockResolvedValue({ tenant: null, errorResponse: null })

    const res = await PATCH(buildRequest({}), { params: Promise.resolve(params) })

    expect(res.status).toBe(401)
  })

  it('returns 403 sin capability', async () => {
    mockCan.mockReturnValue(false)

    const res = await PATCH(buildRequest({ economicCategory: 'tax', reason: 'lorem ipsum xx' }), {
      params: Promise.resolve(params)
    })

    expect(res.status).toBe(403)
    expect(mockCan).toHaveBeenCalledWith(
      expect.any(Object),
      'finance.expenses.reclassify_economic_category',
      'update',
      'tenant'
    )
  })

  it('returns 400 con economicCategory invalido', async () => {
    const res = await PATCH(
      buildRequest({ economicCategory: 'not_a_valid_category', reason: 'because reasons exist' }),
      { params: Promise.resolve(params) }
    )

    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.code).toBe('validation_error')
  })

  it('returns 400 con reason muy corto', async () => {
    const res = await PATCH(buildRequest({ economicCategory: 'tax', reason: 'short' }), {
      params: Promise.resolve(params)
    })

    expect(res.status).toBe(400)
  })

  it('returns 404 si expense no existe', async () => {
    mockQuery.mockResolvedValueOnce([])

    const res = await PATCH(
      buildRequest({ economicCategory: 'tax', reason: 'audit reason explanation' }),
      { params: Promise.resolve(params) }
    )

    expect(res.status).toBe(404)
  })

  it('happy path: cambia categoria, audit log, outbox event', async () => {
    mockQuery.mockResolvedValueOnce([{ expense_id: 'exp-1', economic_category: 'vendor_cost_saas' }])

    const res = await PATCH(
      buildRequest({
        economicCategory: 'labor_cost_internal',
        reason: 'fue clasificado como supplier por bug del reconciler'
      }),
      { params: Promise.resolve(params) }
    )

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.changed).toBe(true)
    expect(body.result.previousCategory).toBe('vendor_cost_saas')
    expect(body.result.category).toBe('labor_cost_internal')
    expect(body.eventId).toBe('evt-1')

    expect(mockWithTransaction).toHaveBeenCalledOnce()
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'finance_expense',
        eventType: 'finance.expense.economic_category_changed',
        payload: expect.objectContaining({
          eventVersion: 'v1',
          expenseId: 'exp-1',
          previousCategory: 'vendor_cost_saas',
          newCategory: 'labor_cost_internal',
          confidence: 'manual',
          matchedRule: 'manual_reclassify'
        })
      })
    )
  })

  it('idempotente: misma categoria no cambia ni publica evento', async () => {
    mockQuery.mockResolvedValueOnce([{ expense_id: 'exp-1', economic_category: 'tax' }])

    const res = await PATCH(
      buildRequest({ economicCategory: 'tax', reason: 'audit no-op for verification' }),
      { params: Promise.resolve(params) }
    )

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.result.changed).toBe(false)
    expect(body.eventId).toBeNull()
    expect(mockWithTransaction).not.toHaveBeenCalled()
    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })

  it('continua si outbox publish falla (non-blocking)', async () => {
    mockQuery.mockResolvedValueOnce([{ expense_id: 'exp-1', economic_category: 'vendor_cost_saas' }])
    mockPublishOutboxEvent.mockRejectedValueOnce(new Error('outbox down'))

    const res = await PATCH(
      buildRequest({ economicCategory: 'tax', reason: 'audit reason explanation' }),
      { params: Promise.resolve(params) }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.result.changed).toBe(true)
    expect(body.eventId).toBeNull()
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'expense_economic_category_audit_publish' })
      })
    )
  })

  it('returns 500 con sanitized error si transaccion falla', async () => {
    mockQuery.mockResolvedValueOnce([{ expense_id: 'exp-1', economic_category: 'vendor_cost_saas' }])
    mockWithTransaction.mockRejectedValueOnce(new Error('PG transient'))

    const res = await PATCH(
      buildRequest({ economicCategory: 'tax', reason: 'audit reason explanation' }),
      { params: Promise.resolve(params) }
    )

    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.code).toBe('reclassify_failed')
    expect(body.error).not.toContain('PG transient') // sanitizado
  })
})
