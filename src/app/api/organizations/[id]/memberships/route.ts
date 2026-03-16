import { NextResponse } from 'next/server'

import { requireInternalTenantContext, requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationMemberships, createMembership } from '@/lib/account-360/organization-store'

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

  if (!body.profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  const result = await createMembership({
    profileId: body.profileId,
    organizationId: id,
    spaceId: body.spaceId,
    membershipType: body.membershipType || 'team_member',
    roleLabel: body.roleLabel,
    department: body.department,
    isPrimary: body.isPrimary ?? false
  })

  return NextResponse.json(result, { status: 201 })
}
