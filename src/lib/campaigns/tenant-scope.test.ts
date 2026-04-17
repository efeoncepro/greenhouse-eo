import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExecute = vi.fn()
const mockGetCampaign = vi.fn()
const mockListCampaigns = vi.fn()
const mockListAllCampaigns = vi.fn()
const mockListCampaignsBySpaceIds = vi.fn()

const mockSpacesQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  execute: mockExecute
}

const mockGetDb = vi.fn(async () => ({
  selectFrom: vi.fn(() => mockSpacesQueryBuilder)
}))

vi.mock('@/lib/db', () => ({
  getDb: () => mockGetDb()
}))

vi.mock('./campaign-store', () => ({
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  listAllCampaigns: (...args: unknown[]) => mockListAllCampaigns(...args),
  listCampaignsBySpaceIds: (...args: unknown[]) => mockListCampaignsBySpaceIds(...args)
}))

import {
  getCampaignForTenant,
  listCampaignsForTenant,
  resolveTenantCampaignSpaceIds
} from './tenant-scope'

describe('campaign tenant scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSpacesQueryBuilder.select.mockReturnThis()
    mockSpacesQueryBuilder.where.mockReturnThis()
    mockSpacesQueryBuilder.orderBy.mockReturnThis()
  })

  it('prefers tenant.spaceId for client campaign lists', async () => {
    mockListCampaigns.mockResolvedValue([{ campaignId: 'cmp-1', spaceId: 'space-1' }])

    const result = await listCampaignsForTenant({
      tenant: {
        tenantType: 'client',
        clientId: 'client-1',
        spaceId: 'space-1',
        campaignScopes: [],
        routeGroups: ['client']
      } as never,
      status: 'active'
    })

    expect(result).toEqual({
      ok: true,
      items: [{ campaignId: 'cmp-1', spaceId: 'space-1' }]
    })
    expect(mockListCampaigns).toHaveBeenCalledWith('space-1', {
      status: 'active',
      campaignIds: undefined
    })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('resolves client spaces from greenhouse_core.spaces when tenant.spaceId is missing', async () => {
    mockExecute.mockResolvedValue([{ space_id: 'space-1' }, { space_id: 'space-2' }])
    mockListCampaignsBySpaceIds.mockResolvedValue([
      { campaignId: 'cmp-1', spaceId: 'space-1' },
      { campaignId: 'cmp-2', spaceId: 'space-2' }
    ])

    const allowedSpaceIds = await resolveTenantCampaignSpaceIds({
      tenantType: 'client',
      clientId: 'client-1'
    } as never)

    const result = await listCampaignsForTenant({
      tenant: {
        tenantType: 'client',
        clientId: 'client-1',
        campaignScopes: [],
        routeGroups: ['client']
      } as never
    })

    expect(allowedSpaceIds).toEqual(['space-1', 'space-2'])
    expect(mockListCampaignsBySpaceIds).toHaveBeenCalledWith(['space-1', 'space-2'], {
      status: undefined,
      campaignIds: undefined
    })
    expect(result).toEqual({
      ok: true,
      items: [
        { campaignId: 'cmp-1', spaceId: 'space-1' },
        { campaignId: 'cmp-2', spaceId: 'space-2' }
      ]
    })
  })

  it('rejects a client list request for a space outside the tenant scope', async () => {
    mockExecute.mockResolvedValue([{ space_id: 'space-1' }])

    const result = await listCampaignsForTenant({
      tenant: {
        tenantType: 'client',
        clientId: 'client-1',
        campaignScopes: [],
        routeGroups: ['client']
      } as never,
      requestedSpaceId: 'space-2'
    })

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('allows client detail access when the campaign belongs to an allowed space even without campaignScopes', async () => {
    mockExecute.mockResolvedValue([{ space_id: 'space-1' }])
    mockGetCampaign.mockResolvedValue({
      campaignId: 'cmp-1',
      spaceId: 'space-1'
    })

    const result = await getCampaignForTenant({
      tenant: {
        tenantType: 'client',
        clientId: 'client-1',
        campaignScopes: [],
        routeGroups: ['client']
      } as never,
      campaignId: 'cmp-1'
    })

    expect(result).toEqual({
      ok: true,
      campaign: {
        campaignId: 'cmp-1',
        spaceId: 'space-1'
      }
    })
  })

  it('blocks detail access when campaignScopes exclude the requested campaign', async () => {
    const result = await getCampaignForTenant({
      tenant: {
        tenantType: 'efeonce_internal',
        campaignScopes: ['cmp-2'],
        routeGroups: ['internal']
      } as never,
      campaignId: 'cmp-1'
    })

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(mockGetCampaign).not.toHaveBeenCalled()
  })
})
