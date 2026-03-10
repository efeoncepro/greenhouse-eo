import { NextResponse } from 'next/server'

import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tenant = await getTenantContext()

  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getDashboardOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds
  })

  return NextResponse.json(data)
}
