import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-937 — Heartbeat del AI Observer en `greenhouse_sync.source_sync_runs`.
 *
 * Reusa el primitivo canónico de run-tracking (mismo patrón que
 * `reactive-run-tracker.ts`, `source_system='reactive_worker'`) con
 * `source_system='reliability_ai_observer'`. NO crea tabla nueva (SSOT,
 * extend-don't-parallel).
 *
 * Por qué existe: antes de TASK-937 la liveness del observer se infería de su
 * OUTPUT (una fila `overview` fresca en `reliability_ai_observations`). Como
 * el overview se deduplica por fingerprint del snapshot determinístico, una
 * postura estable hacía que no se persistiera y el observer parecía "apagado"
 * aunque corriera bien. El heartbeat desacopla "¿corre?" de "¿hay narrativa
 * fresca?": cada sweep deja un run record append-only, regardless del dedup.
 *
 * El reliability signal `reliability.ai_observer.unhealthy` lee este heartbeat.
 */

export const AI_OBSERVER_SOURCE_SYSTEM = 'reliability_ai_observer'

/**
 * skippedReason canónico que el runner emite cuando el kill-switch está OFF.
 * El runner lo importa de acá para mantener un único string-of-truth y el
 * tracker lo usa para clasificar el run como `cancelled` (no `failed`).
 */
export const AI_OBSERVER_DISABLED_REASON = 'RELIABILITY_AI_OBSERVER_ENABLED=false (opt-in default OFF)'

/**
 * Subset del CHECK `source_sync_runs_status_check`
 * (`running|succeeded|failed|partial|cancelled`). El observer no usa `partial`.
 * `skipped` NO existe en el enum — disabled mapea a `cancelled`, parse-fail a
 * `failed`.
 */
export type AiObserverRunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface AiObserverRunRecord {
  runId: string
  status: AiObserverRunStatus
  triggeredBy: string | null
  notes: string | null
  startedAt: string
  finishedAt: string | null
}

export const generateAiObserverRunId = () => `ai-observer-${randomUUID()}`

/**
 * Campos del sweep summary que determinan el outcome del heartbeat. Se toma
 * solo lo necesario (no el `AiSweepSummary` completo) para evitar un import
 * de tipo cíclico con `runner.ts`.
 */
export interface AiObserverSweepOutcome {
  skippedReason: string | null
  finishReason: string | null
  observationsEvaluated: number
  observationsPersisted: number
  observationsSkipped: number
}

/**
 * Deriva `(status, notes)` canónico desde el outcome del sweep. Pure +
 * testable. Respeta el CHECK enum de `source_sync_runs.status`.
 */
export const deriveAiObserverRunOutcome = (
  outcome: AiObserverSweepOutcome
): { status: AiObserverRunStatus; notes: string } => {
  if (outcome.skippedReason === AI_OBSERVER_DISABLED_REASON) {
    return { status: 'cancelled', notes: 'disabled:kill-switch-off' }
  }

  if (outcome.skippedReason) {
    // Path de falla real de Gemini (empty response / JSON inválido tras retry).
    const kind = outcome.skippedReason.includes('empty response') ? 'empty_response' : 'parse_failed'

    return {
      status: 'failed',
      notes: `${kind}:${outcome.finishReason ?? 'unknown'} — ${outcome.skippedReason}`.slice(0, 500)
    }
  }

  // Sweep exitoso (parseó OK). persisted=0 con evaluated>0 = dedup, también OK.
  return {
    status: 'succeeded',
    notes: `persisted=${outcome.observationsPersisted} evaluated=${outcome.observationsEvaluated} dedup_skipped=${outcome.observationsSkipped}`
  }
}

/**
 * Registra el inicio de un sweep (`status='running'`). Idempotente por runId.
 */
export const writeAiObserverRunStart = async ({
  runId,
  triggeredBy
}: {
  runId: string
  triggeredBy: string
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
       sync_run_id, source_system, source_object_type, sync_mode,
       status, records_read, records_written_raw, triggered_by, notes, finished_at
     )
     VALUES ($1, $2, 'reliability_snapshot', 'poll', 'running', 0, 0, $3, NULL, NULL)
     ON CONFLICT (sync_run_id) DO NOTHING`,
    [runId, AI_OBSERVER_SOURCE_SYSTEM, triggeredBy]
  )
}

/**
 * Cierra un sweep con el outcome derivado. `records_read`=evaluated,
 * `records_written_raw`=persisted.
 */
export const writeAiObserverRunComplete = async ({
  runId,
  outcome
}: {
  runId: string
  outcome: AiObserverSweepOutcome
}): Promise<void> => {
  const { status, notes } = deriveAiObserverRunOutcome(outcome)

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
        SET status = $2,
            records_read = $3,
            records_written_raw = $4,
            notes = $5,
            finished_at = CURRENT_TIMESTAMP
      WHERE sync_run_id = $1`,
    [runId, status, outcome.observationsEvaluated, outcome.observationsPersisted, notes]
  )
}

/**
 * Cierra un sweep que lanzó una excepción no controlada (`status='failed'`).
 */
export const writeAiObserverRunFailure = async ({
  runId,
  error
}: {
  runId: string
  error: unknown
}): Promise<void> => {
  const message = error instanceof Error ? error.message : String(error)

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
        SET status = 'failed',
            notes = $2,
            finished_at = CURRENT_TIMESTAMP
      WHERE sync_run_id = $1`,
    [runId, `exception:${message}`.slice(0, 500)]
  )
}

interface AiObserverRunRow extends Record<string, unknown> {
  sync_run_id: string
  status: string
  triggered_by: string | null
  notes: string | null
  started_at: Date | string
  finished_at: Date | string | null
}

const toIso = (value: Date | string | null): string | null => {
  if (value === null) return null

  return value instanceof Date ? value.toISOString() : value
}

const normalizeRunRow = (row: AiObserverRunRow): AiObserverRunRecord => ({
  runId: row.sync_run_id,
  status: row.status as AiObserverRunStatus,
  triggeredBy: row.triggered_by,
  notes: row.notes,
  startedAt: toIso(row.started_at) ?? new Date(0).toISOString(),
  finishedAt: toIso(row.finished_at)
})

/**
 * Últimos N sweeps del observer (cualquier status), más reciente primero.
 * Usa el índice parcial `idx_source_sync_runs_reliability_ai_observer`.
 */
export const getRecentAiObserverRuns = async (limit = 6): Promise<AiObserverRunRecord[]> => {
  const rows = await runGreenhousePostgresQuery<AiObserverRunRow>(
    `SELECT sync_run_id, status, triggered_by, notes, started_at, finished_at
       FROM greenhouse_sync.source_sync_runs
      WHERE source_system = $1
      ORDER BY started_at DESC
      LIMIT $2`,
    [AI_OBSERVER_SOURCE_SYSTEM, limit]
  )

  return rows.map(normalizeRunRow)
}

/**
 * Último sweep del observer (cualquier status), o null si nunca corrió.
 */
export const getLastAiObserverRun = async (): Promise<AiObserverRunRecord | null> => {
  const rows = await getRecentAiObserverRuns(1)

  return rows[0] ?? null
}
