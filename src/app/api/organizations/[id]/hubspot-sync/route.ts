import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  getOrganizationDetail
} from '@/lib/account-360/organization-store'
import {
  OrganizationHubSpotSyncMissingCompanyIdError,
  OrganizationHubSpotSyncOrganizationNotFoundError,
  syncOrganizationHubSpotContacts
} from '@/lib/account-360/sync-organization-hubspot-contacts'

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
    const result = await syncOrganizationHubSpotContacts({ organizationId: org.organizationId })

    return NextResponse.json({
      synced: true,
      fieldsUpdated: result.fieldsUpdated,
      contactsSynced: result.contactsSynced,
      contactsSkipped: result.contactsSkipped,
      totalContactsRead: result.totalContactsRead
    })
  } catch (err) {
    if (err instanceof OrganizationHubSpotSyncOrganizationNotFoundError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (err instanceof OrganizationHubSpotSyncMissingCompanyIdError) {
      return NextResponse.json({ error: 'Esta organización no tiene HubSpot Company ID' }, { status: 400 })
    }

    const message = err instanceof Error ? err.message : 'Error al sincronizar con HubSpot'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
