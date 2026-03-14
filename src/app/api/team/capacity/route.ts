import { NextResponse } from 'next/server'

import { getTeamCapacity } from '@/lib/team-queries'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getTeamCapacity({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  return NextResponse.json(data)
}
