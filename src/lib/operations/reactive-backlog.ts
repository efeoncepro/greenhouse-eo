import 'server-only'

import { getTablePresence, tableExistsIn } from '@/lib/db-health/table-presence'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getAllTriggerEventTypes } from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'

export type ReactiveBacklogStatus = 'healthy' | 'degraded' | 'down' | 'not_configured'

export interface ReactiveBacklogTopEventType {
  eventType: string
  count: number
}

export interface ReactiveBacklogOverview {
  totalUnreacted: number
  last24hUnreacted: number
  oldestUnreactedAt: string | null
  newestUnreactedAt: string | null
  lastReactedAt: string | null
  lagHours: number | null
  status: ReactiveBacklogStatus
  topEventTypes: ReactiveBacklogTopEventType[]
}

interface TotalsRow extends Record<string, unknown> {
  total_unreacted: number | string
  last_24h_unreacted: number | string
  oldest_unreacted_at: string | null
  newest_unreacted_at: string | null
}

interface LastReactedRow extends Record<string, unknown> {
  last_reacted_at: string | null
}

interface TopEventTypeRow extends Record<string, unknown> {
  event_type: string
  count: number | string
}

const toCount = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const computeReactiveLagHours = (lastReactedAt: string | null, now = Date.now()) => {
  if (!lastReactedAt) return null

  const lastRunMs = new Date(lastReactedAt).getTime()

  if (Number.isNaN(lastRunMs)) return null

  return Math.max(0, Math.round((now - lastRunMs) / 3_600_000))
}

export const deriveReactiveBacklogStatus = ({
  totalUnreacted,
  last24hUnreacted,
  lagHours
}: {
  totalUnreacted: number
  last24hUnreacted: number
  lagHours: number | null
}): ReactiveBacklogStatus => {
  if (totalUnreacted === 0) {
    return 'healthy'
  }

  if (last24hUnreacted > 0 && (lagHours === null || lagHours > 24)) {
    return 'down'
  }

  return 'degraded'
}

export const readReactiveBacklogOverview = async (): Promise<ReactiveBacklogOverview> => {
  const tablePresence = await getTablePresence([
    { schema: 'greenhouse_sync', table: 'outbox_events' },
    { schema: 'greenhouse_sync', table: 'outbox_reactive_log' }
  ])

  const hasOutboxEvents = tableExistsIn(tablePresence, 'greenhouse_sync', 'outbox_events')
  const hasReactiveLog = tableExistsIn(tablePresence, 'greenhouse_sync', 'outbox_reactive_log')

  if (!hasOutboxEvents || !hasReactiveLog) {
    return {
      totalUnreacted: 0,
      last24hUnreacted: 0,
      oldestUnreactedAt: null,
      newestUnreactedAt: null,
      lastReactedAt: null,
      lagHours: null,
      status: 'not_configured',
      topEventTypes: []
    }
  }

  // Only events that have at least one registered projection handler should
  // count toward the reactive backlog. Events catalogued in REACTIVE_EVENT_TYPES
  // without a registered consumer (e.g. audit-only events like role.assigned or
  // forward-declared sister_platform_binding.* before its sync target lands)
  // are intentionally not processed and must not inflate the Ops Health metric.
  ensureProjectionsRegistered()
  const handledEventTypes = getAllTriggerEventTypes()

  if (handledEventTypes.length === 0) {
    return {
      totalUnreacted: 0,
      last24hUnreacted: 0,
      oldestUnreactedAt: null,
      newestUnreactedAt: null,
      lastReactedAt: null,
      lagHours: null,
      status: 'healthy',
      topEventTypes: []
    }
  }

  try {
    const [totalsRows, lastReactedRows, topEventTypesRows] = await Promise.all([
      runGreenhousePostgresQuery<TotalsRow>(
        `SELECT
           COUNT(*)::int AS total_unreacted,
           COUNT(*) FILTER (WHERE e.occurred_at > NOW() - INTERVAL '24 hours')::int AS last_24h_unreacted,
           MIN(e.occurred_at)::text AS oldest_unreacted_at,
           MAX(e.occurred_at)::text AS newest_unreacted_at
         FROM greenhouse_sync.outbox_events e
         WHERE e.status = 'published'
           AND e.event_type = ANY($1)
           AND NOT EXISTS (
             SELECT 1
             FROM greenhouse_sync.outbox_reactive_log r
             WHERE r.event_id = e.event_id
           )`,
        [handledEventTypes]
      ),
      runGreenhousePostgresQuery<LastReactedRow>(
        `SELECT MAX(reacted_at)::text AS last_reacted_at
         FROM greenhouse_sync.outbox_reactive_log`
      ),
      runGreenhousePostgresQuery<TopEventTypeRow>(
        `SELECT e.event_type, COUNT(*)::int AS count
         FROM greenhouse_sync.outbox_events e
         WHERE e.status = 'published'
           AND e.event_type = ANY($1)
           AND NOT EXISTS (
             SELECT 1
             FROM greenhouse_sync.outbox_reactive_log r
             WHERE r.event_id = e.event_id
           )
         GROUP BY e.event_type
         ORDER BY count DESC, e.event_type ASC
         LIMIT 5`,
        [handledEventTypes]
      )
    ])

    const totals = totalsRows[0]
    const lastReactedAt = lastReactedRows[0]?.last_reacted_at ?? null
    const lagHours = computeReactiveLagHours(lastReactedAt)
    const totalUnreacted = toCount(totals?.total_unreacted)
    const last24hUnreacted = toCount(totals?.last_24h_unreacted)

    return {
      totalUnreacted,
      last24hUnreacted,
      oldestUnreactedAt: totals?.oldest_unreacted_at ?? null,
      newestUnreactedAt: totals?.newest_unreacted_at ?? null,
      lastReactedAt,
      lagHours,
      status: deriveReactiveBacklogStatus({ totalUnreacted, last24hUnreacted, lagHours }),
      topEventTypes: topEventTypesRows.map(row => ({
        eventType: row.event_type,
        count: toCount(row.count)
      }))
    }
  } catch {
    return {
      totalUnreacted: 0,
      last24hUnreacted: 0,
      oldestUnreactedAt: null,
      newestUnreactedAt: null,
      lastReactedAt: null,
      lagHours: null,
      status: 'not_configured',
      topEventTypes: []
    }
  }
}
