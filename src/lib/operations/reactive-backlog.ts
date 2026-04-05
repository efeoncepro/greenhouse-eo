import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { REACTIVE_EVENT_TYPES } from '@/lib/sync/event-catalog'

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

interface ExistsRow extends Record<string, unknown> {
  exists: boolean
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

const tableExists = async (schema: string, table: string) => {
  try {
    const rows = await runGreenhousePostgresQuery<ExistsRow>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2
       ) AS exists`,
      [schema, table]
    )

    return rows[0]?.exists === true
  } catch {
    return false
  }
}

export const readReactiveBacklogOverview = async (): Promise<ReactiveBacklogOverview> => {
  const [hasOutboxEvents, hasReactiveLog] = await Promise.all([
    tableExists('greenhouse_sync', 'outbox_events'),
    tableExists('greenhouse_sync', 'outbox_reactive_log')
  ])

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
        [REACTIVE_EVENT_TYPES]
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
        [REACTIVE_EVENT_TYPES]
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
