import { NextResponse } from 'next/server'

import { getPersonFinanceOverview } from '@/lib/people/get-person-finance-overview'
import { assertMemberInPeopleOrganizationScope, resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
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

    const detail = await getPersonFinanceOverview(memberId, { organizationId })

    return NextResponse.json(detail)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person finance overview.')
  }
}
