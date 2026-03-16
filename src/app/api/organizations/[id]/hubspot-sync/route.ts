import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  getOrganizationDetail,
  updateOrganization,
  findProfileByEmail,
  membershipExists,
  createMembership,
  createIdentityProfile
} from '@/lib/account-360/organization-store'
import {
  getHubSpotGreenhouseCompanyProfile,
  getHubSpotGreenhouseCompanyContacts
} from '@/lib/integrations/hubspot-greenhouse-service'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const org = await getOrganizationDetail(id)

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (!org.hubspotCompanyId) {
    return NextResponse.json({ error: 'Esta organización no tiene HubSpot Company ID' }, { status: 400 })
  }

  try {
    // Fetch HubSpot data in parallel
    const [company, contactsResponse] = await Promise.all([
      getHubSpotGreenhouseCompanyProfile(org.hubspotCompanyId),
      getHubSpotGreenhouseCompanyContacts(org.hubspotCompanyId)
    ])

    // Update organization fields from HubSpot
    const fieldsUpdated: string[] = []
    const updateData: Record<string, string> = {}

    if (company.identity.name && company.identity.name !== org.organizationName) {
      updateData.organizationName = company.identity.name
      fieldsUpdated.push('organizationName')
    }

    if (company.identity.industry && company.identity.industry !== org.industry) {
      updateData.industry = company.identity.industry
      fieldsUpdated.push('industry')
    }

    if (company.identity.country && company.identity.country !== org.country) {
      updateData.country = company.identity.country
      fieldsUpdated.push('country')
    }

    if (Object.keys(updateData).length > 0) {
      await updateOrganization(org.organizationId, updateData)
    }

    // Sync contacts as memberships
    let contactsSynced = 0
    let contactsSkipped = 0

    for (const contact of contactsResponse.contacts) {
      if (!contact.email) {
        contactsSkipped++
        continue
      }

      const profile = await findProfileByEmail(contact.email)

      if (profile) {
        const exists = await membershipExists(profile.profileId, org.organizationId)

        if (!exists) {
          await createMembership({
            profileId: profile.profileId,
            organizationId: org.organizationId,
            membershipType: 'contact',
            roleLabel: contact.jobTitle ?? undefined
          })
          contactsSynced++
        } else {
          contactsSkipped++
        }
      } else {
        // Create new identity profile then membership
        const displayName = contact.displayName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email
        const profileId = await createIdentityProfile({
          sourceSystem: 'hubspot',
          sourceObjectType: 'contact',
          sourceObjectId: contact.hubspotContactId,
          fullName: displayName,
          canonicalEmail: contact.email
        })

        await createMembership({
          profileId,
          organizationId: org.organizationId,
          membershipType: 'contact',
          roleLabel: contact.jobTitle ?? undefined
        })
        contactsSynced++
      }
    }

    return NextResponse.json({
      synced: true,
      fieldsUpdated,
      contactsSynced,
      contactsSkipped
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar con HubSpot'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
