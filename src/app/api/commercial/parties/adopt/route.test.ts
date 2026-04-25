import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockEnforcePartyEndpointRateLimit = vi.fn()
const mockRecordPartyEndpointRequest = vi.fn()
const mockIsPartyEndpointRateLimitError = vi.fn()
const mockFindMaterializedPartyByHubSpotCompanyId = vi.fn()
const mockGetHubSpotCandidateByCompanyId = vi.fn()
const mockFindClientIdForOrganization = vi.fn()
const mockCreatePartyFromHubSpotCompany = vi.fn()
const mockInstantiateClientForParty = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

vi.mock('@/lib/commercial/party', async () => {
  const actual = await vi.importActual('@/lib/commercial/party')

  return {
    ...actual,
    buildTenantEntitlementSubject: (tenant: unknown) => tenant,
    createPartyFromHubSpotCompany: (...args: unknown[]) => mockCreatePartyFromHubSpotCompany(...args),
    instantiateClientForParty: (...args: unknown[]) => mockInstantiateClientForParty(...args)
  }
})

vi.mock('@/lib/commercial/party/hubspot-candidate-reader', () => ({
  findMaterializedPartyByHubSpotCompanyId: (...args: unknown[]) =>
    mockFindMaterializedPartyByHubSpotCompanyId(...args),
  getHubSpotCandidateByCompanyId: (...args: unknown[]) =>
    mockGetHubSpotCandidateByCompanyId(...args),
  findClientIdForOrganization: (...args: unknown[]) => mockFindClientIdForOrganization(...args)
}))

vi.mock('@/lib/commercial/party/party-endpoint-rate-limit', () => ({
  enforcePartyEndpointRateLimit: (...args: unknown[]) => mockEnforcePartyEndpointRateLimit(...args),
  isPartyEndpointRateLimitError: (...args: unknown[]) => mockIsPartyEndpointRateLimitError(...args),
  recordPartyEndpointRequest: (...args: unknown[]) => mockRecordPartyEndpointRequest(...args)
}))

import { POST } from './route'

describe('POST /api/commercial/parties/adopt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: {
        userId: 'usr-1',
        clientId: 'cli-1',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_admin'],
        primaryRoleCode: 'efeonce_admin',
        routeGroups: ['finance'],
        authorizedViews: [],
        projectScopes: [],
        campaignScopes: [],
        businessLines: [],
        serviceModules: [],
        portalHomePath: '/finance'
      },
      errorResponse: null
    })
    mockHasEntitlement.mockReturnValue(true)
    mockIsPartyEndpointRateLimitError.mockReturnValue(false)
    mockFindMaterializedPartyByHubSpotCompanyId.mockResolvedValue(null)
    mockGetHubSpotCandidateByCompanyId.mockResolvedValue({
      hubspotCompanyId: 'hs-1',
      displayName: 'Acme Prospect',
      lifecycleStage: 'prospect',
      hubspotLifecycleStage: 'lead',
      domain: 'acme.com',
      lastActivityAt: '2026-04-21T12:00:00.000Z'
    })
    mockCreatePartyFromHubSpotCompany.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      lifecycleStage: 'prospect',
      created: true
    })
    mockInstantiateClientForParty.mockResolvedValue({
      clientId: 'cli-2'
    })
    mockFindClientIdForOrganization.mockResolvedValue('cli-existing')
  })

  it('returns 403 before touching domain helpers when capability is missing', async () => {
    mockHasEntitlement.mockReturnValue(false)

    const response = await POST(
      new Request('http://localhost/api/commercial/parties/adopt', {
        method: 'POST',
        body: JSON.stringify({ hubspotCompanyId: 'hs-1' })
      })
    )

    expect(response.status).toBe(403)
    expect(mockFindMaterializedPartyByHubSpotCompanyId).not.toHaveBeenCalled()
    expect(mockCreatePartyFromHubSpotCompany).not.toHaveBeenCalled()
  })

  it('returns the existing party on idempotent hit', async () => {
    mockFindMaterializedPartyByHubSpotCompanyId.mockResolvedValue({
      organizationId: 'org-existing',
      commercialPartyId: 'party-existing',
      lifecycleStage: 'opportunity'
    })

    const response = await POST(
      new Request('http://localhost/api/commercial/parties/adopt', {
        method: 'POST',
        body: JSON.stringify({ hubspotCompanyId: 'hs-1' })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePartyFromHubSpotCompany).not.toHaveBeenCalled()
    expect(body).toEqual(
      expect.objectContaining({
        organizationId: 'org-existing',
        commercialPartyId: 'party-existing',
        lifecycleStage: 'opportunity'
      })
    )
  })

  it('creates a new party from a HubSpot candidate', async () => {
    const response = await POST(
      new Request('http://localhost/api/commercial/parties/adopt', {
        method: 'POST',
        body: JSON.stringify({ hubspotCompanyId: 'hs-1' })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreatePartyFromHubSpotCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        hubspotCompanyId: 'hs-1',
        hubspotLifecycleStage: 'lead',
        defaultName: 'Acme Prospect'
      })
    )
    expect(body).toEqual(
      expect.objectContaining({
        organizationId: 'org-1',
        commercialPartyId: 'party-1',
        lifecycleStage: 'prospect',
        clientId: null
      })
    )
  })

  it('bootstraps client when adopt resolves active_client', async () => {
    mockGetHubSpotCandidateByCompanyId.mockResolvedValue({
      hubspotCompanyId: 'hs-1',
      displayName: 'Acme Customer',
      lifecycleStage: 'active_client',
      hubspotLifecycleStage: 'customer',
      domain: 'acme.com',
      lastActivityAt: '2026-04-21T12:00:00.000Z'
    })
    mockCreatePartyFromHubSpotCompany.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      lifecycleStage: 'active_client',
      created: true
    })

    const response = await POST(
      new Request('http://localhost/api/commercial/parties/adopt', {
        method: 'POST',
        body: JSON.stringify({ hubspotCompanyId: 'hs-1' })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockInstantiateClientForParty).toHaveBeenCalled()
    expect(body).toEqual(
      expect.objectContaining({
        organizationId: 'org-1',
        lifecycleStage: 'active_client',
        clientId: 'cli-2'
      })
    )
  })
})
