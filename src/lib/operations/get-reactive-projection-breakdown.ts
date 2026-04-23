import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getRegisteredProjections } from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'
import { readProjectionRuntimeHealthMap } from '@/lib/sync/projection-runtime-health'
import { extractReactiveErrorCategory, stripReactiveErrorCategory } from '@/lib/sync/reactive-error-classification'

import { readAllCircuitStates, type CircuitState } from './reactive-circuit-breaker'

/**
 * Server-only loader for the Ops Health dashboard's per-projection section
 * (TASK-379, Slice 4).
 *
 * This loader is intentionally separate from `getOperationsOverview()` so we
 * can drop it into the view incrementally without touching the hero KPIs or
 * the existing subsystem cards. It returns the 24h refresh stats + circuit
 * breaker state for every registered projection, plus a rollup of how many
 * projections are in each breaker state.
 */

export interface ReactiveProjectionBreakdownRow {
  name: string
  description: string
  domain: string
  scopesCoalescedLast24h: number
  eventsAcknowledgedLast24h: number
  successful: number
  failures: number
  infrastructureFailures: number
  errorRate: number
  circuitState: CircuitState
  circuitLastError: string | null
  circuitLastErrorCategory: string | null
  runtimeHealthStatus: 'not_declared' | 'ready' | 'degraded'
  lastReactedAt: string | null
}

export interface ReactiveProjectionBreakdown {
  projections: ReactiveProjectionBreakdownRow[]
  circuitSummary: {
    closed: number
    halfOpen: number
    open: number
  }
  checkedAt: string
}

interface RefreshStatsRow extends Record<string, unknown> {
  handler: string
  total_events: string | number
  successful: string | number
  dead_letters: string | number
  retrying: string | number
  infrastructure_failures: string | number
  coalesced_scopes: string | number
  last_reacted_at: string | null
}

const toCount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const readReactiveProjectionBreakdown = async (): Promise<ReactiveProjectionBreakdown> => {
  ensureProjectionsRegistered()

  const projections = getRegisteredProjections()

  const [stats, circuitStates, runtimeHealthMap] = await Promise.all([
    runGreenhousePostgresQuery<RefreshStatsRow>(
      `SELECT
         SPLIT_PART(handler, ':', 1) AS handler,
         COUNT(*)::text AS total_events,
         COUNT(*) FILTER (WHERE result LIKE 'coalesced:%')::text AS coalesced_scopes,
         COUNT(*) FILTER (WHERE result LIKE 'coalesced:%' OR result LIKE 'no-op:%')::text AS successful,
         COUNT(*) FILTER (WHERE result = 'dead-letter')::text AS dead_letters,
         COUNT(*) FILTER (WHERE result = 'retry')::text AS retrying,
         COUNT(*) FILTER (WHERE result IN ('retry', 'dead-letter') AND is_infrastructure_fault)::text AS infrastructure_failures,
         MAX(reacted_at)::text AS last_reacted_at
       FROM greenhouse_sync.outbox_reactive_log
       WHERE reacted_at > NOW() - INTERVAL '24 hours'
       GROUP BY SPLIT_PART(handler, ':', 1)`
    ).catch(() => [] as RefreshStatsRow[]),
    readAllCircuitStates().catch(() => []),
    readProjectionRuntimeHealthMap(projections).catch(() => new Map())
  ])

  const statsMap = new Map(stats.map(row => [row.handler, row]))
  const circuitMap = new Map(circuitStates.map(snapshot => [snapshot.projectionName, snapshot]))

  const rows: ReactiveProjectionBreakdownRow[] = projections.map(projection => {
    const stat = statsMap.get(projection.name)
    const circuit = circuitMap.get(projection.name) ?? null
    const totalEvents = toCount(stat?.total_events)
    const successful = toCount(stat?.successful)
    const deadLetters = toCount(stat?.dead_letters)
    const retrying = toCount(stat?.retrying)
    const failures = deadLetters + retrying
    const infrastructureFailures = toCount(stat?.infrastructure_failures)
    const errorRate = totalEvents > 0 ? failures / totalEvents : 0
    const circuitLastError = circuit?.lastError ?? null
    const runtimeHealth = runtimeHealthMap.get(projection.name)

    return {
      name: projection.name,
      description: projection.description,
      domain: projection.domain,
      scopesCoalescedLast24h: toCount(stat?.coalesced_scopes),
      eventsAcknowledgedLast24h: totalEvents,
      successful,
      failures,
      infrastructureFailures,
      errorRate,
      circuitState: circuit?.state ?? 'closed',
      circuitLastError: stripReactiveErrorCategory(circuitLastError),
      circuitLastErrorCategory: extractReactiveErrorCategory(circuitLastError),
      runtimeHealthStatus: runtimeHealth?.status ?? 'not_declared',
      lastReactedAt: stat?.last_reacted_at ?? null
    }
  })

  const circuitSummary = {
    closed: rows.filter(row => row.circuitState === 'closed').length,
    halfOpen: rows.filter(row => row.circuitState === 'half_open').length,
    open: rows.filter(row => row.circuitState === 'open').length
  }

  return {
    projections: rows.sort((a, b) => {
      // Prioritize unhealthy projections at the top of the table.
      const aUnhealthy = a.circuitState !== 'closed' || a.errorRate > 0 || a.runtimeHealthStatus === 'degraded' ? 0 : 1
      const bUnhealthy = b.circuitState !== 'closed' || b.errorRate > 0 || b.runtimeHealthStatus === 'degraded' ? 0 : 1

      if (aUnhealthy !== bUnhealthy) return aUnhealthy - bUnhealthy
      if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate

      return a.name.localeCompare(b.name)
    }),
    circuitSummary,
    checkedAt: new Date().toISOString()
  }
}
