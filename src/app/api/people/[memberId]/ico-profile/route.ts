import { NextResponse } from 'next/server'

import { assertMemberInPeopleOrganizationScope, resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { getPersonIcoProfile } from '@/lib/person-360/get-person-ico-profile'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const { searchParams } = new URL(request.url)
    const trend = Math.min(24, Math.max(1, Number(searchParams.get('trend') || '6')))
    const organizationId = resolvePeopleOrganizationScope(request, tenant)

    await assertMemberInPeopleOrganizationScope(memberId, organizationId)

    const profile = await getPersonIcoProfile(memberId, trend, { organizationId })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('GET /api/people/[memberId]/ico-profile failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
