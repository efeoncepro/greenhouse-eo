import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getRegisteredProjections } from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'
import { getQueueStats } from '@/lib/sync/refresh-queue'

export const dynamic = 'force-dynamic'

interface RefreshStats extends Record<string, unknown> {
  handler: string
  total_events: string | number
  successful: string | number
  dead_letters: string | number
  retrying: string | number
  last_reacted_at: string | null
  oldest_pending: string | null
}

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    ensureProjectionsRegistered()

    const projections = getRegisteredProjections()

    // Get refresh stats from reactive log
    const stats = await runGreenhousePostgresQuery<RefreshStats>(
      `SELECT
         SPLIT_PART(handler, ':', 1) AS handler,
         COUNT(*) AS total_events,
         COUNT(*) FILTER (WHERE result != 'dead-letter' AND result != 'retry' AND last_error IS NULL) AS successful,
         COUNT(*) FILTER (WHERE result = 'dead-letter') AS dead_letters,
         COUNT(*) FILTER (WHERE result = 'retry') AS retrying,
         MAX(reacted_at)::text AS last_reacted_at,
         MIN(CASE WHEN result = 'retry' THEN reacted_at END)::text AS oldest_pending
       FROM greenhouse_sync.outbox_reactive_log
       WHERE reacted_at > NOW() - INTERVAL '24 hours'
       GROUP BY SPLIT_PART(handler, ':', 1)
       ORDER BY handler`
    ).catch(() => [] as RefreshStats[])

    const statsMap = new Map(stats.map(s => [s.handler, s]))

    const projectionStatus = projections.map(p => {
      const s = statsMap.get(p.name)
      const lastReactedAt = s?.last_reacted_at || null
      const ageHours = lastReactedAt ? Math.round((Date.now() - new Date(lastReactedAt).getTime()) / 3_600_000) : null

      return {
        name: p.name,
        description: p.description,
        triggerEvents: p.triggerEvents,
        maxRetries: p.maxRetries ?? 2,
        last24h: {
          totalEvents: Number(s?.total_events ?? 0),
          successful: Number(s?.successful ?? 0),
          deadLetters: Number(s?.dead_letters ?? 0),
          retrying: Number(s?.retrying ?? 0),
          lastReactedAt,
          lagHours: ageHours,
          healthy: ageHours === null || ageHours <= 2
        }
      }
    })

    // Queue stats
    const queue = await getQueueStats().catch(() => ({ pending: 0, processing: 0, completed: 0, failed: 0 }))

    // Global health: no dead letters, no failed queue items
    const globalDeadLetters = projectionStatus.reduce((s, p) => s + p.last24h.deadLetters, 0)
    const healthy = globalDeadLetters === 0 && queue.failed === 0

    return NextResponse.json({
      projections: projectionStatus,
      queue,
      totalRegistered: projections.length,
      globalDeadLetters,
      healthy,
      checkedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('GET /api/internal/projections failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
