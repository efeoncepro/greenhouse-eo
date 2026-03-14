import { NextResponse } from 'next/server'

import { getTeamBySprint } from '@/lib/team-queries'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ sprintId: string }> }) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sprintId } = await params

  const data = await getTeamBySprint(
    {
      clientId: tenant.clientId,
      projectIds: tenant.projectIds,
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules
    },
    sprintId
  )

  return NextResponse.json(data)
}
