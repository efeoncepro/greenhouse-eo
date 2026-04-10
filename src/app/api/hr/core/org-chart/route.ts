import { NextResponse } from 'next/server'

import { getHrOrgChart } from '@/lib/reporting-hierarchy/org-chart'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { resolveHrOrgChartAccessContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accessContext = await resolveHrOrgChartAccessContext(tenant)

    if (!accessContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    const payload = await getHrOrgChart({
      tenant,
      accessContext,
      focusMemberId: searchParams.get('focusMemberId')
    })

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load org chart.')
  }
}
