import { NextResponse } from 'next/server'

import { getProjectDetail } from '@/lib/projects/get-project-detail'
import { canAccessProject, requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  if (!canAccessProject(tenant, id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
