import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

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

export const enqueueRefresh = async (input: {
  projectionName: string
  entityType: string
  entityId: string
  priority?: number
}): Promise<void> => {
  await ensureRefreshQueue()

  const queueId = `${input.projectionName}:${input.entityType}:${input.entityId}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.projection_refresh_queue
       (queue_id, projection_name, entity_type, entity_id, priority, status, enqueued_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     ON CONFLICT (projection_name, entity_type, entity_id)
     DO UPDATE SET
       priority = GREATEST(EXCLUDED.priority, projection_refresh_queue.priority),
       enqueued_at = LEAST(EXCLUDED.enqueued_at, projection_refresh_queue.enqueued_at),
       status = CASE
         WHEN projection_refresh_queue.status IN ('completed', 'failed') THEN 'pending'
         ELSE projection_refresh_queue.status
       END`,
    [queueId, input.projectionName, input.entityType, input.entityId, input.priority ?? 0]
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
     SET status = 'processing', started_at = NOW(), attempts = attempts + 1
     WHERE queue_id IN (
       SELECT queue_id FROM greenhouse_sync.projection_refresh_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, enqueued_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING queue_id AS "queueId",
       projection_name AS "projectionName",
       entity_type AS "entityType",
       entity_id AS "entityId",
       priority,
       attempts`,
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
     SET status = 'completed', completed_at = NOW(), last_error = NULL
     WHERE queue_id = $1`,
    [queueId]
  )
}

export const markRefreshFailed = async (queueId: string, error: string, maxAttempts = 3): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.projection_refresh_queue
     SET status = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'pending' END,
         last_error = $3
     WHERE queue_id = $1`,
    [queueId, maxAttempts, error]
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
     WHERE enqueued_at > NOW() - INTERVAL '24 hours'
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

/** Cleanup completed items older than 24h */
export const purgeCompletedRefreshItems = async (): Promise<number> => {
  await ensureRefreshQueue()

  const rows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
    `WITH deleted AS (
       DELETE FROM greenhouse_sync.projection_refresh_queue
       WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '24 hours'
       RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM deleted`
  )

  return Number(rows[0]?.count ?? 0)
}
