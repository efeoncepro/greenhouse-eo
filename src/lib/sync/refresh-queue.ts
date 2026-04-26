import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReactiveErrorCategory, ReactiveErrorFamily } from './reactive-error-classification'

/**
 * Persistent Refresh Queue — survives outbox event expiration.
 *
 * When the reactive consumer detects an event that triggers a projection,
 * it enqueues a refresh intent here. Even if the outbox event expires
 * (1 hour window), the queue persists until the refresh completes.
 *
 * The queue supports:
 * - Deduplication: same (projection, entity_type, entity_id) collapses
 * - Backpressure: max pending items per projection (configurable)
 * - Priority: high-priority projections processed first
 */

let ensureQueuePromise: Promise<void> | null = null

export const ensureRefreshQueue = async (): Promise<void> => {
  if (ensureQueuePromise) return ensureQueuePromise

  ensureQueuePromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ exists: boolean }>(
      `SELECT to_regclass('greenhouse_sync.projection_refresh_queue') IS NOT NULL AS exists`
    )

    if (!rows[0]?.exists) {
      throw new Error(
        'greenhouse_sync.projection_refresh_queue is missing. Run scripts/setup-postgres-operations-infra.sql with an admin profile before enabling reactive projections.'
      )
    }
  })().catch(err => {
    ensureQueuePromise = null
    throw err
  })

  return ensureQueuePromise
}

export const buildRefreshQueueId = (projectionName: string, entityType: string, entityId: string) =>
  `${projectionName}:${entityType}:${entityId}`

export const enqueueRefresh = async (input: {
  projectionName: string
  entityType: string
  entityId: string
  priority?: number
  triggeredByEventId?: string | null
  maxRetries?: number
}): Promise<void> => {
  await ensureRefreshQueue()

  const queueId = buildRefreshQueueId(input.projectionName, input.entityType, input.entityId)

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.projection_refresh_queue
       (
         refresh_id,
         projection_name,
         entity_type,
         entity_id,
         priority,
         status,
         triggered_by_event_id,
         error_message,
         error_class,
         error_family,
         is_infrastructure_fault,
         retry_count,
         max_retries,
         created_at,
         updated_at
       )
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, NULL, NULL, NULL, FALSE, 0, $7, NOW(), NOW())
     ON CONFLICT (projection_name, entity_type, entity_id)
     DO UPDATE SET
       priority = GREATEST(EXCLUDED.priority, projection_refresh_queue.priority),
       updated_at = NOW(),
       triggered_by_event_id = EXCLUDED.triggered_by_event_id,
       error_message = NULL,
       error_class = NULL,
       error_family = NULL,
       is_infrastructure_fault = FALSE,
       max_retries = GREATEST(EXCLUDED.max_retries, projection_refresh_queue.max_retries),
       created_at = CASE
         WHEN projection_refresh_queue.status IN ('completed', 'failed') THEN NOW()
         ELSE projection_refresh_queue.created_at
       END,
       retry_count = CASE
         WHEN projection_refresh_queue.status IN ('completed', 'failed') THEN 0
         ELSE projection_refresh_queue.retry_count
       END,
       status = CASE
         WHEN projection_refresh_queue.status IN ('completed', 'failed') THEN 'pending'
         ELSE projection_refresh_queue.status
       END`,
    [
      queueId,
      input.projectionName,
      input.entityType,
      input.entityId,
      input.priority ?? 0,
      input.triggeredByEventId ?? null,
      input.maxRetries ?? 3
    ]
  )
}

export interface QueueItem {
  queueId: string
  projectionName: string
  entityType: string
  entityId: string
  priority: number
  attempts: number
}

export const dequeueRefreshBatch = async (batchSize = 10): Promise<QueueItem[]> => {
  await ensureRefreshQueue()

  // Atomic claim: set status = 'processing' and return claimed items
  const rows = await runGreenhousePostgresQuery<QueueItem & Record<string, unknown>>(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET status = 'processing', updated_at = NOW(), retry_count = retry_count + 1
     WHERE refresh_id IN (
       SELECT refresh_id FROM greenhouse_sync.projection_refresh_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING refresh_id AS "queueId",
       projection_name AS "projectionName",
       entity_type AS "entityType",
       entity_id AS "entityId",
       priority,
       retry_count AS "attempts"`,
    [batchSize]
  )

  return rows.map(r => ({
    queueId: String(r.queueId),
    projectionName: String(r.projectionName),
    entityType: String(r.entityType),
    entityId: String(r.entityId),
    priority: Number(r.priority),
    attempts: Number(r.attempts)
  }))
}

export const markRefreshCompleted = async (queueId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET status = 'completed',
         updated_at = NOW(),
         error_message = NULL,
         error_class = NULL,
         error_family = NULL,
         is_infrastructure_fault = FALSE
     WHERE refresh_id = $1`,
    [queueId]
  )
}

/**
 * Entity-existence guards used by `markRefreshFailed` to detect orphan rows
 * (refreshes that point to a Greenhouse entity that no longer exists in PG)
 * at the moment we'd otherwise route them to `dead`. Auto-archiving these
 * keeps the reliability dashboard honest — humans see only real incidents,
 * not test residue, deleted records, or snapshot drift.
 *
 * Rules:
 *  - Each entry is `(entity_type, error_message_pattern, table_check)`.
 *  - `error_message_pattern` is a substring or regex used to recognize the
 *    "entity not found" failure shape coming up from the projection.
 *  - `table_check` returns whether the entity exists. When it returns FALSE,
 *    the row is archived, NOT dead.
 *
 * Adding a new guard: copy a row, point at the right table + key column.
 * Cheap (single-row PG lookup), runs only at the dead-routing moment.
 */
const ENTITY_EXISTENCE_GUARDS: Array<{
  entityType: string
  errorMessagePattern: RegExp
  checkExists: (entityId: string) => Promise<boolean>
}> = [
  {
    entityType: 'member',
    errorMessagePattern: /Member .* not found/i,
    checkExists: async (entityId: string) => {
      const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
        'SELECT EXISTS(SELECT 1 FROM greenhouse.team_members WHERE member_id = $1) AS exists',
        [entityId]
      )

      return rows[0]?.exists === true
    }
  },
  {
    entityType: 'organization',
    errorMessagePattern: /Organization .* not found/i,
    checkExists: async (entityId: string) => {
      const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
        `SELECT EXISTS(
           SELECT 1 FROM greenhouse_core.organizations WHERE organization_id = $1
         ) AS exists`,
        [entityId]
      )

      return rows[0]?.exists === true
    }
  }
]

const detectOrphan = async (
  entityType: string,
  entityId: string,
  errorMessage: string
): Promise<{ isOrphan: boolean; reason: string | null }> => {
  const guard = ENTITY_EXISTENCE_GUARDS.find(
    g => g.entityType === entityType && g.errorMessagePattern.test(errorMessage)
  )

  if (!guard) return { isOrphan: false, reason: null }

  try {
    const exists = await guard.checkExists(entityId)

    if (exists) return { isOrphan: false, reason: null }

    return {
      isOrphan: true,
      reason: `orphan_entity_not_found:${entityType}=${entityId}`
    }
  } catch {
    // If the guard query itself fails, do NOT archive — keep behaving as
    // before (route to dead). False negatives are safe; false positives
    // would silently hide real incidents.
    return { isOrphan: false, reason: null }
  }
}

/**
 * Mark a refresh as failed.
 *
 * Terminal classification (after retries are exhausted):
 *
 *   - `is_infrastructure_fault = true`  → status `failed`
 *     Transient/infra problem (timeout, deadlock, rate limit, network). The
 *     projection-recovery cron will keep claiming and retrying these.
 *
 *   - `is_infrastructure_fault = false` → status `dead`
 *     Application/data fault (SQL bug, missing schema, contract violation). It
 *     will NOT recover by itself — surfaces in the reliability control plane as
 *     `Proyecciones` warning. Requires a code fix or manual requeue via the
 *     admin endpoint after the underlying cause is addressed.
 *
 *     **Orphan auto-archive**: before routing to `dead`, we run the
 *     `ENTITY_EXISTENCE_GUARDS` to detect refreshes that point to a Greenhouse
 *     entity that no longer exists (smoke test residue, deleted records,
 *     snapshot drift). When the entity is missing, the row is marked
 *     `archived=TRUE` in the same UPDATE so the dashboard never sees it as a
 *     real incident. The row is preserved for audit; the reliability counters
 *     filter on `archived = FALSE`.
 *
 * `dead_at` is stamped when the row enters the dead state so the dashboard can
 * age-out and escalate alerts honestly.
 */
export const markRefreshFailed = async (
  queueId: string,
  error: string,
  maxAttempts = 3,
  classification?: {
    errorClass?: ReactiveErrorCategory | null
    errorFamily?: ReactiveErrorFamily | null
    isInfrastructureFault?: boolean
  }
): Promise<void> => {
  const isInfrastructureFault = classification?.isInfrastructureFault ?? false

  // Pre-compute orphan status so we know whether to archive at the dead-routing
  // moment. Only relevant for application faults (infra faults stay in `failed`
  // and keep retrying — orphan detection happens via the recovery cron).
  let orphanReason: string | null = null

  if (!isInfrastructureFault) {
    // queueId format: `{projectionName}:{entityType}:{entityId}` (per
    // `buildRefreshQueueId`). Parse defensively so a malformed id doesn't
    // crash the writer.
    const idParts = queueId.split(':')
    const entityType = idParts[1] ?? null
    const entityId = idParts.slice(2).join(':') || null

    if (entityType && entityId) {
      const orphan = await detectOrphan(entityType, entityId, error)

      if (orphan.isOrphan) {
        orphanReason = orphan.reason
      }
    }
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET retry_count = retry_count + 1,
         status = CASE
           WHEN retry_count + 1 >= $2 THEN
             CASE WHEN $6 = TRUE THEN 'failed' ELSE 'dead' END
           ELSE 'pending'
         END,
         error_message = $3,
         error_class = $4,
         error_family = $5,
         is_infrastructure_fault = $6,
         dead_at = CASE
           WHEN retry_count + 1 >= $2 AND $6 = FALSE THEN NOW()
           ELSE dead_at
         END,
         archived = CASE
           WHEN retry_count + 1 >= $2 AND $6 = FALSE AND $7::text IS NOT NULL THEN TRUE
           ELSE archived
         END,
         archived_at = CASE
           WHEN retry_count + 1 >= $2 AND $6 = FALSE AND $7::text IS NOT NULL THEN NOW()
           ELSE archived_at
         END,
         archived_reason = CASE
           WHEN retry_count + 1 >= $2 AND $6 = FALSE AND $7::text IS NOT NULL THEN $7
           ELSE archived_reason
         END,
         updated_at = NOW()
     WHERE refresh_id = $1`,
    [
      queueId,
      maxAttempts,
      error,
      classification?.errorClass ?? null,
      classification?.errorFamily ?? null,
      isInfrastructureFault,
      orphanReason
    ]
  )
}

/**
 * Requeue a `dead` or `failed` projection refresh manually. Resets retry
 * counters and clears classification so the next reactive sweep claims it
 * fresh. Used after fixing the underlying application fault.
 */
export const requeueRefreshItem = async (queueId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ refresh_id: string } & Record<string, unknown>>(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET status = 'pending',
         retry_count = 0,
         error_message = NULL,
         error_class = NULL,
         error_family = NULL,
         is_infrastructure_fault = FALSE,
         dead_at = NULL,
         updated_at = NOW()
     WHERE refresh_id = $1
       AND status IN ('failed', 'dead')
     RETURNING refresh_id`,
    [queueId]
  )

  return rows.length > 0
}

export const getQueueStats = async (): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
  dead: number
}> => {
  await ensureRefreshQueue()

  const rows = await runGreenhousePostgresQuery<{ status: string; count: string } & Record<string, unknown>>(
    `SELECT status, COUNT(*)::text AS count
     FROM greenhouse_sync.projection_refresh_queue
     WHERE created_at > NOW() - INTERVAL '24 hours'
        OR status = 'dead'
     GROUP BY status`
  )

  const map = new Map(rows.map(r => [r.status, Number(r.count)]))

  return {
    pending: map.get('pending') ?? 0,
    processing: map.get('processing') ?? 0,
    completed: map.get('completed') ?? 0,
    failed: map.get('failed') ?? 0,
    dead: map.get('dead') ?? 0
  }
}

/**
 * Claim orphaned refresh items — items stuck as `pending` (never picked up inline)
 * or `processing` (process died mid-flight).
 *
 * Orphan criteria:
 * - `pending` with `updated_at` older than `staleMinutes` (default 30 min)
 * - `processing` with `updated_at` older than `staleMinutes` (default 30 min)
 *
 * Items are atomically claimed as `processing` to prevent double-pickup.
 */
export const claimOrphanedRefreshItems = async (
  batchSize = 10,
  staleMinutes = 30
): Promise<QueueItem[]> => {
  await ensureRefreshQueue()

  const rows = await runGreenhousePostgresQuery<QueueItem & Record<string, unknown>>(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET status = 'processing', updated_at = NOW(), retry_count = retry_count + 1
     WHERE refresh_id IN (
       SELECT refresh_id FROM greenhouse_sync.projection_refresh_queue
       WHERE (
         (status = 'pending' AND updated_at < NOW() - INTERVAL '1 minute' * $2)
         OR
         (status = 'processing' AND updated_at < NOW() - INTERVAL '1 minute' * $2)
       )
       AND retry_count < max_retries
       ORDER BY priority DESC, created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING refresh_id AS "queueId",
       projection_name AS "projectionName",
       entity_type AS "entityType",
       entity_id AS "entityId",
       priority,
       retry_count AS "attempts"`,
    [batchSize, staleMinutes]
  )

  return rows.map(r => ({
    queueId: String(r.queueId),
    projectionName: String(r.projectionName),
    entityType: String(r.entityType),
    entityId: String(r.entityId),
    priority: Number(r.priority),
    attempts: Number(r.attempts)
  }))
}

/** Cleanup completed items older than 24h */
export const purgeCompletedRefreshItems = async (): Promise<number> => {
  await ensureRefreshQueue()

  const rows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
    `WITH deleted AS (
       DELETE FROM greenhouse_sync.projection_refresh_queue
       WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '24 hours'
       RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM deleted`
  )

  return Number(rows[0]?.count ?? 0)
}
