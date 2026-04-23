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
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET retry_count = retry_count + 1,
         status = CASE WHEN retry_count + 1 >= $2 THEN 'failed' ELSE 'pending' END,
         error_message = $3,
         error_class = $4,
         error_family = $5,
         is_infrastructure_fault = $6,
         updated_at = NOW()
     WHERE refresh_id = $1`,
    [
      queueId,
      maxAttempts,
      error,
      classification?.errorClass ?? null,
      classification?.errorFamily ?? null,
      classification?.isInfrastructureFault ?? false
    ]
  )
}

export const getQueueStats = async (): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
}> => {
  await ensureRefreshQueue()

  const rows = await runGreenhousePostgresQuery<{ status: string; count: string } & Record<string, unknown>>(
    `SELECT status, COUNT(*)::text AS count
     FROM greenhouse_sync.projection_refresh_queue
     WHERE created_at > NOW() - INTERVAL '24 hours'
     GROUP BY status`
  )

  const map = new Map(rows.map(r => [r.status, Number(r.count)]))

  return {
    pending: map.get('pending') ?? 0,
    processing: map.get('processing') ?? 0,
    completed: map.get('completed') ?? 0,
    failed: map.get('failed') ?? 0
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
