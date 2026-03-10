import { NextResponse } from 'next/server'

import { getProjectDetail } from '@/lib/projects/get-project-detail'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const data = await getProjectDetail({
    clientId: tenant.clientId,
    projectId: id,
    projectIds: tenant.projectIds
  })

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
