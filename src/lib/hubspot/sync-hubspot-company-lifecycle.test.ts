import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  queryMock,
  withTransactionMock,
  getHubSpotGreenhouseCompanyProfileMock,
  publishCompanyLifecycleStageChangedMock
} = vi.hoisted(() => {
  const queryMock = vi.fn()
  const withTransactionMock = vi.fn()
  const getHubSpotGreenhouseCompanyProfileMock = vi.fn()
  const publishCompanyLifecycleStageChangedMock = vi.fn()

  return {
    queryMock,
    withTransactionMock,
    getHubSpotGreenhouseCompanyProfileMock,
    publishCompanyLifecycleStageChangedMock
  }
})

vi.mock('@/lib/db', () => ({
  query: queryMock,
  withTransaction: withTransactionMock
}))

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  getHubSpotGreenhouseCompanyProfile: getHubSpotGreenhouseCompanyProfileMock
}))

vi.mock('./company-lifecycle-events', () => ({
  publishCompanyLifecycleStageChanged: publishCompanyLifecycleStageChangedMock
}))

vi.mock('server-only', () => ({}))

describe('sync-hubspot-company-lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips inbound lifecycle writes when Greenhouse just wrote gh_last_write_at', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          organization_id: 'org-1',
          hubspot_company_id: 'hub-1',
          space_id: 'space-1',
          client_ids: ['client-1']
        }
      ])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          hubspot_company_id: 'hub-1',
          lifecyclestage: 'lead',
          lifecyclestage_source: 'hubspot_sync'
        }
      ])

    getHubSpotGreenhouseCompanyProfileMock.mockResolvedValueOnce({
      hubspotCompanyId: 'hub-1',
      identity: {
        hubspotCompanyId: 'hub-1',
        name: 'Acme',
        domain: 'acme.com',
        website: null,
        industry: null,
        country: null,
        city: null,
        state: null
      },
      lifecycle: {
        lifecyclestage: 'customer',
        hs_current_customer: 'true',
        hubspotTeamId: null,
        ghCommercialPartyId: 'EO-ORG-0001',
        ghLastQuoteAt: null,
        ghLastContractAt: null,
        ghActiveContractsCount: 1,
        ghLastWriteAt: new Date().toISOString(),
        ghMrrTier: 'active_client'
      },
      capabilities: {
        businessLines: [],
        serviceModules: []
      },
      owner: {
        hubspotOwnerId: null
      },
      source: {
        sourceSystem: 'hubspot_crm',
        sourceObjectType: 'company',
        sourceObjectId: 'hub-1'
      }
    })

    const { syncHubSpotCompanyLifecycles } = await import('./sync-hubspot-company-lifecycle')
    const result = await syncHubSpotCompanyLifecycles()

    expect(result).toEqual({
      processed: 1,
      updated: 0,
      changed: 0,
      skippedManualOverrides: 0,
      skippedRecentGreenhouseWrites: 1,
      errors: []
    })
    expect(withTransactionMock).not.toHaveBeenCalled()
    expect(publishCompanyLifecycleStageChangedMock).not.toHaveBeenCalled()
  })
})
