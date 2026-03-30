import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

export type DteEmissionStatus = 'pending' | 'emitting' | 'emitted' | 'failed' | 'retry_scheduled' | 'dead_letter'

export interface DteEmissionQueueItem {
  queueId: string
  incomeId: string
  requestedBy: string
  status: DteEmissionStatus
  attemptCount: number
  maxAttempts: number
  lastError: string | null
  nextRetryAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Schema ──

let schemaReady = false

export const ensureDteEmissionQueueSchema = async () => {
  if (schemaReady) return

  await runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_finance.dte_emission_queue (
      queue_id         TEXT PRIMARY KEY,
      income_id        TEXT NOT NULL,
      requested_by     TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'emitting', 'emitted', 'failed', 'retry_scheduled', 'dead_letter')),
      attempt_count    INT NOT NULL DEFAULT 0,
      max_attempts     INT NOT NULL DEFAULT 3,
      last_error       TEXT,
      next_retry_at    TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT dte_queue_income_unique UNIQUE (income_id, status)
    )
  `)

  await runGreenhousePostgresQuery(`
    CREATE INDEX IF NOT EXISTS idx_dte_queue_pending
    ON greenhouse_finance.dte_emission_queue (status, next_retry_at)
    WHERE status IN ('pending', 'retry_scheduled')
  `)

  schemaReady = true
}

// ── Enqueue ──

export const enqueueDteEmission = async (incomeId: string, requestedBy: string): Promise<string> => {
  await ensureDteEmissionQueueSchema()

  const queueId = `dte-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.dte_emission_queue
       (queue_id, income_id, requested_by, status, attempt_count, max_attempts, created_at, updated_at)
     VALUES ($1, $2, $3, 'pending', 0, 3, now(), now())
     ON CONFLICT (income_id, status) DO NOTHING`,
    [queueId, incomeId, requestedBy]
  )

  return queueId
}

// ── Claim pending items ──

const RETRY_DELAYS_MS = [0, 3_600_000, 14_400_000, 86_400_000] // immediate, 1h, 4h, 24h

export const claimPendingDteEmissions = async (batchSize = 5): Promise<DteEmissionQueueItem[]> => {
  await ensureDteEmissionQueueSchema()

  const rows = await runGreenhousePostgresQuery<DteEmissionQueueItem & Record<string, unknown>>(
    `UPDATE greenhouse_finance.dte_emission_queue
     SET status = 'emitting', attempt_count = attempt_count + 1, updated_at = now()
     WHERE queue_id IN (
       SELECT queue_id FROM greenhouse_finance.dte_emission_queue
       WHERE (status = 'pending' OR (status = 'retry_scheduled' AND next_retry_at <= now()))
         AND attempt_count < max_attempts
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING queue_id AS "queueId", income_id AS "incomeId", requested_by AS "requestedBy",
       status, attempt_count AS "attemptCount", max_attempts AS "maxAttempts",
       last_error AS "lastError", next_retry_at::text AS "nextRetryAt",
       created_at::text AS "createdAt", updated_at::text AS "updatedAt"`,
    [batchSize]
  )

  return rows.map(r => ({
    queueId: String(r.queueId),
    incomeId: String(r.incomeId),
    requestedBy: String(r.requestedBy),
    status: String(r.status) as DteEmissionStatus,
    attemptCount: Number(r.attemptCount),
    maxAttempts: Number(r.maxAttempts),
    lastError: r.lastError ? String(r.lastError) : null,
    nextRetryAt: r.nextRetryAt ? String(r.nextRetryAt) : null,
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt)
  }))
}

// ── Mark results ──

export const markDteEmitted = async (queueId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.dte_emission_queue
     SET status = 'emitted', last_error = NULL, updated_at = now()
     WHERE queue_id = $1`,
    [queueId]
  )
}

export const markDteEmissionFailed = async (queueId: string, error: string, attemptCount: number, maxAttempts: number): Promise<void> => {
  const isDeadLetter = attemptCount >= maxAttempts
  const nextStatus = isDeadLetter ? 'dead_letter' : 'retry_scheduled'
  const retryDelay = RETRY_DELAYS_MS[Math.min(attemptCount, RETRY_DELAYS_MS.length - 1)]

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.dte_emission_queue
     SET status = $1, last_error = $2,
         next_retry_at = CASE WHEN $1 = 'retry_scheduled' THEN now() + ($3 || ' milliseconds')::interval ELSE NULL END,
         updated_at = now()
     WHERE queue_id = $4`,
    [nextStatus, error.slice(0, 1000), String(retryDelay), queueId]
  )
}

// ── Stats ──

export const getDteEmissionQueueStats = async (): Promise<{
  pending: number
  retryScheduled: number
  emitting: number
  emitted: number
  failed: number
  deadLetter: number
}> => {
  await ensureDteEmissionQueueSchema()

  const rows = await runGreenhousePostgresQuery<{ status: string; count: string } & Record<string, unknown>>(
    `SELECT status, COUNT(*)::text AS count
     FROM greenhouse_finance.dte_emission_queue
     GROUP BY status`
  )

  const map = new Map(rows.map(r => [r.status, Number(r.count)]))

  return {
    pending: map.get('pending') ?? 0,
    retryScheduled: map.get('retry_scheduled') ?? 0,
    emitting: map.get('emitting') ?? 0,
    emitted: map.get('emitted') ?? 0,
    failed: map.get('failed') ?? 0,
    deadLetter: map.get('dead_letter') ?? 0
  }
}
