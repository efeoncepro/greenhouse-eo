import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetOrganizationDetail = vi.fn()
const mockGetOrganizationMemberships = vi.fn()
const mockUpdateOrganization = vi.fn()
const mockEnsureOrganizationContactMembership = vi.fn()
const mockGetHubSpotGreenhouseCompanyProfile = vi.fn()
const mockGetHubSpotGreenhouseCompanyContacts = vi.fn()

vi.mock('@/lib/account-360/organization-store', () => ({
  getOrganizationDetail: (...args: unknown[]) => mockGetOrganizationDetail(...args),
  getOrganizationMemberships: (...args: unknown[]) => mockGetOrganizationMemberships(...args),
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
  ensureOrganizationContactMembership: (...args: unknown[]) => mockEnsureOrganizationContactMembership(...args)
}))

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  getHubSpotGreenhouseCompanyProfile: (...args: unknown[]) =>
    mockGetHubSpotGreenhouseCompanyProfile(...args),
  getHubSpotGreenhouseCompanyContacts: (...args: unknown[]) =>
    mockGetHubSpotGreenhouseCompanyContacts(...args)
}))

import {
  OrganizationHubSpotSyncMissingCompanyIdError,
  OrganizationHubSpotSyncOrganizationNotFoundError,
  syncOrganizationHubSpotContacts
} from './sync-organization-hubspot-contacts'

describe('syncOrganizationHubSpotContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      organizationName: 'Acme',
      industry: 'Retail',
      country: 'Chile',
      hubspotCompanyId: 'hs-company-1'
    })
    mockGetOrganizationMemberships.mockResolvedValue([
      {
        canonicalEmail: 'existing@acme.com'
      }
    ])
    mockGetHubSpotGreenhouseCompanyProfile.mockResolvedValue({
      identity: {
        name: 'Acme Chile',
        industry: 'Food',
        country: 'CL'
      }
    })
    mockGetHubSpotGreenhouseCompanyContacts.mockResolvedValue({
      count: 3,
      contacts: [
        {
          hubspotContactId: 'hs-contact-existing',
          email: 'existing@acme.com',
          displayName: 'Existing Contact',
          firstName: 'Existing',
          lastName: 'Contact',
          jobTitle: 'Buyer'
        },
        {
          hubspotContactId: 'hs-contact-new',
          email: 'new.person@acme.com',
          displayName: 'New Person',
          firstName: 'New',
          lastName: 'Person',
          jobTitle: 'Procurement Lead'
        },
        {
          hubspotContactId: 'hs-contact-missing-email',
          email: null,
          displayName: 'No Email',
          firstName: null,
          lastName: null,
          jobTitle: null
        }
      ]
    })
    mockEnsureOrganizationContactMembership.mockResolvedValue('profile-2')
    mockUpdateOrganization.mockResolvedValue({ updated: true })
  })

  it('throws when the organization does not exist', async () => {
    mockGetOrganizationDetail.mockResolvedValue(null)

    await expect(
      syncOrganizationHubSpotContacts({ organizationId: 'org-missing' })
    ).rejects.toBeInstanceOf(OrganizationHubSpotSyncOrganizationNotFoundError)
  })

  it('throws when the organization has no HubSpot company binding', async () => {
    mockGetOrganizationDetail.mockResolvedValue({
      organizationId: 'org-1',
      hubspotCompanyId: null
    })

    await expect(
      syncOrganizationHubSpotContacts({ organizationId: 'org-1' })
    ).rejects.toBeInstanceOf(OrganizationHubSpotSyncMissingCompanyIdError)
  })

  it('updates organization fields and syncs only the missing contacts', async () => {
    const result = await syncOrganizationHubSpotContacts({ organizationId: 'org-1' })

    expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', {
      organizationName: 'Acme Chile',
      industry: 'Food',
      country: 'CL'
    })
    expect(mockEnsureOrganizationContactMembership).toHaveBeenCalledTimes(1)
    expect(mockEnsureOrganizationContactMembership).toHaveBeenCalledWith({
      organizationId: 'org-1',
      sourceSystem: 'hubspot',
      sourceObjectType: 'contact',
      sourceObjectId: 'hs-contact-new',
      fullName: 'New Person',
      canonicalEmail: 'new.person@acme.com',
      membershipType: 'contact',
      roleLabel: 'Procurement Lead',
      isPrimary: false
    })
    expect(result).toEqual({
      organizationId: 'org-1',
      hubspotCompanyId: 'hs-company-1',
      fieldsUpdated: ['organizationName', 'industry', 'country'],
      contactsSynced: 1,
      contactsSkipped: 2,
      totalContactsRead: 3
    })
  })
})
