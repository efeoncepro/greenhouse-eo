import { NextResponse } from 'next/server'

import { MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE } from '@/lib/admin/tenant-member-provisioning-shared'
import { provisionTenantUsersFromHubSpotContacts } from '@/lib/admin/tenant-member-provisioning'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const normalizeContactIds = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const contactIds = normalizeContactIds(body.contactIds)

  const contactsSnapshotToken =
    typeof body.contactsSnapshotToken === 'string' && body.contactsSnapshotToken.trim()
      ? body.contactsSnapshotToken.trim()
      : null

  if (contactIds.length === 0) {
    return NextResponse.json({ error: 'At least one HubSpot contact ID is required.' }, { status: 400 })
  }

  if (contactIds.length > MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE) {
    return NextResponse.json(
      {
        error: `At most ${MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE} HubSpot contact IDs can be provisioned per request.`
      },
      { status: 400 }
    )
  }

  const { id } = await params

  try {
    const summary = await provisionTenantUsersFromHubSpotContacts({
      clientId: id,
      actorUserId: tenant.userId,
      contactIds,
      contactsSnapshotToken
    })

    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provisioning error.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
