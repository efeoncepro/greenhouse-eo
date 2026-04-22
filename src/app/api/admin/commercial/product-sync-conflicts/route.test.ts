import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockListProductSyncConflicts = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))

vi.mock('@/lib/commercial/product-catalog/product-sync-conflicts-store', () => ({
  listProductSyncConflicts: (...args: unknown[]) => mockListProductSyncConflicts(...args)
}))

import { GET } from './route'

describe('GET /api/admin/commercial/product-sync-conflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockHasEntitlement.mockReturnValue(true)
    mockListProductSyncConflicts.mockResolvedValue({
      items: [{ conflictId: 'conf-1', resolutionStatus: 'pending' }],
      total: 1,
      summary: {
        totalUnresolved: 1,
        byType: {
          orphan_in_hubspot: 0,
          orphan_in_greenhouse: 1,
          field_drift: 0,
          sku_collision: 0,
          archive_mismatch: 0
        }
      }
    })
  })

  it('returns filtered conflicts for admin callers', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/admin/commercial/product-sync-conflicts?q=retainer&type=field_drift&status=pending&limit=10&offset=20'
      )
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListProductSyncConflicts).toHaveBeenCalledWith({
      query: 'retainer',
      conflictType: 'field_drift',
      resolutionStatus: 'pending',
      limit: 10,
      offset: 20
    })
    expect(body.total).toBe(1)
  })

  it('rejects unsupported conflict types', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/commercial/product-sync-conflicts?type=bad_type')
    )

    expect(response.status).toBe(400)
    expect(mockListProductSyncConflicts).not.toHaveBeenCalled()
  })
})
