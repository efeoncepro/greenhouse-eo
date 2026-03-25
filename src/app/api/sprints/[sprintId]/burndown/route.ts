import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getSprintBurndown } from '@/lib/sprints/sprint-store'

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
    const burndown = await getSprintBurndown(sprintId, tenant.projectIds)

    return NextResponse.json({ sprintId, points: burndown })
  } catch (error) {
    console.error('GET /api/sprints/[sprintId]/burndown failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
