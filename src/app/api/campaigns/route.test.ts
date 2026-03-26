import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireTenantContext = vi.fn()
const mockListCampaigns = vi.fn()
const mockListAllCampaigns = vi.fn()
const mockCreateCampaign = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args)
}))

vi.mock('@/lib/campaigns/campaign-store', () => ({
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  listAllCampaigns: (...args: unknown[]) => mockListAllCampaigns(...args),
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args)
}))

import { GET } from '@/app/api/campaigns/route'

describe('GET /api/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all campaigns for internal users when no spaceId is provided', async () => {
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
    mockListAllCampaigns.mockResolvedValue([
      { campaignId: 'cmp-1', displayName: 'Campaign 1' }
    ])

    const response = await GET(new Request('http://localhost/api/campaigns'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListAllCampaigns).toHaveBeenCalledWith({ status: undefined, campaignIds: undefined })
    expect(mockListCampaigns).not.toHaveBeenCalled()
    expect(body).toEqual({
      items: [{ campaignId: 'cmp-1', displayName: 'Campaign 1' }],
      total: 1
    })
  })

  it('filters internal users by spaceId when provided', async () => {
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
    mockListCampaigns.mockResolvedValue([])

    const response = await GET(new Request('http://localhost/api/campaigns?spaceId=spc-123&status=active'))

    expect(response.status).toBe(200)
    expect(mockListCampaigns).toHaveBeenCalledWith('spc-123', { status: 'active', campaignIds: undefined })
    expect(mockListAllCampaigns).not.toHaveBeenCalled()
  })

  it('uses the tenant clientId for client users', async () => {
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
    mockListCampaigns.mockResolvedValue([])

    const response = await GET(new Request('http://localhost/api/campaigns'))

    expect(response.status).toBe(200)
    expect(mockListCampaigns).toHaveBeenCalledWith('spc-client', { status: undefined, campaignIds: ['cmp-1'] })
    expect(mockListAllCampaigns).not.toHaveBeenCalled()
  })
})
