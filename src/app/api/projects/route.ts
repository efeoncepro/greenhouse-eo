import { NextResponse } from 'next/server'

import { getProjectsOverview } from '@/lib/projects/get-projects-overview'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tenant = await getTenantContext()

  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getProjectsOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds
  })

  return NextResponse.json(data)
}
