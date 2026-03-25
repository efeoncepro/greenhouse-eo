import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getSprintDetail } from '@/lib/sprints/sprint-store'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sprintId } = await params
    const sprint = await getSprintDetail(sprintId, tenant.projectIds)

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    return NextResponse.json(sprint)
  } catch (error) {
    console.error('GET /api/sprints/[sprintId] failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
