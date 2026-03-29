import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
    `WITH updated AS (
       UPDATE greenhouse_sync.projection_refresh_queue
       SET status = 'pending',
           retry_count = 0,
           error_message = NULL,
           updated_at = NOW()
       WHERE status = 'failed'
       RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM updated`
  )

  return NextResponse.json({
    requeued: Number(rows[0]?.count ?? 0)
  })
}
