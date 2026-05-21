import 'server-only'

import { randomUUID } from 'node:crypto'

import { calculateRpaV2 } from '@/lib/notion-metrics/calculate-rpa-v2'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import { publishOutboxEvent } from '../publish-event'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-916 Slice 3 — Reactive consumer compute PRODUCTIVO (Efeonce + Sky):
 * invoca `calculateRpaV2` post `notion.task.status_transitioned` (emitido por la
 * captura prod TASK-912) + persiste snapshot en `task_rpa_snapshots` + emite
 * chain event `notion.task.metrics_writeback_requested` cuando el snapshot es
 * 'valid'.
 *
 * **Sibling físicamente separado** de `notion-rpa-compute-demo.ts` (TASK-913).
 * Clone + repoint, NO rediseño — la lógica difícil (idempotencia, chain event,
 * degraded honest) ya está peleada en demo:
 *
 * 1. **Trigger `notion.task.status_transitioned`** (NO `transition_captured.demo`,
 *    que solo existe en el carril demo). El productivo lo emite la captura
 *    TASK-912 una vez por transición real, después de persistir en
 *    `task_status_transitions`. No hay race: el compute recomputa desde la tabla
 *    ya commiteada.
 *
 * 2. **Filter prod**: acepta `workspaceId IN ('efeonce','sky')` Y
 *    `metadata.demo_mode !== true`. Defense in depth — robusto incluso si el
 *    carril demo alguna vez emitiera `status_transitioned`.
 *
 * 3. **Compute via `calculateRpaV2`** — lee `task_status_transitions` (NO `_demo`)
 *    vía `countCorrectionTransitions`. NUNCA toca la tabla demo.
 *
 * 4. **Persistencia en `task_rpa_snapshots`** — CHECK `workspace_id IN
 *    ('efeonce','sky')` enforce PG-side. El workspace viene del payload del
 *    evento (ya resuelto autoritativamente por la captura).
 *
 * 5. **Writeback event emit solo cuando `rpaDataStatus='valid'`** + persist real
 *    (no ON CONFLICT skip). Tasks `unavailable` no se escriben — degraded honest.
 *
 * 6. **Chain event pattern** (TASK-771): compute step y writeback step decoupled
 *    via outbox. Independientes failure-wise, retry exponencial per-step.
 *
 * **OJO completeness**: `status_transitioned` se emite por cada transición.
 * `calculateRpaV2` recomputa el total de la tarea desde `task_status_transitions`
 * cada vez → idempotente y siempre refleja el estado completo de la tabla.
 *
 * **Idempotency canonical**: re-runs con mismo `sourceEventId` insertan snapshots
 * distintos (UUID PK fresh) pero ON CONFLICT source_event_id DO NOTHING (UNIQUE
 * partial index). El re-emit del chain event downstream solo ocurre cuando el
 * INSERT efectivamente persistió.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-916-rpa-v2-productive-compute-writeback.md
 * - Demo sibling: src/lib/sync/projections/notion-rpa-compute-demo.ts
 * - Helper compute: src/lib/notion-metrics/calculate-rpa-v2.ts
 * - Tabla snapshot: migration 20260521182825984 (TASK-916 Slice 1)
 * - Upstream capture (emitter): src/lib/sync/projections/notion-status-transition-capture.ts
 * - Downstream writeback (Slice 4): src/lib/sync/projections/notion-rpa-writeback.ts
 */

const PRODUCTIVE_WORKSPACES = new Set(['efeonce', 'sky'])

interface StatusTransitionedPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  fromStatus?: string
  toStatus?: string
  transitionedAt?: string
  transitionedBy?: string | null
  sourceEventId?: string
  metadata?: {
    demo_mode?: boolean
  }
}

/**
 * Predicate canonical: TRUE si el payload es un evento productivo computable.
 * Defense in depth dual: NO demo_mode (anti-coersion strict) Y workspace
 * productivo (efeonce/sky). Exported para tests anti-regresión.
 */
export const isProductiveComputePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as StatusTransitionedPayload

  if (typed.metadata?.demo_mode === true) {
    return false
  }

  return typeof typed.workspaceId === 'string' && PRODUCTIVE_WORKSPACES.has(typed.workspaceId)
}

interface PersistSnapshotInput {
  snapshotId: string
  taskSourceId: string
  workspaceId: string
  rpaValue: number | null
  rpaDataStatus: 'valid' | 'unavailable' | 'low_confidence' | 'suppressed'
  sourceMode: 'canonical' | 'unavailable'
  correctionTransitionsCount: number
  formulaVersion: string
  sourceEventId: string
}

/**
 * Persiste row en `task_rpa_snapshots`. Idempotent vía UNIQUE partial index
 * sobre `source_event_id` (excluding NULL). Re-runs con mismo sourceEventId → NOOP.
 *
 * CHECK constraint `workspace_id IN ('efeonce','sky')` PG-side rechaza INSERT con
 * workspace inválido (defense in depth canonical).
 */
const persistRpaSnapshot = async (input: PersistSnapshotInput): Promise<boolean> => {
  const result = await runGreenhousePostgresQuery<{ snapshot_id: string }>(
    `INSERT INTO greenhouse_delivery.task_rpa_snapshots (
       snapshot_id, task_source_id, workspace_id,
       rpa_value, rpa_data_status, source_mode,
       correction_transitions_count, formula_version,
       source_event_id, source_event_received_at,
       computed_at, created_at
     )
     VALUES (
       $1, $2, $3,
       $4, $5, $6,
       $7, $8,
       $9, NOW(),
       NOW(), NOW()
     )
     ON CONFLICT (source_event_id)
       WHERE source_event_id IS NOT NULL
       DO NOTHING
     RETURNING snapshot_id`,
    [
      input.snapshotId,
      input.taskSourceId,
      input.workspaceId,
      input.rpaValue,
      input.rpaDataStatus,
      input.sourceMode,
      input.correctionTransitionsCount,
      input.formulaVersion,
      input.sourceEventId
    ]
  )

  // Si returning está vacío, ON CONFLICT DO NOTHING disparó (idempotent skip).
  return result.length > 0
}

export const notionRpaComputeProjection: ProjectionDefinition = {
  name: 'notion_rpa_compute',
  description:
    'TASK-916 Slice 3 — Compute RpA V2 PRODUCTIVO via calculateRpaV2 post notion.task.status_transitioned (captura TASK-912), persiste snapshot en task_rpa_snapshots, emite chain event metrics_writeback_requested cuando valid. Filter dual: demo_mode !== true + workspaceId IN (efeonce,sky).',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.notionTaskStatusTransitioned],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as StatusTransitionedPayload

    if (!isProductiveComputePayload(typed)) {
      return null // skip — demo event o workspace no productivo
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''

    if (!taskSourceId) {
      return null
    }

    return { entityType: 'notion_task', entityId: taskSourceId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as StatusTransitionedPayload

    // Redundant safety: extractScope already filtered, but defense in depth.
    if (!isProductiveComputePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''
    const workspaceId = typed.workspaceId as string

    if (!taskSourceId || !sourceEventId) {
      captureWithDomain(
        new Error('RpA compute productive payload missing required fields'),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'rpa_compute', stage: 'refresh' },
          extra: { taskSourceId, sourceEventId }
        }
      )

      return null
    }

    let rpaResult: Awaited<ReturnType<typeof calculateRpaV2>>

    try {
      rpaResult = await calculateRpaV2({ taskSourceId })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'rpa_compute', stage: 'calculate_rpa_v2' },
        extra: { taskSourceId, sourceEventId }
      })

      throw err // Re-throw para retry exponencial canonical
    }

    const snapshotId = randomUUID()
    let inserted = false

    try {
      inserted = await persistRpaSnapshot({
        snapshotId,
        taskSourceId,
        workspaceId,
        rpaValue: rpaResult.value,
        rpaDataStatus: rpaResult.dataStatus,
        sourceMode: rpaResult.sourceMode,
        correctionTransitionsCount: rpaResult.inputsUsed.correctionTransitionsCount,
        formulaVersion: rpaResult.formulaVersion,
        sourceEventId
      })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'rpa_compute', stage: 'persist_snapshot' },
        extra: {
          taskSourceId,
          sourceEventId,
          rpaValue: rpaResult.value,
          rpaDataStatus: rpaResult.dataStatus
        }
      })

      throw err
    }

    // Chain event canonical: emit writeback request SOLO cuando snapshot
    // efectivamente persistido (no ON CONFLICT skip) Y rpaDataStatus='valid'.
    // - Skipped (ON CONFLICT): writeback ya solicitado en run previo, no re-emitir.
    // - dataStatus='unavailable': nada que escribir a Notion (degraded honest).
    const shouldEmitWriteback = inserted && rpaResult.dataStatus === 'valid' && rpaResult.value !== null

    if (shouldEmitWriteback) {
      try {
        await publishOutboxEvent({
          aggregateType: 'notion_task',
          aggregateId: taskSourceId,
          eventType: EVENT_TYPES.notionTaskMetricsWritebackRequested,
          payload: {
            schemaVersion: 1,
            taskSourceId,
            workspaceId,
            rpaValue: rpaResult.value,
            rpaDataStatus: rpaResult.dataStatus,
            snapshotId,
            formulaVersion: rpaResult.formulaVersion,
            computedAt: new Date().toISOString()
          }
        })
      } catch (err) {
        // Chain event emit failure es non-blocking: el snapshot está persistido.
        // El reliability signal `writeback_lag` detecta snapshots con
        // `written_to_notion_at IS NULL` overdue (TASK-917 nightly safety net
        // re-trigger pendiente). El snapshot persistido sigue siendo source of
        // truth para la materialización agregada.
        captureWithDomain(err, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'rpa_compute', stage: 'chain_event_emit' },
          extra: { taskSourceId, snapshotId, sourceEventId }
        })
      }
    }

    return `task_rpa_snapshots:${workspaceId}:${taskSourceId}:${sourceEventId}:${rpaResult.dataStatus}${inserted ? '' : ':idempotent'}`
  }
}

// Export for tests
export const __testing__ = {
  isProductiveComputePayload,
  persistRpaSnapshot
}
