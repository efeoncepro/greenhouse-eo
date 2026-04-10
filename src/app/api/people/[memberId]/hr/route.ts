import { NextResponse } from 'next/server'

import { assertMemberVisibleInPeopleScope, assertPeopleCapability, getPersonAccessForTenant } from '@/lib/people/access-scope'
import { getPersonHrContext } from '@/lib/person-360/get-person-hr'
import { resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, accessContext, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (tenant.tenantType === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { memberId } = await params
    const access = getPersonAccessForTenant(tenant, accessContext)
    const organizationId = resolvePeopleOrganizationScope(_, tenant)

    assertPeopleCapability({ allowed: access.canViewHrProfile })
    await assertMemberVisibleInPeopleScope({
      memberId,
      organizationId,
      accessContext
    })

    const result = await getPersonHrContext(memberId)

    if (!result) {
      return NextResponse.json({ error: 'Person not found.' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person HR context.')
  }
}
