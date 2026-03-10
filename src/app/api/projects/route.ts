import { NextResponse } from 'next/server'

import { getProjectsOverview } from '@/lib/projects/get-projects-overview'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getProjectsOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds
  })

  return NextResponse.json(data)
}
