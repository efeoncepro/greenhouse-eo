import { NextResponse } from 'next/server'

import { requireInternalTenantContext, requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationMemberships, createIdentityProfile, createMembership } from '@/lib/account-360/organization-store'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const memberships = await getOrganizationMemberships(id)

  return NextResponse.json({ items: memberships, total: memberships.length })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const canonicalEmail = typeof body.canonicalEmail === 'string' ? body.canonicalEmail.trim().toLowerCase() : ''

  if (!profileId && (!fullName || !canonicalEmail)) {
    return NextResponse.json({ error: 'profileId o fullName + canonicalEmail son requeridos' }, { status: 400 })
  }

  const resolvedProfileId = profileId || await createIdentityProfile({
    sourceSystem: 'greenhouse_manual',
    sourceObjectType: 'organization_contact',
    sourceObjectId: `${id}:${canonicalEmail}`,
    fullName,
    canonicalEmail
  })

  const result = await createMembership({
    profileId: resolvedProfileId,
    organizationId: id,
    spaceId: body.spaceId,
    membershipType: body.membershipType || 'team_member',
    roleLabel: body.roleLabel,
    department: body.department,
    isPrimary: body.isPrimary ?? false
  })

  return NextResponse.json(result, { status: 201 })
}
