import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockListCampaignsForTenant = vi.fn()
const mockCreateCampaign = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/campaigns/tenant-scope', () => ({
  listCampaignsForTenant: (...args: unknown[]) => mockListCampaignsForTenant(...args)
}))

vi.mock('@/lib/campaigns/campaign-store', () => ({
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args)
}))

import { GET, POST } from '@/app/api/agency/campaigns/route'

describe('agency campaign routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns campaigns through the agency namespace', async () => {
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: {
        tenantType: 'efeonce_internal',
        userId: 'user-1',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: []
      },
      errorResponse: null
    })
    mockListCampaignsForTenant.mockResolvedValue({
      ok: true,
      items: [{ campaignId: 'cmp-1', displayName: 'Campaign 1' }]
    })

    const response = await GET(new Request('http://localhost/api/agency/campaigns?status=active'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListCampaignsForTenant).toHaveBeenCalledWith({
      tenant: {
        tenantType: 'efeonce_internal',
        userId: 'user-1',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: []
      },
      status: 'active',
      requestedSpaceId: undefined
    })
    expect(body).toEqual({
      items: [{ campaignId: 'cmp-1', displayName: 'Campaign 1' }],
      total: 1
    })
  })

  it('creates campaigns through the agency namespace', async () => {
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: {
        tenantType: 'efeonce_internal',
        userId: 'user-1',
        campaignScopes: [],
        routeGroups: ['internal'],
        roleCodes: []
      },
      errorResponse: null
    })
    mockCreateCampaign.mockResolvedValue({
      campaignId: 'cmp-2',
      displayName: 'Nueva campaña'
    })

    const response = await POST(
      new Request('http://localhost/api/agency/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: 'space-1',
          displayName: 'Nueva campaña',
          campaignType: 'launch'
        })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'space-1',
        displayName: 'Nueva campaña',
        campaignType: 'launch',
        ownerUserId: 'user-1',
        createdByUserId: 'user-1'
      })
    )
    expect(body).toEqual({
      campaignId: 'cmp-2',
      displayName: 'Nueva campaña'
    })
  })
})
