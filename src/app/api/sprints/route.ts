import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { listSprints } from '@/lib/sprints/sprint-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sprints = await listSprints(tenant.projectIds)

    return NextResponse.json({ items: sprints, total: sprints.length })
  } catch (error) {
    console.error('GET /api/sprints failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
