import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireTenantContext = vi.fn()
const mockListCampaignsForTenant = vi.fn()
const mockCreateCampaign = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args)
}))

vi.mock('@/lib/campaigns/campaign-store', () => ({
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args)
}))

vi.mock('@/lib/campaigns/tenant-scope', () => ({
  listCampaignsForTenant: (...args: unknown[]) => mockListCampaignsForTenant(...args)
}))

import { GET } from '@/app/api/campaigns/route'

describe('GET /api/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates the shared list request to the tenant-safe campaign scope helper', async () => {
    mockRequireTenantContext.mockResolvedValue({
      tenant: {
        tenantType: 'efeonce_internal',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: [],
        clientId: null
      },
      unauthorizedResponse: null
    })
    mockListCampaignsForTenant.mockResolvedValue({
      ok: true,
      items: [{ campaignId: 'cmp-1', displayName: 'Campaign 1' }]
    })

    const response = await GET(new Request('http://localhost/api/campaigns'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListCampaignsForTenant).toHaveBeenCalledWith({
      tenant: {
        tenantType: 'efeonce_internal',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: [],
        clientId: null
      },
      status: undefined,
      requestedSpaceId: undefined
    })
    expect(body).toEqual({
      items: [{ campaignId: 'cmp-1', displayName: 'Campaign 1' }],
      total: 1
    })
  })

  it('passes the requested spaceId through to the tenant-safe helper', async () => {
    mockRequireTenantContext.mockResolvedValue({
      tenant: {
        tenantType: 'efeonce_internal',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: [],
        clientId: null
      },
      unauthorizedResponse: null
    })
    mockListCampaignsForTenant.mockResolvedValue({ ok: true, items: [] })

    const response = await GET(new Request('http://localhost/api/campaigns?spaceId=spc-123&status=active'))

    expect(response.status).toBe(200)
    expect(mockListCampaignsForTenant).toHaveBeenCalledWith({
      tenant: {
        tenantType: 'efeonce_internal',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: [],
        clientId: null
      },
      status: 'active',
      requestedSpaceId: 'spc-123'
    })
  })

  it('returns 403 when the tenant-safe helper rejects the requested scope', async () => {
    mockRequireTenantContext.mockResolvedValue({
      tenant: {
        tenantType: 'client',
        campaignScopes: ['cmp-1'],
        routeGroups: ['client'],
        roleCodes: [],
        clientId: 'spc-client'
      },
      unauthorizedResponse: null
    })
    mockListCampaignsForTenant.mockResolvedValue({ ok: false, reason: 'forbidden' })

    const response = await GET(new Request('http://localhost/api/campaigns?spaceId=space-other'))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'Forbidden' })
  })
})
