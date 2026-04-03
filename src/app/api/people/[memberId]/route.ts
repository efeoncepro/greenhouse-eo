import { NextResponse } from 'next/server'

import { getPersonDetail } from '@/lib/people/get-person-detail'
import { assertMemberInPeopleOrganizationScope, resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { getPersonAccess } from '@/lib/people/permissions'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const organizationId = resolvePeopleOrganizationScope(request, tenant)

    await assertMemberInPeopleOrganizationScope(memberId, organizationId)

    const detail = await getPersonDetail({
      memberId,
      access: getPersonAccess(tenant.roleCodes),
      organizationId
    })

    return NextResponse.json(detail)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person detail.')
  }
}
