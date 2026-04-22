import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockResolveFinanceQuoteTenantOrganizationIds = vi.fn()
const mockQuery = vi.fn()
const mockGetOrganizationDetail = vi.fn()
const mockSyncOrganizationHubSpotContacts = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/quotation-canonical-store', () => ({
  resolveFinanceQuoteTenantOrganizationIds: (...args: unknown[]) =>
    mockResolveFinanceQuoteTenantOrganizationIds(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  getOrganizationDetail: (...args: unknown[]) => mockGetOrganizationDetail(...args)
}))

vi.mock('@/lib/account-360/sync-organization-hubspot-contacts', () => ({
  syncOrganizationHubSpotContacts: (...args: unknown[]) => mockSyncOrganizationHubSpotContacts(...args)
}))

import { GET } from './route'

describe('GET /api/commercial/organizations/[id]/contacts', () => {
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
    mockSyncOrganizationHubSpotContacts.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: 'hs-company-1',
      fieldsUpdated: [],
      contactsSynced: 1,
      contactsSkipped: 0,
      totalContactsRead: 1
    })
  })

  it('returns local contacts without triggering HubSpot hydration when mirror data exists', async () => {
    mockQuery.mockResolvedValue([
      {
        identity_profile_id: 'profile-1',
        full_name: 'Jane Doe',
        canonical_email: 'jane@acme.com',
        job_title: 'Buyer',
        role_label: 'Buyer',
        department: 'Procurement',
        membership_type: 'contact',
        is_primary: true
      }
    ])

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncOrganizationHubSpotContacts).not.toHaveBeenCalled()
    expect(body).toEqual({
      items: [
        {
          identityProfileId: 'profile-1',
          fullName: 'Jane Doe',
          canonicalEmail: 'jane@acme.com',
          jobTitle: 'Buyer',
          roleLabel: 'Buyer',
          department: 'Procurement',
          membershipType: 'contact',
          isPrimary: true
        }
      ],
      total: 1
    })
  })

  it('hydrates from HubSpot when the local mirror has no contacts yet', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          identity_profile_id: 'profile-2',
          full_name: 'Marco Moreno',
          canonical_email: 'marco@carozzi.cl',
          job_title: null,
          role_label: 'Gerente de Trade',
          department: null,
          membership_type: 'contact',
          is_primary: false
        }
      ])

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncOrganizationHubSpotContacts).toHaveBeenCalledWith({ organizationId: 'org-1' })
    expect(mockQuery).toHaveBeenCalledTimes(2)
    expect(body).toEqual({
      items: [
        {
          identityProfileId: 'profile-2',
          fullName: 'Marco Moreno',
          canonicalEmail: 'marco@carozzi.cl',
          jobTitle: null,
          roleLabel: 'Gerente de Trade',
          department: null,
          membershipType: 'contact',
          isPrimary: false
        }
      ],
      total: 1
    })
  })

  it('returns empty when the organization has no local contacts and no HubSpot company binding', async () => {
    mockQuery.mockResolvedValue([])
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: null
    })

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncOrganizationHubSpotContacts).not.toHaveBeenCalled()
    expect(body).toEqual({ items: [], total: 0 })
  })
})
