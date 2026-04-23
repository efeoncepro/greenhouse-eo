import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { readReactiveBacklogOverview } from '@/lib/operations/reactive-backlog'
import { readAllCircuitStates } from '@/lib/operations/reactive-circuit-breaker'
import { getRegisteredProjections, getSupportedProjectionDomains } from '@/lib/sync/projection-registry'
import { readProjectionRuntimeHealthMap } from '@/lib/sync/projection-runtime-health'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'
import { getQueueStats } from '@/lib/sync/refresh-queue'
import { extractReactiveErrorCategory, stripReactiveErrorCategory } from '@/lib/sync/reactive-error-classification'

export const dynamic = 'force-dynamic'

interface RefreshStats extends Record<string, unknown> {
  handler: string
  total_events: string | number
  successful: string | number
  dead_letters: string | number
  retrying: string | number
  infrastructure_failures: string | number
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
         COUNT(*) FILTER (WHERE result IN ('retry', 'dead-letter') AND is_infrastructure_fault) AS infrastructure_failures,
         MAX(reacted_at)::text AS last_reacted_at,
         MIN(CASE WHEN result = 'retry' THEN reacted_at END)::text AS oldest_pending
       FROM greenhouse_sync.outbox_reactive_log
       WHERE reacted_at > NOW() - INTERVAL '24 hours'
       GROUP BY SPLIT_PART(handler, ':', 1)
       ORDER BY handler`
    ).catch(() => [] as RefreshStats[])

    const statsMap = new Map(stats.map(s => [s.handler, s]))

    // Queue stats + reactive backlog overview + circuit breaker states, fetched in parallel
    const [queue, reactiveBacklog, circuitStates, runtimeHealthMap] = await Promise.all([
      getQueueStats().catch(() => ({ pending: 0, processing: 0, completed: 0, failed: 0 })),
      readReactiveBacklogOverview(),
      readAllCircuitStates().catch(() => []),
      readProjectionRuntimeHealthMap(projections).catch(() => new Map())
    ])

    const circuitMap = new Map(circuitStates.map(c => [c.projectionName, c]))

    const projectionStatus = projections.map(p => {
      const s = statsMap.get(p.name)
      const lastReactedAt = s?.last_reacted_at || null
      const ageHours = lastReactedAt ? Math.round((Date.now() - new Date(lastReactedAt).getTime()) / 3_600_000) : null
      const circuit = circuitMap.get(p.name) ?? null
      const totalEvents = Number(s?.total_events ?? 0)
      const deadLetters = Number(s?.dead_letters ?? 0)
      const retrying = Number(s?.retrying ?? 0)
      const failures = deadLetters + retrying
      const errorRate = totalEvents > 0 ? failures / totalEvents : 0

      const runtimeHealth = runtimeHealthMap.get(p.name) ?? {
        projectionName: p.name,
        status: 'not_declared' as const,
        currentUser: null,
        checks: []
      }

      const circuitLastError = circuit?.lastError ?? null

      return {
        name: p.name,
        description: p.description,
        domain: p.domain ?? null,
        triggerEvents: p.triggerEvents,
        maxRetries: p.maxRetries ?? 2,
        circuitState: circuit?.state ?? 'closed',
        circuitLastError,
        circuitLastErrorCategory: extractReactiveErrorCategory(circuitLastError),
        circuitLastErrorMessage: stripReactiveErrorCategory(circuitLastError),
        circuitOpenedAt: circuit?.openedAt ?? null,
        runtimeHealth,
        last24h: {
          totalEvents,
          successful: Number(s?.successful ?? 0),
          deadLetters,
          retrying,
          infrastructureFailures: Number(s?.infrastructure_failures ?? 0),
          errorRate,
          lastReactedAt,
          lagHours: ageHours,
          healthy: ageHours === null || ageHours <= 2
        }
      }
    })

    // Global health: no dead letters, no failed queue items
    const globalDeadLetters = projectionStatus.reduce((s, p) => s + p.last24h.deadLetters, 0)

    const projectionsWithRuntimeIssues = projectionStatus.filter(
      projection => projection.runtimeHealth.status === 'degraded'
    ).map(projection => projection.name)

    const healthy =
      globalDeadLetters === 0 &&
      queue.failed === 0 &&
      reactiveBacklog.totalUnreacted === 0 &&
      projectionsWithRuntimeIssues.length === 0

    return NextResponse.json({
      projections: projectionStatus,
      reactiveBacklog,
      supportedDomains: getSupportedProjectionDomains(),
      queue,
      totalRegistered: projections.length,
      globalDeadLetters,
      projectionsWithRuntimeIssues,
      healthy,
      checkedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('GET /api/internal/projections failed:', error)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
