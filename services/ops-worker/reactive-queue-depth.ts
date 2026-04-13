/**
 * Reactive queue-depth introspection (TASK-379 Slice 3).
 *
 * Powers the `GET /reactive/queue-depth` endpoint exposed by the ops-worker
 * so operators and alerting policies can observe the per-domain backlog in
 * the outbox without having to spelunk Postgres directly.
 *
 * A queue-depth row counts an outbox event as "pending" when:
 *   - it is published (status = 'published'),
 *   - its event_type is claimed by at least one registered projection in the
 *     requested domain (so orphan/audit-only events don't pollute the metric),
 *   - it has no entry yet in greenhouse_sync.outbox_reactive_log.
 *
 * When the `domain` argument is omitted, the query covers every registered
 * projection across every domain.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  getAllTriggerEventTypes,
  PROJECTION_DOMAINS,
  type ProjectionDomain
} from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'

export interface QueueDepthPerEventType {
  eventType: string
  count: number
}

export interface QueueDepthResult {
  domain: ProjectionDomain | 'all'
  queueDepth: number
  oldestEventAge_seconds: number | null
  oldestOccurredAt: string | null
  perEventType: QueueDepthPerEventType[]
}

type TotalsRow = {
  total: number | string | null
  oldest_occurred_at: string | null
  oldest_age_seconds: number | string | null
} & Record<string, unknown>

type PerEventTypeRow = {
  event_type: string
  count: number | string | null
} & Record<string, unknown>

const toCount = (value: number | string | null | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const isValidProjectionDomain = (value: unknown): value is ProjectionDomain =>
  typeof value === 'string' && (PROJECTION_DOMAINS as readonly string[]).includes(value)

export class InvalidDomainError extends Error {
  readonly validDomains: readonly ProjectionDomain[]

  constructor(value: unknown) {
    super(
      `Invalid domain: ${String(value)}. Must be one of: ${PROJECTION_DOMAINS.join(', ')}`
    )
    this.name = 'InvalidDomainError'
    this.validDomains = PROJECTION_DOMAINS
  }
}

/**
 * Computes the reactive queue depth, optionally filtered by projection domain.
 *
 * @throws InvalidDomainError when `domain` is a non-empty string that does not
 *         match a registered ProjectionDomain.
 */
export const getReactiveQueueDepth = async (
  domain?: string | null
): Promise<QueueDepthResult> => {
  let normalizedDomain: ProjectionDomain | undefined

  if (domain !== undefined && domain !== null && domain !== '') {
    if (!isValidProjectionDomain(domain)) {
      throw new InvalidDomainError(domain)
    }

    normalizedDomain = domain
  }

  ensureProjectionsRegistered()
  const handledEventTypes = getAllTriggerEventTypes(normalizedDomain)

  if (handledEventTypes.length === 0) {
    return {
      domain: normalizedDomain ?? 'all',
      queueDepth: 0,
      oldestEventAge_seconds: null,
      oldestOccurredAt: null,
      perEventType: []
    }
  }

  const [totalsRows, perEventTypeRows] = await Promise.all([
    runGreenhousePostgresQuery<TotalsRow>(
      `SELECT
         COUNT(*)::int AS total,
         MIN(e.occurred_at)::text AS oldest_occurred_at,
         EXTRACT(EPOCH FROM (NOW() - MIN(e.occurred_at)))::float8 AS oldest_age_seconds
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
    runGreenhousePostgresQuery<PerEventTypeRow>(
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
       LIMIT 10`,
      [handledEventTypes]
    )
  ])

  const totals = totalsRows[0]

  return {
    domain: normalizedDomain ?? 'all',
    queueDepth: toCount(totals?.total),
    oldestEventAge_seconds: toNullableNumber(totals?.oldest_age_seconds),
    oldestOccurredAt: totals?.oldest_occurred_at ?? null,
    perEventType: perEventTypeRows.map(row => ({
      eventType: row.event_type,
      count: toCount(row.count)
    }))
  }
}
