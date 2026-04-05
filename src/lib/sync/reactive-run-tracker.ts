import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ReactiveConsumerResult } from './reactive-consumer'

// ── Types ──

export type ReactiveRunStatus = 'running' | 'succeeded' | 'failed' | 'partial'

export interface ReactiveRunRecord {
  runId: string
  sourceSystem: string
  triggeredBy: string
  status: ReactiveRunStatus
  eventsProcessed: number
  projectionsTriggered: number
  durationMs: number
  startedAt: string
  finishedAt: string | null
  notes: string | null
}

// ── Run tracking helpers ──

/**
 * Generates a unique run ID for a reactive worker invocation.
 * Format: `reactive-{uuid}` to distinguish from outbox publish runs.
 */
export const generateReactiveRunId = () => `reactive-${randomUUID()}`

/**
 * Records the start of a reactive worker run in `source_sync_runs`.
 * Call this at the beginning of each worker invocation.
 */
export const writeReactiveRunStart = async ({
  runId,
  triggeredBy,
  sourceObjectType = 'reactive_events',
  notes
}: {
  runId: string
  triggeredBy: string
  sourceObjectType?: string
  notes?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, records_read, records_written_raw, triggered_by, notes, finished_at
    )
    VALUES ($1, 'reactive_worker', $2, 'poll', 'running', 0, 0, $3, $4, NULL)
    ON CONFLICT (sync_run_id) DO NOTHING`,
    [runId, sourceObjectType, triggeredBy, notes || null]
  )
}

/**
 * Records the completion of a reactive worker run.
 * Updates the existing row with final stats from `ReactiveConsumerResult`.
 */
export const writeReactiveRunComplete = async ({
  runId,
  result,
  status
}: {
  runId: string
  result: ReactiveConsumerResult
  status?: ReactiveRunStatus
}) => {
  const finalStatus =
    status ??
    (result.eventsFailed > 0 && result.eventsProcessed > 0
      ? 'partial'
      : result.eventsFailed > 0
        ? 'failed'
        : 'succeeded')

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = $2,
         records_read = $3,
         records_written_raw = $4,
         notes = $5,
         finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [
      runId,
      finalStatus,
      result.eventsProcessed + result.eventsFailed,
      result.projectionsTriggered,
      `${result.eventsProcessed} processed, ${result.eventsFailed} failed, ${result.projectionsTriggered} projections, ${result.durationMs}ms`
    ]
  )
}

/**
 * Records a failed reactive worker run (catch-all for unhandled errors).
 */
export const writeReactiveRunFailure = async ({ runId, error }: { runId: string; error: unknown }) => {
  const message = error instanceof Error ? error.message : String(error)

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = 'failed',
         notes = $2,
         finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [runId, message.slice(0, 500)]
  )
}

/**
 * Reads the most recent successful reactive worker run.
 * Used by Ops surfaces to show "last successful run" signal.
 */
export const getLastSuccessfulReactiveRun = async (): Promise<ReactiveRunRecord | null> => {
  const rows = await runGreenhousePostgresQuery<{
    sync_run_id: string
    source_system: string
    triggered_by: string
    status: string
    records_read: number
    records_written_raw: number
    notes: string | null
    started_at: string | Date
    finished_at: string | Date
  }>(
    `SELECT sync_run_id, source_system, triggered_by, status,
            records_read, records_written_raw, notes, started_at, finished_at
     FROM greenhouse_sync.source_sync_runs
     WHERE source_system = 'reactive_worker'
       AND status IN ('succeeded', 'partial')
     ORDER BY finished_at DESC NULLS LAST
     LIMIT 1`
  )

  if (rows.length === 0) return null

  const row = rows[0]
  const startedAt = new Date(row.started_at).getTime()
  const finishedAt = row.finished_at ? new Date(row.finished_at).getTime() : startedAt

  return {
    runId: row.sync_run_id,
    sourceSystem: row.source_system,
    triggeredBy: row.triggered_by,
    status: row.status as ReactiveRunStatus,
    eventsProcessed: row.records_read,
    projectionsTriggered: row.records_written_raw,
    durationMs: finishedAt - startedAt,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    notes: row.notes
  }
}

/**
 * Reads the most recent reactive worker run (any status).
 * Used to determine if the worker is currently alive and running.
 */
export const getLastReactiveRun = async (): Promise<ReactiveRunRecord | null> => {
  const rows = await runGreenhousePostgresQuery<{
    sync_run_id: string
    source_system: string
    triggered_by: string
    status: string
    records_read: number
    records_written_raw: number
    notes: string | null
    started_at: string | Date
    finished_at: string | Date
  }>(
    `SELECT sync_run_id, source_system, triggered_by, status,
            records_read, records_written_raw, notes, started_at, finished_at
     FROM greenhouse_sync.source_sync_runs
     WHERE source_system = 'reactive_worker'
     ORDER BY started_at DESC
     LIMIT 1`
  )

  if (rows.length === 0) return null

  const row = rows[0]
  const startedAt = new Date(row.started_at).getTime()
  const finishedAt = row.finished_at ? new Date(row.finished_at).getTime() : startedAt

  return {
    runId: row.sync_run_id,
    sourceSystem: row.source_system,
    triggeredBy: row.triggered_by,
    status: row.status as ReactiveRunStatus,
    eventsProcessed: row.records_read,
    projectionsTriggered: row.records_written_raw,
    durationMs: finishedAt - startedAt,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    notes: row.notes
  }
}
