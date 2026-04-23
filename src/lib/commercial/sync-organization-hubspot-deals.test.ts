import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetOrganizationDetail = vi.fn()
const mockGetHubSpotGreenhouseCompanyDeals = vi.fn()
const mockGetExchangeRateOnOrBefore = vi.fn()
const mockLoadHubSpotOwnerBindingByOwnerId = vi.fn()
const mockUpsertCommercialDealFromHubSpotSource = vi.fn()
const mockQuery = vi.fn()

vi.mock('@/lib/account-360/organization-store', () => ({
  getOrganizationDetail: (...args: unknown[]) => mockGetOrganizationDetail(...args)
}))

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  getHubSpotGreenhouseCompanyDeals: (...args: unknown[]) => mockGetHubSpotGreenhouseCompanyDeals(...args)
}))

vi.mock('@/lib/finance/pricing/currency-converter', () => ({
  getExchangeRateOnOrBefore: (...args: unknown[]) => mockGetExchangeRateOnOrBefore(...args)
}))

vi.mock('@/lib/commercial/hubspot-owner-identity', () => ({
  loadHubSpotOwnerBindingByOwnerId: (...args: unknown[]) =>
    mockLoadHubSpotOwnerBindingByOwnerId(...args)
}))

vi.mock('@/lib/commercial/deals-store', () => ({
  upsertCommercialDealFromHubSpotSource: (...args: unknown[]) =>
    mockUpsertCommercialDealFromHubSpotSource(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

import {
  OrganizationHubSpotDealsSyncMissingCompanyIdError,
  syncOrganizationHubSpotDeals
} from './sync-organization-hubspot-deals'

describe('syncOrganizationHubSpotDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: 'hs-company-1'
    })
    mockGetHubSpotGreenhouseCompanyDeals.mockResolvedValue({
      hubspotCompanyId: 'hs-company-1',
      count: 2,
      deals: [
        {
          hubspotDealId: 'hs-deal-1',
          dealName: 'Aguas Andinas Historic Deal',
          amount: 120000,
          currency: 'CLP',
          pipelineId: 'default',
          pipelineLabel: 'Pipeline de ventas',
          stageId: 'closedwon',
          stageLabel: 'Cierre ganado',
          stageDisplayOrder: 5,
          probabilityPct: 100,
          isClosed: true,
          isWon: true,
          dealType: 'newbusiness',
          priority: 'HIGH',
          ownerHubspotUserId: '75788512',
          closeDate: '2026-04-22',
          createdAt: '2026-04-18T12:00:00.000Z',
          lastModifiedAt: '2026-04-23T12:00:00.000Z',
          source: {
            sourceSystem: 'hubspot',
            sourceObjectType: 'deal',
            sourceObjectId: 'hs-deal-1'
          }
        },
        {
          hubspotDealId: 'hs-deal-2',
          dealName: 'Aguas Andinas Open Deal',
          amount: 1000,
          currency: 'USD',
          pipelineId: 'default',
          pipelineLabel: 'Pipeline de ventas',
          stageId: 'appointmentscheduled',
          stageLabel: 'Cita programada',
          stageDisplayOrder: 0,
          probabilityPct: 20,
          isClosed: false,
          isWon: false,
          dealType: 'newbusiness',
          priority: 'MEDIUM',
          ownerHubspotUserId: '75788512',
          closeDate: '2026-04-30',
          createdAt: '2026-04-20T12:00:00.000Z',
          lastModifiedAt: '2026-04-23T13:00:00.000Z',
          source: {
            sourceSystem: 'hubspot',
            sourceObjectType: 'deal',
            sourceObjectId: 'hs-deal-2'
          }
        }
      ]
    })
    mockQuery.mockResolvedValue([{ space_id: 'space-1', client_id: 'cli-1' }])
    mockGetExchangeRateOnOrBefore.mockResolvedValue(900)
    mockLoadHubSpotOwnerBindingByOwnerId.mockResolvedValue({
      memberId: 'member-1',
      userId: 'user-1',
      email: 'jreyes@efeoncepro.com'
    })
    mockUpsertCommercialDealFromHubSpotSource
      .mockResolvedValueOnce({
        action: 'created',
        deal: { dealId: 'deal-1' }
      })
      .mockResolvedValueOnce({
        action: 'updated',
        deal: { dealId: 'deal-2' }
      })
  })

  it('hydrates all company deals and upserts them into the canonical commercial store', async () => {
    const result = await syncOrganizationHubSpotDeals({ organizationId: 'org-1' })

    expect(mockGetHubSpotGreenhouseCompanyDeals).toHaveBeenCalledWith('hs-company-1')
    expect(mockUpsertCommercialDealFromHubSpotSource).toHaveBeenCalledTimes(2)
    expect(mockUpsertCommercialDealFromHubSpotSource.mock.calls[0]?.[0]).toMatchObject({
      hubspot_deal_id: 'hs-deal-1',
      organization_id: 'org-1',
      client_id: 'cli-1',
      space_id: 'space-1',
      dealstage: 'closedwon',
      dealstage_label: 'Cierre ganado',
      pipeline_name: 'Pipeline de ventas',
      is_closed: true,
      is_won: true,
      amount_clp: 120000,
      exchange_rate_to_clp: 1
    })
    expect(mockUpsertCommercialDealFromHubSpotSource.mock.calls[1]?.[0]).toMatchObject({
      hubspot_deal_id: 'hs-deal-2',
      currency: 'USD',
      amount_clp: 900000,
      exchange_rate_to_clp: 900,
      deal_owner_user_id: 'user-1',
      deal_owner_email: 'jreyes@efeoncepro.com'
    })
    expect(result).toMatchObject({
      organizationId: 'org-1',
      hubspotCompanyId: 'hs-company-1',
      totalDealsRead: 2,
      created: 1,
      updated: 1,
      skipped: 0
    })
  })

  it('fails explicitly when the organization has no hubspot company binding', async () => {
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: null
    })

    await expect(syncOrganizationHubSpotDeals({ organizationId: 'org-1' })).rejects.toBeInstanceOf(
      OrganizationHubSpotDealsSyncMissingCompanyIdError
    )
  })
})
