import 'server-only'

import { resolveContactDisplayName } from '@/lib/contacts/contact-display'
import {
  ensureOrganizationContactMembership,
  getOrganizationDetail,
  getOrganizationMemberships,
  updateOrganization
} from '@/lib/account-360/organization-store'
import {
  getHubSpotGreenhouseCompanyContacts,
  getHubSpotGreenhouseCompanyProfile
} from '@/lib/integrations/hubspot-greenhouse-service'

export class OrganizationHubSpotSyncOrganizationNotFoundError extends Error {
  constructor(organizationId: string) {
    super(`Organization ${organizationId} not found`)
    this.name = 'OrganizationHubSpotSyncOrganizationNotFoundError'
  }
}

export class OrganizationHubSpotSyncMissingCompanyIdError extends Error {
  constructor(organizationId: string) {
    super(`Organization ${organizationId} has no HubSpot Company ID`)
    this.name = 'OrganizationHubSpotSyncMissingCompanyIdError'
  }
}

export interface SyncOrganizationHubSpotContactsResult {
  organizationId: string
  hubspotCompanyId: string
  fieldsUpdated: string[]
  contactsSynced: number
  contactsSkipped: number
  totalContactsRead: number
}

export const syncOrganizationHubSpotContacts = async ({
  organizationId
}: {
  organizationId: string
}): Promise<SyncOrganizationHubSpotContactsResult> => {
  const organization = await getOrganizationDetail(organizationId)

  if (!organization) {
    throw new OrganizationHubSpotSyncOrganizationNotFoundError(organizationId)
  }

  if (!organization.hubspotCompanyId) {
    throw new OrganizationHubSpotSyncMissingCompanyIdError(organization.organizationId)
  }

  const [company, contactsResponse, memberships] = await Promise.all([
    getHubSpotGreenhouseCompanyProfile(organization.hubspotCompanyId),
    getHubSpotGreenhouseCompanyContacts(organization.hubspotCompanyId),
    getOrganizationMemberships(organization.organizationId)
  ])

  const fieldsUpdated: string[] = []
  const updateData: Record<string, string> = {}

  if (company.identity.name && company.identity.name !== organization.organizationName) {
    updateData.organizationName = company.identity.name
    fieldsUpdated.push('organizationName')
  }

  if (company.identity.industry && company.identity.industry !== organization.industry) {
    updateData.industry = company.identity.industry
    fieldsUpdated.push('industry')
  }

  if (company.identity.country && company.identity.country !== organization.country) {
    updateData.country = company.identity.country
    fieldsUpdated.push('country')
  }

  if (Object.keys(updateData).length > 0) {
    await updateOrganization(organization.organizationId, updateData)
  }

  const existingContactEmails = new Set(
    memberships
      .map(membership => membership.canonicalEmail?.trim().toLowerCase() || null)
      .filter((email): email is string => Boolean(email))
  )

  let contactsSynced = 0
  let contactsSkipped = 0

  for (const contact of contactsResponse.contacts) {
    const canonicalEmail = contact.email?.trim().toLowerCase() || null

    if (!canonicalEmail) {
      contactsSkipped++
      continue
    }

    if (existingContactEmails.has(canonicalEmail)) {
      contactsSkipped++
      continue
    }

    const profileId = await ensureOrganizationContactMembership({
      organizationId: organization.organizationId,
      sourceSystem: 'hubspot',
      sourceObjectType: 'contact',
      sourceObjectId: contact.hubspotContactId,
      fullName: resolveContactDisplayName(contact),
      canonicalEmail,
      membershipType: 'contact',
      roleLabel: contact.jobTitle ?? null,
      isPrimary: false
    })

    if (profileId) {
      contactsSynced++
      existingContactEmails.add(canonicalEmail)
    } else {
      contactsSkipped++
    }
  }

  return {
    organizationId: organization.organizationId,
    hubspotCompanyId: organization.hubspotCompanyId,
    fieldsUpdated,
    contactsSynced,
    contactsSkipped,
    totalContactsRead: contactsResponse.count
  }
}
