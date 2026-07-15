import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { computeAttributableLatenessForTask } from '@/lib/sync/projections/notion-attributable-lateness-compute'
import { patchNotionPage } from '@/lib/space-notion/notion-client'
import {
  formatTerminalNotionWritebackError,
  isNotionArchivedBlockError,
  isRetryableNotionError
} from '@/lib/space-notion/notion-errors'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  NOTION_PROPERTY_OTD_BUCKET,
  OTD_BUCKET_SELECT_NAME,
  OTD_WRITEBACK_FORMULA_VERSION,
  OTD_WRITEBACK_PRODUCTIVE_WORKSPACES,
  isOtdWritebackEnabled
} from './otd-writeback-constants'

import type { OtdBucket } from './otd-bucket-types'

/**
 * TASK-927 Slice 3 — Daily batch del writeback del bucket OTD a Notion (`[GH] OTD`).
 *
 * Diferencia clave vs RpA/FTR (reactivos): el bucket OTD es `now()`-dependiente
 * (una tarea abierta cruza su due_date y pasa a `overdue`/`carry_over` sin ningún
 * evento Notion). Por eso es un BATCH DIARIO que **recomputa** el bucket
 * freeze-aware antes de escribir, no event-driven.
 *
 * Por cada tarea de la cohorte (las del M2 shadow `task_attributable_lateness_shadow`
 * — tienen `workspace_id` nativo + bucket freeze-corregido; V1 cubre el shadow,
 * que crece con la captura M2; la enumeración full del período es follow-up):
 *
 * 1. Gate flag per-cliente `isOtdWritebackEnabled` (default OFF → skip honest).
 * 2. **Recompute** `computeAttributableLatenessForTask` (refresca el bucket
 *    `now()`-dependiente + aplica el fix de estado efectivo de TASK-1174).
 * 3. Re-lee `bucket_attributable` + `data_status` del shadow. Solo `valid` se escribe.
 * 4. **Idempotencia skip-if-unchanged**: si el último snapshot ESCRITO tiene el
 *    mismo bucket → skip (no re-PATCH).
 * 5. INSERT snapshot (pending) → throttle (~2.5 req/s) → PATCH `[GH] OTD` select →
 *    marca `written_to_notion_at`. Per-task resiliente (una tarea mala no aborta).
 *
 * **Gate duro (ISSUE-098 / TASK-1174):** si el shadow tiene tareas TERMINALES con
 * bucket abierto, NO escribe nada (escribiría "atrasada" sobre tareas entregadas,
 * visible al cliente). Reusa el invariante de TASK-1174.
 *
 * Echo-loop safe: escribe un `select`, NO el `Estado` → la captura re-fetchea
 * STATUS unchanged → noop. Display-only, NUNCA toca el bono.
 */

// Notion ~3 req/s sustained → throttle a ~2.5 req/s (margen de seguridad).
// Cloud Tasks queda como growth-path (precedente RpA writeback), no V1.
const NOTION_WRITE_THROTTLE_MS = 400

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const isOtdBucket = (value: string): value is OtdBucket =>
  value === 'on_time' ||
  value === 'late_drop' ||
  value === 'overdue' ||
  value === 'carry_over' ||
  value === 'not_applicable'

export interface OtdWritebackBatchResult {
  workspacesEnabled: string[]
  gateBlocked: boolean
  terminalOpenCount: number
  scanned: number
  written: number
  skippedUnchanged: number
  skippedNotValid: number
  skippedTerminal: number
  failed: number
}

type ShadowCohortRow = {
  task_source_id: string
  workspace_id: string
}

type ShadowComputeRow = {
  bucket_attributable: string
  data_status: string
}

type LatestSnapshotRow = {
  otd_bucket: string | null
  written_to_notion_at: string | null
}

/**
 * Gate ISSUE-098: cuenta tareas TERMINALES (Aprobado/Archivado) con bucket abierto
 * en el shadow. > 0 = la fuente tiene buckets stale → NO escribir (TASK-1174).
 */
const countTerminalOpenShadowRows = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
     FROM greenhouse_delivery.task_attributable_lateness_shadow s
     JOIN greenhouse_delivery.tasks t ON t.notion_task_id = s.task_source_id
     WHERE t.task_status IN ('Aprobado', 'Archivado')
       AND s.bucket_attributable IN ('overdue', 'carry_over')`
  )

  
return Number(rows[0]?.n ?? 0)
}

const readEnabledCohort = async (enabledWorkspaces: string[]): Promise<ShadowCohortRow[]> => {
  if (enabledWorkspaces.length === 0) {
    return []
  }

  
return runGreenhousePostgresQuery<ShadowCohortRow>(
    `SELECT DISTINCT task_source_id, workspace_id
     FROM greenhouse_delivery.task_attributable_lateness_shadow
     WHERE workspace_id = ANY($1::text[])`,
    [enabledWorkspaces]
  )
}

const readFreshBucket = async (taskSourceId: string): Promise<ShadowComputeRow | null> => {
  const rows = await runGreenhousePostgresQuery<ShadowComputeRow>(
    `SELECT bucket_attributable, data_status
     FROM greenhouse_delivery.task_attributable_lateness_shadow
     WHERE task_source_id = $1`,
    [taskSourceId]
  )

  
return rows[0] ?? null
}

const readLatestSnapshot = async (taskSourceId: string): Promise<LatestSnapshotRow | null> => {
  const rows = await runGreenhousePostgresQuery<LatestSnapshotRow>(
    `SELECT otd_bucket, written_to_notion_at::text AS written_to_notion_at
     FROM greenhouse_delivery.task_otd_writeback_snapshots
     WHERE task_source_id = $1
     ORDER BY computed_at DESC
     LIMIT 1`,
    [taskSourceId]
  )

  
return rows[0] ?? null
}

const insertPendingSnapshot = async (
  taskSourceId: string,
  workspaceId: string,
  bucket: OtdBucket,
  dataStatus: string
): Promise<string> => {
  const rows = await runGreenhousePostgresQuery<{ snapshot_id: string }>(
    `INSERT INTO greenhouse_delivery.task_otd_writeback_snapshots (
       task_source_id, workspace_id, otd_bucket, otd_data_status, formula_version
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING snapshot_id`,
    [taskSourceId, workspaceId, bucket, dataStatus, OTD_WRITEBACK_FORMULA_VERSION]
  )

  
return rows[0].snapshot_id
}

const markWritten = async (snapshotId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_otd_writeback_snapshots
     SET written_to_notion_at = NOW(),
         notion_writeback_last_error = NULL,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId]
  )
}

const markFailed = async (snapshotId: string, errorMessage: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_otd_writeback_snapshots
     SET notion_writeback_last_error = $2,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId, errorMessage.slice(0, 1000)]
  )
}

export const runOtdWritebackBatch = async (): Promise<OtdWritebackBatchResult> => {
  const enabledWorkspaces = Array.from(OTD_WRITEBACK_PRODUCTIVE_WORKSPACES).filter(ws =>
    isOtdWritebackEnabled(ws)
  )

  const result: OtdWritebackBatchResult = {
    workspacesEnabled: enabledWorkspaces,
    gateBlocked: false,
    terminalOpenCount: 0,
    scanned: 0,
    written: 0,
    skippedUnchanged: 0,
    skippedNotValid: 0,
    skippedTerminal: 0,
    failed: 0
  }

  if (enabledWorkspaces.length === 0) {
    return result // flag OFF en todos los workspaces → no-op honest
  }

  // Gate duro ISSUE-098: no escribir si la fuente tiene buckets terminales abiertos.
  result.terminalOpenCount = await countTerminalOpenShadowRows()

  if (result.terminalOpenCount > 0) {
    result.gateBlocked = true
    captureWithDomain(
      new Error(
        `OTD writeback batch bloqueado: ${result.terminalOpenCount} tareas terminales con bucket abierto en el shadow (ISSUE-098). Correr recompute-attributable-lateness-terminal-open.`
      ),
      'integrations.notion',
      { level: 'warning', tags: { source: 'otd_writeback', stage: 'gate_terminal_open' } }
    )
    
return result
  }

  const cohort = await readEnabledCohort(enabledWorkspaces)

  result.scanned = cohort.length

  for (const { task_source_id: taskSourceId, workspace_id: workspaceId } of cohort) {
    try {
      // Recompute (refresca el bucket now()-dependiente + fix TASK-1174).
      await computeAttributableLatenessForTask(taskSourceId, workspaceId)

      const fresh = await readFreshBucket(taskSourceId)

      if (!fresh || fresh.data_status !== 'valid' || !isOtdBucket(fresh.bucket_attributable)) {
        result.skippedNotValid += 1
        continue
      }

      const bucket = fresh.bucket_attributable

      // Idempotencia skip-if-unchanged: el último snapshot ESCRITO con el mismo bucket.
      const latest = await readLatestSnapshot(taskSourceId)

      if (latest?.written_to_notion_at && latest.otd_bucket === bucket) {
        result.skippedUnchanged += 1
        continue
      }

      const snapshotId = await insertPendingSnapshot(taskSourceId, workspaceId, bucket, fresh.data_status)

      // Throttle ANTES del PATCH (margen rate-limit Notion).
      await sleep(NOTION_WRITE_THROTTLE_MS)

      try {
        await patchNotionPage(taskSourceId, {
          [NOTION_PROPERTY_OTD_BUCKET]: { select: { name: OTD_BUCKET_SELECT_NAME[bucket] } }
        })
        await markWritten(snapshotId)
        result.written += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const isTerminalArchivedBlock = isNotionArchivedBlockError(err)
        const persistedMessage = isTerminalArchivedBlock ? formatTerminalNotionWritebackError(err) : message

        await markFailed(snapshotId, persistedMessage).catch(() => undefined)

        if (isTerminalArchivedBlock) {
          result.skippedTerminal += 1
          continue
        }

        if (!isRetryableNotionError(err)) {
          captureWithDomain(err, 'integrations.notion', {
            level: 'error',
            tags: { source: 'otd_writeback', stage: 'patch_notion' },
            extra: { taskSourceId, workspaceId, bucket }
          })
        }

        result.failed += 1
      }
    } catch (err) {
      result.failed += 1
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'otd_writeback', stage: 'recompute_or_snapshot' },
        extra: { taskSourceId, workspaceId }
      })
    }
  }

  return result
}
