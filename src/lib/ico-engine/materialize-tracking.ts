import 'server-only'

import { query } from '@/lib/db'

import type { BlockingSignalSummary } from './materialize-guards'

/**
 * TASK-900 — ICO Materializer tracking helpers (PG governance).
 *
 * Single source of truth para "qué materializer corrió cuándo y con qué
 * resultado". Reemplaza el supuesto implícito del cron legacy ("borrar y
 * reinsertar todo cada noche") por audit trail append-only que soporta:
 *   - signal `delivery.ico_materializer.skipped_safety` (Slice 6)
 *   - incremental delta filter via `getLastSuccessfulMaterializationAt`
 *     (Slice 4)
 *   - forensic / debugging post-incidente sin tener que mirar logs Cloud Run
 *
 * Tabla: `greenhouse_sync.ico_materialization_runs` (migration
 * `20260518141020881_ico-materializer-tracking.sql`). Anti-UPDATE /
 * anti-DELETE triggers enforced en DB — los UPDATEs aquí son SOLO el patch
 * canónico `running → succeeded|failed|skipped_safety` permitido por el
 * trigger.
 */

export type IcoMaterializerTableName =
  | 'metrics_by_member'
  | 'metrics_by_project'
  | 'metrics_by_sprint'
  | 'metrics_by_organization'
  | 'metrics_by_business_unit'

export type IcoMaterializationRunStatus =
  | 'running'
  | 'succeeded'
  | 'skipped_safety'
  | 'failed'

interface BeginIcoMaterializationRunInput {
  tableName: IcoMaterializerTableName
  periodYear: number
  periodMonth: number
}

interface BeginIcoMaterializationRunResult {
  materializationId: string
  startedAt: Date
}

/**
 * INSERT row inicial con `status='running'`. Devuelve el `materializationId`
 * que se patchea luego via `completeIcoMaterializationRun` /
 * `failIcoMaterializationRun` / `skipIcoMaterializationRun`.
 *
 * Append-only: cada corrida = nueva row (NUNCA UPDATE de filas previas).
 * El patch posterior solo permite la transición `running → terminal` para
 * fijar `completed_at` + `rows_merged|rows_inserted` + `status` final.
 */
export const beginIcoMaterializationRun = async (
  input: BeginIcoMaterializationRunInput
): Promise<BeginIcoMaterializationRunResult> => {
  const rows = await query<{
    materialization_id: string
    started_at: Date
  }>(
    `
    INSERT INTO greenhouse_sync.ico_materialization_runs
      (table_name, period_year, period_month, status)
    VALUES ($1, $2, $3, 'running')
    RETURNING materialization_id, started_at
    `,
    [input.tableName, input.periodYear, input.periodMonth]
  )

  const row = rows[0]

  if (!row) {
    throw new Error('beginIcoMaterializationRun: INSERT did not return a row')
  }

  return {
    materializationId: row.materialization_id,
    startedAt: row.started_at instanceof Date ? row.started_at : new Date(row.started_at)
  }
}

interface CompleteIcoMaterializationRunInput {
  materializationId: string
  rowsMerged: number
  notes?: string | null
}

/**
 * Patch row a `status='succeeded'` con `completed_at=NOW()` + `rows_merged`.
 * Trigger DB enforce que sólo se patchee desde status='running'.
 */
export const completeIcoMaterializationRun = async (
  input: CompleteIcoMaterializationRunInput
): Promise<void> => {
  await query(
    `
    UPDATE greenhouse_sync.ico_materialization_runs
    SET status = 'succeeded',
        completed_at = NOW(),
        rows_merged = $2,
        notes = COALESCE($3, notes)
    WHERE materialization_id = $1
    `,
    [input.materializationId, input.rowsMerged, input.notes ?? null]
  )
}

interface SkipIcoMaterializationRunInput {
  tableName: IcoMaterializerTableName
  periodYear: number
  periodMonth: number
  blockingSignals: readonly BlockingSignalSummary[]
  reason: string
}

/**
 * Path canónico cuando el `runUpstreamFreshnessGate` retorna `safe=false`.
 * INSERT directo con `status='skipped_safety'` + `completed_at=NOW()` +
 * `blocking_signals` JSONB. No pasa por el `beginIcoMaterializationRun`
 * porque la corrida ni siquiera arrancó — es un skip preemptivo.
 *
 * CHECK constraint DB: `skipped_safety` requiere `blocking_signals IS NOT NULL`.
 */
export const skipIcoMaterializationRun = async (
  input: SkipIcoMaterializationRunInput
): Promise<{ materializationId: string }> => {
  const rows = await query<{ materialization_id: string }>(
    `
    INSERT INTO greenhouse_sync.ico_materialization_runs
      (table_name, period_year, period_month, status, completed_at, blocking_signals, notes)
    VALUES ($1, $2, $3, 'skipped_safety', NOW(), $4::jsonb, $5)
    RETURNING materialization_id
    `,
    [
      input.tableName,
      input.periodYear,
      input.periodMonth,
      JSON.stringify(input.blockingSignals),
      input.reason
    ]
  )

  const row = rows[0]

  if (!row) {
    throw new Error('skipIcoMaterializationRun: INSERT did not return a row')
  }

  return { materializationId: row.materialization_id }
}

interface FailIcoMaterializationRunInput {
  materializationId: string
  errorMessage: string
}

/**
 * Patch row a `status='failed'` cuando MERGE BQ tira excepción runtime
 * (e.g. quota exceeded, schema mismatch, source duplicate keys). El
 * materializer captureWithDomain + throw; este helper persiste el audit
 * trail antes del throw.
 */
export const failIcoMaterializationRun = async (
  input: FailIcoMaterializationRunInput
): Promise<void> => {
  await query(
    `
    UPDATE greenhouse_sync.ico_materialization_runs
    SET status = 'failed',
        completed_at = NOW(),
        notes = $2
    WHERE materialization_id = $1
    `,
    [input.materializationId, input.errorMessage]
  )
}

interface GetLastSuccessfulMaterializationAtInput {
  tableName: IcoMaterializerTableName
  periodYear: number
  periodMonth: number
}

/**
 * Lookup canónico para incremental delta filter (Slice 4). Devuelve el
 * `started_at` de la última corrida `status='succeeded'` para esta
 * `(table_name, period_year, period_month)` — null si nunca corrió o
 * sólo hubo skipped_safety/failed.
 *
 * Uso: `WHERE v_tasks_enriched.last_edited_time >= <result> - INTERVAL '1 hour'`
 * (1h overlap = defensa contra races entre el `started_at` y el momento de
 * la query downstream).
 *
 * INDEX covering: `ico_materialization_runs_lookup_idx` sobre
 * `(table_name, period_year, period_month, started_at DESC)`. LIMIT 1
 * DESC scan = O(log n).
 */
export const getLastSuccessfulMaterializationAt = async (
  input: GetLastSuccessfulMaterializationAtInput
): Promise<Date | null> => {
  const rows = await query<{ started_at: Date | string }>(
    `
    SELECT started_at
    FROM greenhouse_sync.ico_materialization_runs
    WHERE table_name = $1
      AND period_year = $2
      AND period_month = $3
      AND status = 'succeeded'
    ORDER BY started_at DESC
    LIMIT 1
    `,
    [input.tableName, input.periodYear, input.periodMonth]
  )

  const row = rows[0]

  if (!row) return null

  return row.started_at instanceof Date ? row.started_at : new Date(row.started_at)
}

/**
 * Lookup auxiliar para reliability signal `delivery.ico_materializer.skipped_safety`
 * (Slice 6). Cuenta corridas `status='skipped_safety'` en ventana 24h.
 * Subindex parcial canonical: `ico_materialization_runs_skipped_safety_recent_idx`.
 */
export const countRecentSkippedSafetyRuns = async (
  windowHours = 24
): Promise<{
  count: number
  oldestStartedAt: Date | null
  newestStartedAt: Date | null
}> => {
  const rows = await query<{
    cnt: string | number
    oldest: Date | string | null
    newest: Date | string | null
  }>(
    `
    SELECT
      COUNT(*)::int AS cnt,
      MIN(started_at) AS oldest,
      MAX(started_at) AS newest
    FROM greenhouse_sync.ico_materialization_runs
    WHERE status = 'skipped_safety'
      AND started_at >= NOW() - make_interval(hours => $1)
    `,
    [windowHours]
  )

  const row = rows[0]
  const count = Number(row?.cnt ?? 0)

  const toDate = (v: Date | string | null): Date | null =>
    !v ? null : v instanceof Date ? v : new Date(v)

  return {
    count,
    oldestStartedAt: toDate(row?.oldest ?? null),
    newestStartedAt: toDate(row?.newest ?? null)
  }
}
