import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockBackfillFinanceSupplierProviderLinksInPostgres = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => mockRequireFinanceTenantContext()
}))

vi.mock('@/lib/finance/postgres-store', () => ({
  backfillFinanceSupplierProviderLinksInPostgres: (...args: unknown[]) =>
    mockBackfillFinanceSupplierProviderLinksInPostgres(...args)
}))

import { POST } from './route'

describe('POST /api/finance/suppliers/backfill-provider-links', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })

    mockBackfillFinanceSupplierProviderLinksInPostgres.mockResolvedValue({
      scanned: 3,
      linked: 3,
      items: [
        { supplierId: 'supplier-1', providerId: 'local-studio', providerName: 'Local Studio' }
      ]
    })
  })

  it('runs the provider-link backfill with the requested limit', async () => {
    const response = await POST(
      new Request('http://localhost/api/finance/suppliers/backfill-provider-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 25 })
      })
    )

    expect(response.status).toBe(200)
    expect(mockBackfillFinanceSupplierProviderLinksInPostgres).toHaveBeenCalledWith({ limit: 25 })

    const body = await response.json()

    expect(body).toMatchObject({
      scanned: 3,
      linked: 3
    })
  })

  it('falls back to the default limit when none is provided', async () => {
    await POST(
      new Request('http://localhost/api/finance/suppliers/backfill-provider-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    )

    expect(mockBackfillFinanceSupplierProviderLinksInPostgres).toHaveBeenCalledWith({ limit: 250 })
  })
})
