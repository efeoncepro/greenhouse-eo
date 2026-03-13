import { NextResponse } from 'next/server'

import { getTeamByProject } from '@/lib/team-queries'
import { canAccessProject, requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  if (!canAccessProject(tenant, projectId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await getTeamByProject(
    {
      clientId: tenant.clientId,
      projectIds: tenant.projectIds,
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules
    },
    projectId
  )

  return NextResponse.json(data)
}
