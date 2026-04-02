import { NextResponse } from 'next/server'

import { getPeopleList } from '@/lib/people/get-people-list'
import { resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organizationId = resolvePeopleOrganizationScope(request, tenant)
    const data = await getPeopleList({ organizationId })

    return NextResponse.json(data)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load people list.')
  }
}
