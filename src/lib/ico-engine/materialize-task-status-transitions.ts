import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-912 Slice 3 — Materializer PG → BigQuery de `task_status_transitions`.
 *
 * Sincroniza `greenhouse_delivery.task_status_transitions` (PG, source of truth,
 * TASK-908) → `greenhouse_conformed.task_status_transitions` (BQ) para que la
 * fórmula canónica `cycle_time_days` de `v_tasks_enriched` (Slice 4, behind flag)
 * pueda consumir las transiciones via JOIN en BQ.
 *
 * **Diseño canónico (TASK-771 reactive pattern, NO Cloud Scheduler nuevo)**:
 * la sincronización corre como projection reactiva consumiendo
 * `notion.task.status_transitioned` (ver `notion-transition-bq-sync.ts`), que
 * re-lee PG por `source_event_id` y MERGEa la fila a BQ. Rides el reactive
 * consumer existente — cero infra nueva. El backfill (Slice 6) reusa
 * `materializeTransitionsFromPg` directamente.
 *
 * **Idempotencia universal**: MERGE ON `transition_id` (PK UUID de PG, presente
 * en TODA fila — live + backfilled). NUNCA duplica en re-runs. Append-only:
 * solo `WHEN NOT MATCHED THEN INSERT` (las transiciones son inmutables).
 *
 * **No-op seguro**: con la captura apagada (flag OFF), PG está vacío → 0 filas →
 * MERGE no-op. Cero impacto en la VIEW de métricas existente.
 *
 * BQ DDL: sin DEFAULT (constraint BigQuery). Sin combinar DML + SELECT.
 */

const CONFORMED_DATASET = 'greenhouse_conformed'
const TABLE = 'task_status_transitions'

let ensureBqTablePromise: Promise<void> | null = null

/**
 * CREATE TABLE IF NOT EXISTS canónico (mirror del schema PG TASK-908, sin
 * DEFAULT). Singleton promise — safe re-run. Idempotente.
 */
export const ensureTaskStatusTransitionsBqTable = async (): Promise<void> => {
  if (ensureBqTablePromise) {
    return ensureBqTablePromise
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  ensureBqTablePromise = (async () => {
    await bigQuery.query({
      query: `CREATE TABLE IF NOT EXISTS \`${projectId}.${CONFORMED_DATASET}.${TABLE}\` (
        transition_id STRING NOT NULL,
        task_source_id STRING NOT NULL,
        workspace_id STRING NOT NULL,
        from_status STRING NOT NULL,
        to_status STRING NOT NULL,
        transitioned_at TIMESTAMP NOT NULL,
        transitioned_by STRING,
        source_event_id STRING,
        source_quality STRING NOT NULL,
        captured_at TIMESTAMP,
        created_at TIMESTAMP
      )`
    })
  })().catch(error => {
    ensureBqTablePromise = null
    throw error
  })

  return ensureBqTablePromise
}

export interface TransitionRowForBq {
  transition_id: string
  task_source_id: string
  workspace_id: string
  from_status: string
  to_status: string
  transitioned_at: string
  transitioned_by: string | null
  source_event_id: string | null
  source_quality: string
  captured_at: string | null
  created_at: string | null
}

/**
 * MERGE una fila de transición a BQ por `transition_id` (idempotente, append-only).
 * BQ no permite combinar DML + SELECT — esta función solo hace el MERGE.
 */
const mergeTransitionRowToBq = async (row: TransitionRowForBq): Promise<void> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `MERGE \`${projectId}.${CONFORMED_DATASET}.${TABLE}\` T
      USING (
        SELECT
          @transition_id AS transition_id,
          @task_source_id AS task_source_id,
          @workspace_id AS workspace_id,
          @from_status AS from_status,
          @to_status AS to_status,
          TIMESTAMP(@transitioned_at) AS transitioned_at,
          @transitioned_by AS transitioned_by,
          @source_event_id AS source_event_id,
          @source_quality AS source_quality,
          ${row.captured_at ? 'TIMESTAMP(@captured_at)' : 'CAST(NULL AS TIMESTAMP)'} AS captured_at,
          ${row.created_at ? 'TIMESTAMP(@created_at)' : 'CAST(NULL AS TIMESTAMP)'} AS created_at
      ) S
      ON T.transition_id = S.transition_id
      WHEN NOT MATCHED THEN INSERT (
        transition_id, task_source_id, workspace_id, from_status, to_status,
        transitioned_at, transitioned_by, source_event_id, source_quality,
        captured_at, created_at
      ) VALUES (
        S.transition_id, S.task_source_id, S.workspace_id, S.from_status, S.to_status,
        S.transitioned_at, S.transitioned_by, S.source_event_id, S.source_quality,
        S.captured_at, S.created_at
      )`,
    params: {
      transition_id: row.transition_id,
      task_source_id: row.task_source_id,
      workspace_id: row.workspace_id,
      from_status: row.from_status,
      to_status: row.to_status,
      transitioned_at: row.transitioned_at,
      transitioned_by: row.transitioned_by,
      source_event_id: row.source_event_id,
      source_quality: row.source_quality,
      ...(row.captured_at ? { captured_at: row.captured_at } : {}),
      ...(row.created_at ? { created_at: row.created_at } : {})
    },
    types: {
      transition_id: 'STRING',
      task_source_id: 'STRING',
      workspace_id: 'STRING',
      from_status: 'STRING',
      to_status: 'STRING',
      transitioned_at: 'STRING',
      transitioned_by: 'STRING',
      source_event_id: 'STRING',
      source_quality: 'STRING',
      ...(row.captured_at ? { captured_at: 'STRING' } : {}),
      ...(row.created_at ? { created_at: 'STRING' } : {})
    }
  })
}

export interface MaterializeTransitionsInput {
  /** MERGE solo las transiciones con estos `source_event_id` (path reactivo live). */
  sourceEventIds?: readonly string[]
  /** MERGE todas las transiciones PG con `created_at >= sinceTs` (path backfill/recovery). */
  sinceTs?: string
  /** Límite defensivo de filas por corrida (backfill throttled). Default 500. */
  limit?: number
}

type PgTransitionRow = {
  transition_id: string
  task_source_id: string
  workspace_id: string
  from_status: string
  to_status: string
  transitioned_at: string | Date
  transitioned_by: string | null
  source_event_id: string | null
  source_quality: string
  captured_at: string | Date | null
  created_at: string | Date | null
}

/**
 * Lee transiciones desde PG (source of truth — re-read canónico, NUNCA confía
 * payload) y las MERGEa a BQ una por una (idempotente). Retorna el count.
 *
 * - `sourceEventIds`: path reactivo (1+ filas por evento). Canonical re-read.
 * - `sinceTs`: path backfill/recovery (todas las filas desde un checkpoint).
 */
export const materializeTransitionsFromPg = async (
  input: MaterializeTransitionsInput
): Promise<{ merged: number }> => {
  await ensureTaskStatusTransitionsBqTable()

  const limit = Math.max(1, Math.min(input.limit ?? 500, 5000))

  let rows: PgTransitionRow[] = []

  if (input.sourceEventIds && input.sourceEventIds.length > 0) {
    rows = await runGreenhousePostgresQuery<PgTransitionRow>(
      `SELECT transition_id, task_source_id, workspace_id, from_status, to_status,
              transitioned_at, transitioned_by, source_event_id, source_quality,
              captured_at, created_at
       FROM greenhouse_delivery.task_status_transitions
       WHERE source_event_id = ANY($1::text[])
       ORDER BY transitioned_at ASC
       LIMIT $2`,
      [input.sourceEventIds as string[], limit]
    )
  } else if (input.sinceTs) {
    rows = await runGreenhousePostgresQuery<PgTransitionRow>(
      `SELECT transition_id, task_source_id, workspace_id, from_status, to_status,
              transitioned_at, transitioned_by, source_event_id, source_quality,
              captured_at, created_at
       FROM greenhouse_delivery.task_status_transitions
       WHERE created_at >= $1::timestamptz
       ORDER BY created_at ASC
       LIMIT $2`,
      [input.sinceTs, limit]
    )
  } else {
    return { merged: 0 }
  }

  let merged = 0

  for (const row of rows) {
    await mergeTransitionRowToBq({
      transition_id: row.transition_id,
      task_source_id: row.task_source_id,
      workspace_id: row.workspace_id,
      from_status: row.from_status,
      to_status: row.to_status,
      transitioned_at: toIsoString(row.transitioned_at),
      transitioned_by: row.transitioned_by ?? null,
      source_event_id: row.source_event_id ?? null,
      source_quality: row.source_quality,
      captured_at: row.captured_at ? toIsoString(row.captured_at) : null,
      created_at: row.created_at ? toIsoString(row.created_at) : null
    })
    merged += 1
  }

  return { merged }
}

const toIsoString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : String(value)

// Export for tests
export const __testing__ = { mergeTransitionRowToBq }
