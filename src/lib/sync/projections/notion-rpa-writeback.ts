import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { patchNotionPage } from '@/lib/space-notion/notion-client'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-916 Slice 4 — Reactive consumer writeback PRODUCTIVO (Efeonce + Sky):
 * PATCH la propiedad Notion `[GH] RpA v2` con el valor del snapshot.
 * Idempotente, retryable, observable. Gated por `NOTION_RPA_WRITEBACK_ENABLED`
 * (default OFF — no escribe hasta TASK-917 Flip A).
 *
 * **Sibling físicamente separado** de `notion-rpa-writeback-demo.ts` (TASK-913).
 * Clone + repoint, NO rediseño:
 *
 * - Property `[GH] RpA v2` (NO `RpA` como el demo) porque en productivo coexiste
 *   con la fórmula legacy `RpA` (carril paralelo Strangler — V1 legacy intacto).
 *   ⚠️ La propiedad debe existir en Efeonce/Sky antes del flip — precondición de
 *   TASK-917 Flip A (writeback OFF en este task, no escribe).
 * - Token productivo `NOTION_TOKEN` vía `patchNotionPage` (resuelto dentro del
 *   helper). NO el token demo separado.
 * - Gate: flag `NOTION_RPA_WRITEBACK_ENABLED === 'true'` (default false → skip
 *   honest). Mismo patrón canonical `process.env.X === 'true'` (sin coersion).
 * - Tabla `task_rpa_snapshots` (NO `_demo`), sin filtro `workspace_id='demo'`.
 *
 * **Defense in depth canonical (TASK-742 7-layer)**:
 *
 * 1. **Filter prod**: skip si `metadata.demo_mode === true` o `workspaceId` no es
 *    productivo. El writeback demo maneja el carril demo en sibling separado.
 * 2. **Gate flag** `NOTION_RPA_WRITEBACK_ENABLED`: skip honest cuando OFF.
 * 3. **Re-read snapshot from `task_rpa_snapshots` por `snapshot_id`** — NUNCA
 *    confía el `rpaValue` del payload (defensive re-read, pattern TASK-771).
 * 4. **Idempotency**: si ya escrito (`written_to_notion_at` not null), skip.
 * 5. **PATCH + mark written en misma function**: si PATCH succeed pero UPDATE PG
 *    falla, próximo run reintenta (PATCH mismo valor es NOOP semántico).
 * 6. **Counter de attempts**: `notion_writeback_attempt_count++` en cada intento.
 *    >= 4 → reliability signal `writeback_dead_letter` alerta.
 *
 * **Echo-loop**: el PATCH escribe un number (`[GH] RpA v2`), NO el status. El
 * webhook que dispara → captura prod re-fetchea STATUS → unchanged → noop. No
 * re-emite `status_transitioned` → no recompute. Sin loop.
 *
 * **Throttling rationale (V1)**: low volume → reactive consumer fires every 5
 * min via Cloud Scheduler ops-reactive-process. Notion rate limit ~3 req/sec.
 * Si el volumen crece (Sky/Efeonce full + cliente) → migrar a Cloud Tasks queue.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-916-rpa-v2-productive-compute-writeback.md
 * - Demo sibling: src/lib/sync/projections/notion-rpa-writeback-demo.ts
 * - Notion client: src/lib/space-notion/notion-client.ts (patchNotionPage)
 * - Notion property target: `[GH] RpA v2` (number) en Efeonce/Sky
 */

const NOTION_PROPERTY_RPA_V2 = '[GH] RpA v2'

const PRODUCTIVE_WORKSPACES = new Set(['efeonce', 'sky'])

/**
 * Gate canonical del writeback productivo. Patrón `process.env.X === 'true'`
 * (sin drift, sin coersion).
 *
 * **Per-cliente (TASK-919 #4, stop-gate canonical ICO)**: si se pasa
 * `workspaceId`, un override explícito por-cliente
 * `NOTION_RPA_WRITEBACK_ENABLED_<EFEONCE|SKY>` gana sobre el global (permite
 * habilitar/deshabilitar un cliente independientemente — requerido por el
 * stop-gate "Efeonce primero" del ADR Strangler). Si el per-cliente NO está
 * seteado, cae al global `NOTION_RPA_WRITEBACK_ENABLED`. Backward-compat: sin
 * `workspaceId` o sin per-cliente → comportamiento global idéntico al previo.
 */
export const isNotionRpaWritebackEnabled = (workspaceId?: string): boolean => {
  if (workspaceId) {
    const perClient = process.env[`NOTION_RPA_WRITEBACK_ENABLED_${workspaceId.toUpperCase()}`]

    if (perClient === 'true') {
      return true
    }

    if (perClient === 'false') {
      return false // override explícito por-cliente gana (apagar un solo cliente)
    }
  }

  return process.env.NOTION_RPA_WRITEBACK_ENABLED === 'true'
}

interface WritebackRequestedPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  rpaValue?: number | null
  rpaDataStatus?: string
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
export const isProductiveWritebackPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as WritebackRequestedPayload

  if (typed.metadata?.demo_mode === true) {
    return false
  }

  return typeof typed.workspaceId === 'string' && PRODUCTIVE_WORKSPACES.has(typed.workspaceId)
}

type SnapshotRow = {
  snapshot_id: string
  task_source_id: string
  rpa_value: number | null
  rpa_data_status: string
  written_to_notion_at: Date | string | null
  notion_writeback_attempt_count: number
} & Record<string, unknown>

/**
 * Re-read snapshot from PG (defensive, NUNCA trust payload).
 * Returns null si snapshot no existe (idempotent skip).
 */
const readSnapshotForWriteback = async (snapshotId: string): Promise<SnapshotRow | null> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT
        snapshot_id,
        task_source_id,
        rpa_value,
        rpa_data_status,
        written_to_notion_at,
        notion_writeback_attempt_count
     FROM greenhouse_delivery.task_rpa_snapshots
     WHERE snapshot_id = $1
     LIMIT 1`,
    [snapshotId]
  )

  return rows[0] ?? null
}

/**
 * UPDATE snapshot post-success: persiste written_to_notion_at + clears error.
 * Append-only triggers exempt para writeback columns (per migration TASK-916 Slice 1).
 */
const markSnapshotWritten = async (
  snapshotId: string,
  notionWritebackEventId: string
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_rpa_snapshots
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
const markSnapshotFailed = async (snapshotId: string, errorMessage: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_rpa_snapshots
     SET notion_writeback_last_error = $2,
         notion_writeback_attempt_count = notion_writeback_attempt_count + 1
     WHERE snapshot_id = $1`,
    [snapshotId, errorMessage.slice(0, 1000)] // truncate to avoid runaway
  )
}

export const notionRpaWritebackProjection: ProjectionDefinition = {
  name: 'notion_rpa_writeback',
  description:
    'TASK-916 Slice 4 — PATCH Notion property [GH] RpA v2 (Efeonce/Sky) con el valor del snapshot. Idempotente (re-reads PG), retryable (counter + last_error). Gated NOTION_RPA_WRITEBACK_ENABLED (default OFF). Filter dual demo_mode + workspaceId.',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.notionTaskMetricsWritebackRequested],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as WritebackRequestedPayload

    if (!isProductiveWritebackPayload(typed)) {
      return null
    }

    const snapshotId = typed.snapshotId?.trim() ?? ''

    if (!snapshotId) {
      return null
    }

    return { entityType: 'rpa_snapshot', entityId: snapshotId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as WritebackRequestedPayload

    if (!isProductiveWritebackPayload(typed)) {
      return null
    }

    const snapshotId = typed.snapshotId?.trim() ?? ''

    if (!snapshotId) {
      return null
    }

    // Defense layer 2: gate flag per-cliente (TASK-919 #4). El override
    // NOTION_RPA_WRITEBACK_ENABLED_<workspace> gana sobre el global; permite
    // apagar un cliente sin tocar al otro. Skip honest cuando OFF — el snapshot
    // persiste con written_to_notion_at=NULL; al activar, el próximo tick escribe.
    if (!isNotionRpaWritebackEnabled(typed.workspaceId)) {
      return `rpa_writeback:${snapshotId}:skipped:flag_disabled`
    }

    // Defense layer 3: re-read snapshot from PG (NUNCA trust payload value)
    let snapshot: SnapshotRow | null

    try {
      snapshot = await readSnapshotForWriteback(snapshotId)
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'rpa_writeback', stage: 'read_snapshot' },
        extra: { snapshotId }
      })

      throw err
    }

    if (!snapshot) {
      // Snapshot no existe — idempotent skip (borrado en cleanup o snapshotId fake).
      return `rpa_writeback:${snapshotId}:skipped:snapshot_missing`
    }

    // Idempotency: si ya escrito a Notion, skip silente
    if (snapshot.written_to_notion_at !== null) {
      return `rpa_writeback:${snapshotId}:idempotent:already_written`
    }

    // Solo escribimos valid + value numérico (defense layer 5)
    if (snapshot.rpa_data_status !== 'valid' || snapshot.rpa_value === null) {
      return `rpa_writeback:${snapshotId}:skipped:not_writable`
    }

    // PATCH Notion
    try {
      await patchNotionPage(snapshot.task_source_id, {
        [NOTION_PROPERTY_RPA_V2]: { number: snapshot.rpa_value }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Mark failure first (best effort)
      try {
        await markSnapshotFailed(snapshotId, message)
      } catch (markErr) {
        captureWithDomain(markErr, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'rpa_writeback', stage: 'mark_failed' },
          extra: { snapshotId, originalError: message }
        })
      }

      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'rpa_writeback', stage: 'patch_notion' },
        extra: {
          snapshotId,
          taskSourceId: snapshot.task_source_id,
          rpaValue: snapshot.rpa_value,
          status: (err as Error & { status?: number }).status
        }
      })

      throw err // Re-throw para retry exponencial canonical reactive consumer
    }

    // Success: mark written
    try {
      await markSnapshotWritten(snapshotId, `notion-patch-${Date.now()}`)
    } catch (err) {
      // PATCH succeed pero UPDATE PG falló. Idempotent on retry — PATCH same value
      // is NOOP. Capturar para observability + throw para retry.
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'rpa_writeback', stage: 'mark_written' },
        extra: { snapshotId }
      })

      throw err
    }

    return `rpa_writeback:${snapshotId}:written:${snapshot.rpa_value}`
  },
  maxRetries: 4 // 3 retries + initial = 4 attempts total before dead-letter
}

// Export for tests
export const __testing__ = {
  isProductiveWritebackPayload,
  isNotionRpaWritebackEnabled,
  readSnapshotForWriteback,
  markSnapshotWritten,
  markSnapshotFailed,
  NOTION_PROPERTY_RPA_V2
}
