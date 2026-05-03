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
  new Request('http://localhost/api/admin/finance/income/inc-1/economic-category', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

const params = { id: 'inc-1' }

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

describe('PATCH /api/admin/finance/income/[id]/economic-category', () => {
  it('returns 401 sin tenant', async () => {
    mockRequireAdminTenantContext.mockResolvedValue({ tenant: null, errorResponse: null })

    const res = await PATCH(buildRequest({}), { params: Promise.resolve(params) })

    expect(res.status).toBe(401)
  })

  it('returns 403 sin capability finance.income.reclassify_economic_category', async () => {
    mockCan.mockReturnValue(false)

    const res = await PATCH(
      buildRequest({ economicCategory: 'service_revenue', reason: 'reason long enough' }),
      { params: Promise.resolve(params) }
    )

    expect(res.status).toBe(403)
    expect(mockCan).toHaveBeenCalledWith(
      expect.any(Object),
      'finance.income.reclassify_economic_category',
      'update',
      'tenant'
    )
  })

  it('returns 400 con economicCategory invalido', async () => {
    const res = await PATCH(
      buildRequest({ economicCategory: 'labor_cost_internal', reason: 'long enough reason 1' }),
      { params: Promise.resolve(params) }
    )

    expect(res.status).toBe(400)
  })

  it('happy path: cambia categoria + audit + outbox v1', async () => {
    mockQuery.mockResolvedValueOnce([{ income_id: 'inc-1', economic_category: 'service_revenue' }])

    const res = await PATCH(
      buildRequest({
        economicCategory: 'factoring_proceeds',
        reason: 'esto era factoring del 2026-04-15 mal clasificado'
      }),
      { params: Promise.resolve(params) }
    )

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.result.changed).toBe(true)
    expect(body.result.previousCategory).toBe('service_revenue')
    expect(body.result.category).toBe('factoring_proceeds')

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'finance_income',
        eventType: 'finance.income.economic_category_changed',
        payload: expect.objectContaining({
          eventVersion: 'v1',
          incomeId: 'inc-1',
          newCategory: 'factoring_proceeds'
        })
      })
    )
  })

  it('idempotente: misma categoria no rebota', async () => {
    mockQuery.mockResolvedValueOnce([
      { income_id: 'inc-1', economic_category: 'factoring_proceeds' }
    ])

    const res = await PATCH(
      buildRequest({ economicCategory: 'factoring_proceeds', reason: 'no-op verification' }),
      { params: Promise.resolve(params) }
    )

    const body = await res.json()

    expect(body.result.changed).toBe(false)
    expect(body.eventId).toBeNull()
  })
})
