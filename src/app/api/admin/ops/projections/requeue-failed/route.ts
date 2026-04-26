import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let projectionName: string | null = null
  let errorClass: string | null = null
  let onlyInfrastructure = false

  try {
    const body = await request.json().catch(() => null)

    const parsedBody = body && typeof body === 'object' ? (body as {
      projectionName?: unknown
      errorClass?: unknown
      onlyInfrastructure?: unknown
    }) : null

    const rawProjectionName = parsedBody?.projectionName ?? null
    const rawErrorClass = parsedBody?.errorClass ?? null
    const rawOnlyInfrastructure = parsedBody?.onlyInfrastructure ?? false

    if (typeof rawProjectionName === 'string' && rawProjectionName.trim() !== '') {
      projectionName = rawProjectionName.trim()
    }

    if (typeof rawErrorClass === 'string' && rawErrorClass.trim() !== '') {
      errorClass = rawErrorClass.trim()
    }

    onlyInfrastructure = rawOnlyInfrastructure === true
  } catch {
    projectionName = null
    errorClass = null
    onlyInfrastructure = false
  }

  // Requeue covers BOTH `failed` (transient infra fault, awaiting recovery cron)
  // AND `dead` (application fault — user requeues after fixing the underlying bug).
  const rows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
    `WITH updated AS (
       UPDATE greenhouse_sync.projection_refresh_queue
       SET status = 'pending',
           retry_count = 0,
           error_message = NULL,
           error_class = NULL,
           error_family = NULL,
           is_infrastructure_fault = FALSE,
           dead_at = NULL,
           updated_at = NOW()
       WHERE status IN ('failed', 'dead')
         AND ($1::text IS NULL OR projection_name = $1)
         AND ($2::text IS NULL OR error_class = $2)
         AND ($3::boolean = FALSE OR is_infrastructure_fault = TRUE)
       RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM updated`
    ,
    [projectionName, errorClass, onlyInfrastructure]
  )

  return NextResponse.json({
    projectionName,
    errorClass,
    onlyInfrastructure,
    requeued: Number(rows[0]?.count ?? 0)
  })
}
