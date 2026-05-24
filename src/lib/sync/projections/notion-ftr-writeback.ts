import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { patchNotionPage } from '@/lib/space-notion/notion-client'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-903 Slice 2 — Reactive consumer writeback FTR PRODUCTIVO (Efeonce + Sky):
 * PATCH la propiedad Notion select `[GH] FTR` (Pass/Fail) con el veredicto del
 * snapshot. Idempotente, retryable, observable. Gated por
 * `NOTION_FTR_WRITEBACK_ENABLED` (default OFF — no escribe hasta el flip gated
 * por los 8 stop-gates ADR Strangler + decisión "FTR explícito vale vs derivar
 * de RpA").
 *
 * **Sibling físicamente separado** de `notion-rpa-writeback.ts` (TASK-916).
 * Clone + repoint, NO rediseño:
 *
 * - Property `[GH] FTR` **select** (NO `[GH] RpA v2` number). FTR es derivada
 *   pura de RpA — un operador puede derivar Pass/Fail del número RpA ya escrito;
 *   esta propiedad explícita solo se activa si emerge demanda de un badge binario
 *   (ver TASK-903 "Why This Task Exists"). ⚠️ La propiedad debe existir en
 *   Efeonce/Sky antes del flip — precondición de activación (writeback OFF acá).
 * - Token productivo `NOTION_TOKEN` vía `patchNotionPage`.
 * - Gate: flag `NOTION_FTR_WRITEBACK_ENABLED === 'true'` (default false → skip
 *   honest), con override per-cliente `NOTION_FTR_WRITEBACK_ENABLED_<WS>`.
 * - Tabla `task_ftr_snapshots` (no `_rpa`).
 *
 * **Defense in depth canonical (TASK-742 7-layer, mirror RpA)**:
 *
 * 1. **Filter prod**: skip si `metadata.demo_mode === true` o `workspaceId` no es
 *    productivo (FTR no tiene carril demo — el filtro es robusto igual).
 * 2. **Gate flag** `NOTION_FTR_WRITEBACK_ENABLED`: skip honest cuando OFF.
 * 3. **Re-read snapshot from `task_ftr_snapshots` por `snapshot_id`** — NUNCA
 *    confía el `ftrValue` del payload (defensive re-read, pattern TASK-771).
 * 4. **Idempotency**: si ya escrito (`written_to_notion_at` not null), skip.
 * 5. **PATCH + mark written en misma function**: si PATCH succeed pero UPDATE PG
 *    falla, próximo run reintenta (PATCH mismo select es NOOP semántico).
 * 6. **Counter de attempts**: `notion_writeback_attempt_count++` en cada intento.
 *    >= 4 → reliability signal `ftr_writeback_dead_letter` alerta.
 *
 * **Echo-loop**: el PATCH escribe un select (`[GH] FTR`), NO el status. El
 * webhook que dispara → captura prod re-fetchea STATUS → unchanged → noop. No
 * re-emite `status_transitioned` → no recompute. Sin loop.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-903-ftr-writeback-notion-gh-property.md
 * - RpA sibling: src/lib/sync/projections/notion-rpa-writeback.ts
 * - Notion client: src/lib/space-notion/notion-client.ts (patchNotionPage)
 * - Notion property target: `[GH] FTR` (select Pass/Fail/N/A) en Efeonce/Sky
 */

const NOTION_PROPERTY_FTR = '[GH] FTR'

const PRODUCTIVE_WORKSPACES = new Set(['efeonce', 'sky'])

// Mapping canonical veredicto FTR → opción del select Notion `[GH] FTR`.
const FTR_SELECT_NAME: Record<'pass' | 'fail', string> = {
  pass: 'Pass',
  fail: 'Fail'
}

/**
 * Gate canonical del writeback productivo. Patrón `process.env.X === 'true'`.
 * Override per-cliente `NOTION_FTR_WRITEBACK_ENABLED_<EFEONCE|SKY>` gana sobre el
 * global (stop-gate "Efeonce primero" del ADR Strangler — mirror RpA TASK-919 #4).
 */
export const isNotionFtrWritebackEnabled = (workspaceId?: string): boolean => {
  if (workspaceId) {
    const perClient = process.env[`NOTION_FTR_WRITEBACK_ENABLED_${workspaceId.toUpperCase()}`]

    if (perClient === 'true') {
      return true
    }

    if (perClient === 'false') {
      return false // override explícito por-cliente gana (apagar un solo cliente)
    }
  }

  return process.env.NOTION_FTR_WRITEBACK_ENABLED === 'true'
}

interface WritebackRequestedPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  ftrValue?: 'pass' | 'fail' | null
  ftrDataStatus?: string
  snapshotId?: string
  formulaVersion?: string
  computedAt?: string
  metadata?: {
    demo_mode?: boolean
  }
}

/**
 * Predicate canonical: TRUE si el payload es un writeback productivo.
 * Defense in depth dual. Exported para tests anti-regresión.
 */
export const isProductiveFtrWritebackPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as WritebackRequestedPayload

  if (typed.metadata?.demo_mode === true) {
    return false
  }

  return typeof typed.workspaceId === 'string' && PRODUCTIVE_WORKSPACES.has(typed.workspaceId)
}

type FtrSnapshotRow = {
  snapshot_id: string
  task_source_id: string
  ftr_value: 'pass' | 'fail' | null
  ftr_data_status: string
  written_to_notion_at: Date | string | null
  notion_writeback_attempt_count: number
} & Record<string, unknown>

/**
 * Re-read snapshot from PG (defensive, NUNCA trust payload).
 * Returns null si snapshot no existe (idempotent skip).
 */
const readFtrSnapshotForWriteback = async (snapshotId: string): Promise<FtrSnapshotRow | null> => {
  const rows = await runGreenhousePostgresQuery<FtrSnapshotRow>(
    `SELECT
        snapshot_id,
        task_source_id,
        ftr_value,
        ftr_data_status,
        written_to_notion_at,
        notion_writeback_attempt_count
     FROM greenhouse_delivery.task_ftr_snapshots
     WHERE snapshot_id = $1
     LIMIT 1`,
    [snapshotId]
  )

  return rows[0] ?? null
}

/**
 * UPDATE snapshot post-success: persiste written_to_notion_at + clears error.
 * Append-only triggers exempt para writeback columns (per migration TASK-903 Slice 0).
 */
const markFtrSnapshotWritten = async (
  snapshotId: string,
  notionWritebackEventId: string
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_ftr_snapshots
     SET written_to_notion_at = NOW(),
         notion_writeback_event_id = $2,
         notion_writeback_last_error = NULL,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId, notionWritebackEventId]
  )
}

/**
 * UPDATE snapshot post-failure: persiste last_error + increments attempt_count.
 */
const markFtrSnapshotFailed = async (snapshotId: string, errorMessage: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_ftr_snapshots
     SET notion_writeback_last_error = $2,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId, errorMessage.slice(0, 1000)] // truncate to avoid runaway
  )
}

export const notionFtrWritebackProjection: ProjectionDefinition = {
  name: 'notion_ftr_writeback',
  description:
    'TASK-903 Slice 2 — PATCH Notion property select [GH] FTR (Efeonce/Sky) con el veredicto del snapshot. Idempotente (re-reads PG), retryable (counter + last_error). Gated NOTION_FTR_WRITEBACK_ENABLED (default OFF). Filter dual demo_mode + workspaceId.',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.notionTaskFtrWritebackRequested],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as WritebackRequestedPayload

    if (!isProductiveFtrWritebackPayload(typed)) {
      return null
    }

    const snapshotId = typed.snapshotId?.trim() ?? ''

    if (!snapshotId) {
      return null
    }

    return { entityType: 'ftr_snapshot', entityId: snapshotId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as WritebackRequestedPayload

    if (!isProductiveFtrWritebackPayload(typed)) {
      return null
    }

    const snapshotId = typed.snapshotId?.trim() ?? ''

    if (!snapshotId) {
      return null
    }

    // Defense layer 2: gate flag per-cliente. Skip honest cuando OFF — el snapshot
    // persiste con written_to_notion_at=NULL; al activar, el próximo tick escribe.
    if (!isNotionFtrWritebackEnabled(typed.workspaceId)) {
      return `ftr_writeback:${snapshotId}:skipped:flag_disabled`
    }

    // Defense layer 3: re-read snapshot from PG (NUNCA trust payload value)
    let snapshot: FtrSnapshotRow | null

    try {
      snapshot = await readFtrSnapshotForWriteback(snapshotId)
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'ftr_writeback', stage: 'read_snapshot' },
        extra: { snapshotId }
      })

      throw err
    }

    if (!snapshot) {
      // Snapshot no existe — idempotent skip (borrado en cleanup o snapshotId fake).
      return `ftr_writeback:${snapshotId}:skipped:snapshot_missing`
    }

    // Idempotency: si ya escrito a Notion, skip silente
    if (snapshot.written_to_notion_at !== null) {
      return `ftr_writeback:${snapshotId}:idempotent:already_written`
    }

    // Solo escribimos valid + veredicto pass/fail (defense layer 5)
    if (
      snapshot.ftr_data_status !== 'valid' ||
      (snapshot.ftr_value !== 'pass' && snapshot.ftr_value !== 'fail')
    ) {
      return `ftr_writeback:${snapshotId}:skipped:not_writable`
    }

    const selectName = FTR_SELECT_NAME[snapshot.ftr_value]

    // PATCH Notion select [GH] FTR
    try {
      await patchNotionPage(snapshot.task_source_id, {
        [NOTION_PROPERTY_FTR]: { select: { name: selectName } }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Mark failure first (best effort)
      try {
        await markFtrSnapshotFailed(snapshotId, message)
      } catch (markErr) {
        captureWithDomain(markErr, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'ftr_writeback', stage: 'mark_failed' },
          extra: { snapshotId, originalError: message }
        })
      }

      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'ftr_writeback', stage: 'patch_notion' },
        extra: {
          snapshotId,
          taskSourceId: snapshot.task_source_id,
          ftrValue: snapshot.ftr_value,
          status: (err as Error & { status?: number }).status
        }
      })

      throw err // Re-throw para retry exponencial canonical reactive consumer
    }

    // Success: mark written
    try {
      await markFtrSnapshotWritten(snapshotId, `notion-patch-${Date.now()}`)
    } catch (err) {
      // PATCH succeed pero UPDATE PG falló. Idempotent on retry — PATCH same select
      // is NOOP. Capturar para observability + throw para retry.
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'ftr_writeback', stage: 'mark_written' },
        extra: { snapshotId }
      })

      throw err
    }

    return `ftr_writeback:${snapshotId}:written:${snapshot.ftr_value}`
  },
  maxRetries: 4 // 3 retries + initial = 4 attempts total before dead-letter
}

// Export for tests
export const __testing__ = {
  isProductiveFtrWritebackPayload,
  isNotionFtrWritebackEnabled,
  readFtrSnapshotForWriteback,
  markFtrSnapshotWritten,
  markFtrSnapshotFailed,
  NOTION_PROPERTY_FTR,
  FTR_SELECT_NAME
}
