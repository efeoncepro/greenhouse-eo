import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceQuoteTenantOrganizationIds = vi.fn()
const mockListCommercialDealsForOrganization = vi.fn()
const mockGetOrganizationDetail = vi.fn()
const mockSyncOrganizationHubSpotDeals = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/quotation-canonical-store', () => ({
  resolveFinanceQuoteTenantOrganizationIds: (...args: unknown[]) =>
    mockResolveFinanceQuoteTenantOrganizationIds(...args)
}))

vi.mock('@/lib/commercial/deals-store', () => ({
  listCommercialDealsForOrganization: (...args: unknown[]) =>
    mockListCommercialDealsForOrganization(...args)
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  getOrganizationDetail: (...args: unknown[]) => mockGetOrganizationDetail(...args)
}))

vi.mock('@/lib/commercial/sync-organization-hubspot-deals', () => ({
  syncOrganizationHubSpotDeals: (...args: unknown[]) => mockSyncOrganizationHubSpotDeals(...args)
}))

import { GET } from './route'

describe('GET /api/commercial/organizations/[id]/deals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: {
        userId: 'usr-1',
        clientId: 'cli-1',
        tenantType: 'efeonce_internal'
      },
      errorResponse: null
    })
    mockResolveFinanceQuoteTenantOrganizationIds.mockResolvedValue(['org-1'])
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: 'hs-company-1'
    })
    mockSyncOrganizationHubSpotDeals.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: 'hs-company-1',
      totalDealsRead: 2,
      created: 1,
      updated: 0,
      skipped: 1,
      deals: []
    })
  })

  it('re-reads the canonical store after a live HubSpot hydration', async () => {
    mockListCommercialDealsForOrganization
      .mockResolvedValueOnce([
        {
          dealId: 'local-deal',
          hubspotDealId: 'hs-existing',
          organizationId: 'org-1',
          dealName: 'Local only',
          dealstage: 'appointmentscheduled',
          dealstageLabel: 'Cita programada',
          pipelineName: 'Pipeline de ventas',
          amountClp: 1000,
          currency: 'CLP',
          isClosed: false,
          isWon: false,
          updatedAt: '2026-04-23T10:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          dealId: 'local-deal',
          hubspotDealId: 'hs-existing',
          organizationId: 'org-1',
          dealName: 'Local only',
          dealstage: 'appointmentscheduled',
          dealstageLabel: 'Cita programada',
          pipelineName: 'Pipeline de ventas',
          amountClp: 1000,
          currency: 'CLP',
          isClosed: false,
          isWon: false,
          updatedAt: '2026-04-23T10:00:00.000Z'
        },
        {
          dealId: 'hydrated-deal',
          hubspotDealId: 'hs-historic',
          organizationId: 'org-1',
          dealName: 'Aguas Andinas Historic Deal',
          dealstage: 'closedwon',
          dealstageLabel: 'Cierre ganado',
          pipelineName: 'Pipeline de ventas',
          amountClp: 120000,
          currency: 'CLP',
          isClosed: true,
          isWon: true,
          updatedAt: '2026-04-23T11:00:00.000Z'
        }
      ])

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncOrganizationHubSpotDeals).toHaveBeenCalledWith({ organizationId: 'org-1' })
    expect(mockListCommercialDealsForOrganization).toHaveBeenCalledTimes(2)
    expect(body.total).toBe(2)
    expect(body.items[1].hubspotDealId).toBe('hs-historic')
  })

  it('returns local deals when the organization has no hubspot company binding', async () => {
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: null
    })
    mockListCommercialDealsForOrganization.mockResolvedValue([
      {
        dealId: 'local-deal',
        hubspotDealId: 'hs-existing',
        organizationId: 'org-1',
        dealName: 'Local only',
        dealstage: 'appointmentscheduled',
        dealstageLabel: 'Cita programada',
        pipelineName: 'Pipeline de ventas',
        amountClp: 1000,
        currency: 'CLP',
        isClosed: false,
        isWon: false,
        updatedAt: '2026-04-23T10:00:00.000Z'
      }
    ])

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncOrganizationHubSpotDeals).not.toHaveBeenCalled()
    expect(body.total).toBe(1)
  })
})
