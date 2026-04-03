import { NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { refreshSpaceNotionGovernance } from '@/lib/space-notion/notion-governance'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clientId } = await params
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select('space_id')
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst()

  if (!space) {
    return NextResponse.json({ error: 'No active space found for this client' }, { status: 404 })
  }

  try {
    const governance = await refreshSpaceNotionGovernance(space.space_id, tenant.userId)

    return NextResponse.json({
      refreshed: true,
      governance
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh Notion governance'

    return NextResponse.json({ error: message }, { status: 422 })
  }
}
