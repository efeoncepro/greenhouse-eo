import { NextResponse } from 'next/server'

import { getPersonAccessForTenant } from '@/lib/people/access-scope'
import { getPeopleMeta } from '@/lib/people/get-people-meta'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, accessContext, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const access = getPersonAccessForTenant(tenant, accessContext)

    return NextResponse.json(
      getPeopleMeta(tenant.roleCodes, {
        supervisorScoped: access.visibleTabs.length > 0 && accessContext?.accessMode === 'supervisor'
      })
    )
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load people metadata.')
  }
}
