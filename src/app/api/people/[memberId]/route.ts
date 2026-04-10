import { NextResponse } from 'next/server'

import { assertMemberVisibleInPeopleScope, getPersonAccessForTenant } from '@/lib/people/access-scope'
import { getPersonDetail } from '@/lib/people/get-person-detail'
import { resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, accessContext, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const organizationId = resolvePeopleOrganizationScope(request, tenant)

    await assertMemberVisibleInPeopleScope({
      memberId,
      organizationId,
      accessContext
    })

    const detail = await getPersonDetail({
      memberId,
      access: getPersonAccessForTenant(tenant, accessContext),
      organizationId
    })

    return NextResponse.json(detail)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person detail.')
  }
}
