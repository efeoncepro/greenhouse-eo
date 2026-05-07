import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockSyncAllOrganizationServices = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))

vi.mock('@/lib/services/service-sync', () => ({
  syncAllOrganizationServices: (...args: unknown[]) => mockSyncAllOrganizationServices(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (error: unknown) => error instanceof Error ? error.message : 'Unknown error'
}))

import { POST } from './route'

describe('POST /api/admin/ops/services-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockHasEntitlement.mockReturnValue(true)
    mockSyncAllOrganizationServices.mockResolvedValue({
      organizations: 2,
      results: [
        { created: 1, updated: 2, skipped: 0, errors: [] },
        { created: 0, updated: 1, skipped: 3, errors: ['missing association'] }
      ]
    })
  })

  it('runs HubSpot services safety-net for callers with sync capability', async () => {
    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockHasEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'usr-1' }),
      'commercial.service_engagement.sync',
      'sync'
    )
    expect(mockSyncAllOrganizationServices).toHaveBeenCalledWith({
      createMissingSpace: true,
      createdBySource: 'admin:services-sync'
    })
    expect(body).toEqual({
      organizations: 2,
      totalCreated: 1,
      totalUpdated: 3,
      totalErrors: 1
    })
  })

  it('rejects callers without sync capability', async () => {
    mockHasEntitlement.mockReturnValue(false)

    const response = await POST()

    expect(response.status).toBe(403)
    expect(mockSyncAllOrganizationServices).not.toHaveBeenCalled()
  })
})
