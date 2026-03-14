import { NextResponse } from 'next/server'

import { getTeamMembers } from '@/lib/team-queries'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getTeamMembers({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  return NextResponse.json(data)
}
