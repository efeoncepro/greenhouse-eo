import { NextResponse } from 'next/server'

import { assertMemberVisibleInPeopleScope, assertPeopleCapability, getPersonAccessForTenant } from '@/lib/people/access-scope'
import { requirePeopleTenantContext, requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getPersonMemberships, membershipExists, createMembership, updateMembership, deactivateMembership } from '@/lib/account-360/organization-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface MemberProfileRow extends Record<string, unknown> {
  identity_profile_id: string | null
}

const resolveProfileId = async (memberId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<MemberProfileRow>(`
    SELECT identity_profile_id
    FROM greenhouse_core.members
    WHERE member_id = $1
    LIMIT 1
  `, [memberId])

  return rows[0]?.identity_profile_id ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, accessContext, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await params
  const access = getPersonAccessForTenant(tenant, accessContext)

  assertPeopleCapability({ allowed: access.canViewMemberships })
  await assertMemberVisibleInPeopleScope({
    memberId,
    organizationId: null,
    accessContext
  })

  const profileId = await resolveProfileId(memberId)

  if (!profileId) {
    return NextResponse.json({ items: [], total: 0 })
  }

  const memberships = await getPersonMemberships(profileId)

  return NextResponse.json({ items: memberships, total: memberships.length })
}

export async function POST(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await params
  const profileId = await resolveProfileId(memberId)

  if (!profileId) {
    return NextResponse.json(
      { error: 'Este colaborador no tiene perfil de identidad vinculado.' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const organizationId = body.organizationId?.trim()

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId es requerido.' }, { status: 400 })
  }

  const exists = await membershipExists(profileId, organizationId)

  if (exists) {
    return NextResponse.json(
      { error: 'Esta persona ya tiene una membresía en esta organización.' },
      { status: 409 }
    )
  }

  const result = await createMembership({
    profileId,
    organizationId,
    membershipType: body.membershipType || 'team_member',
    roleLabel: body.roleLabel?.trim() || undefined,
    department: body.department?.trim() || undefined,
    spaceId: body.spaceId || undefined,
    isPrimary: body.isPrimary ?? false
  })

  return NextResponse.json(result, { status: 201 })
}

export async function PATCH(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const membershipId = body.membershipId?.trim()

  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId es requerido.' }, { status: 400 })
  }

  const result = await updateMembership(membershipId, {
    membershipType: body.membershipType,
    roleLabel: body.roleLabel,
    department: body.department,
    isPrimary: body.isPrimary
  })

  return NextResponse.json(result)
}

export async function DELETE(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const membershipId = body.membershipId?.trim()

  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId es requerido.' }, { status: 400 })
  }

  const result = await deactivateMembership(membershipId)

  return NextResponse.json(result)
}
