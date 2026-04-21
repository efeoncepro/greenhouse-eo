import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceQuoteTenantOrganizationIds = vi.fn()
const mockSearchParties = vi.fn()
const mockEnforcePartyEndpointRateLimit = vi.fn()
const mockRecordPartyEndpointRequest = vi.fn()
const mockIsPartyEndpointRateLimitError = vi.fn()
const mockHasEntitlement = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/quotation-canonical-store', () => ({
  resolveFinanceQuoteTenantOrganizationIds: (...args: unknown[]) =>
    mockResolveFinanceQuoteTenantOrganizationIds(...args)
}))

vi.mock('@/lib/commercial/party', async () => {
  const actual = await vi.importActual('@/lib/commercial/party')

  return {
    ...actual,
    buildTenantEntitlementSubject: (tenant: unknown) => tenant,
    searchParties: (...args: unknown[]) => mockSearchParties(...args)
  }
})

vi.mock('@/lib/commercial/party/party-endpoint-rate-limit', () => ({
  enforcePartyEndpointRateLimit: (...args: unknown[]) => mockEnforcePartyEndpointRateLimit(...args),
  isPartyEndpointRateLimitError: (...args: unknown[]) => mockIsPartyEndpointRateLimitError(...args),
  recordPartyEndpointRequest: (...args: unknown[]) => mockRecordPartyEndpointRequest(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

import { GET } from './route'

describe('GET /api/commercial/parties/search', () => {
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
    mockResolveFinanceQuoteTenantOrganizationIds.mockResolvedValue(['org-1'])
    mockSearchParties.mockResolvedValue({
      parties: [
        {
          kind: 'party',
          organizationId: 'org-1',
          commercialPartyId: 'party-1',
          displayName: 'Acme Chile',
          lifecycleStage: 'opportunity',
          canAdopt: false
        },
        {
          kind: 'hubspot_candidate',
          hubspotCompanyId: 'hs-1',
          displayName: 'Acme Prospect',
          lifecycleStage: 'prospect',
          canAdopt: true
        }
      ],
      hasMore: false
    })
    mockHasEntitlement.mockReturnValue(true)
    mockIsPartyEndpointRateLimitError.mockReturnValue(false)
  })

  it('returns empty payload when q is shorter than 2 chars', async () => {
    const response = await GET(new Request('http://localhost/api/commercial/parties/search?q=a'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ parties: [], hasMore: false })
    expect(mockSearchParties).not.toHaveBeenCalled()
    expect(mockEnforcePartyEndpointRateLimit).not.toHaveBeenCalled()
  })

  it('merges parties and candidates, and preserves canAdopt when capability exists', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/commercial/parties/search?q=acme&includeStages=prospect,opportunity'
      )
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockResolveFinanceQuoteTenantOrganizationIds).toHaveBeenCalled()
    expect(mockSearchParties).toHaveBeenCalledWith('acme', expect.objectContaining({
      visibleOrganizationIds: ['org-1'],
      allowHubspotCandidates: true,
      includeStages: ['prospect', 'opportunity']
    }))
    expect(body.parties).toEqual([
      expect.objectContaining({ kind: 'party', organizationId: 'org-1' }),
      expect.objectContaining({ kind: 'hubspot_candidate', hubspotCompanyId: 'hs-1', canAdopt: true })
    ])
  })

  it('forces candidates canAdopt=false when actor lacks capability', async () => {
    mockHasEntitlement.mockReturnValue(false)

    const response = await GET(new Request('http://localhost/api/commercial/parties/search?q=acme'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.parties[1]).toEqual(
      expect.objectContaining({ kind: 'hubspot_candidate', canAdopt: false })
    )
  })

  it('returns 429 when the route is rate limited', async () => {
    const rateLimitError = {
      code: 'PARTY_ENDPOINT_RATE_LIMITED',
      statusCode: 429,
      retryAfterSeconds: 60,
      message: 'Rate limit exceeded for /api/commercial/parties/search.'
    }

    mockEnforcePartyEndpointRateLimit.mockRejectedValue(rateLimitError)
    mockIsPartyEndpointRateLimitError.mockReturnValue(true)

    const response = await GET(new Request('http://localhost/api/commercial/parties/search?q=acme'))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body).toEqual(
      expect.objectContaining({
        code: 'PARTY_ENDPOINT_RATE_LIMITED',
        retryAfterSeconds: 60
      })
    )
  })
})
