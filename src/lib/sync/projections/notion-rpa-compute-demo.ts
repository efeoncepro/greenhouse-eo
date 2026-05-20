import 'server-only'

import { randomUUID } from 'node:crypto'

import { calculateRpaV2Demo } from '@/lib/notion-metrics/calculate-rpa-v2-demo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import { publishOutboxEvent } from '../publish-event'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-913 Slice 1 — Reactive consumer compute demo: invoca `calculateRpaV2Demo`
 * post-transition captured + persiste snapshot en `task_rpa_demo_snapshots`
 * + emite chain event `notion.task.metrics_writeback_requested.demo` cuando
 * el snapshot es 'valid'.
 *
 * **Defense in depth canonical (TASK-910 demo isolation invariants)**:
 *
 * 1. **Filter strict `payload.metadata.demo_mode === true`** (anti-coersion).
 *    Productive events (sin demo_mode flag) ignorados — el consumer productivo
 *    TASK-901 Slice 4 (futuro) los maneja en path separado.
 *
 * 2. **Filter strict `payload.workspaceId === 'demo'`**. Doble check upstream
 *    invariant violation.
 *
 * 3. **Compute via `calculateRpaV2Demo`** — lee SOLO tabla
 *    `task_status_transitions_demo` via foundation helper demo. NUNCA toca
 *    productive table.
 *
 * 4. **Persistencia en `task_rpa_demo_snapshots`** — CHECK constraint
 *    `workspace_id='demo'` PG-side enforce.
 *
 * 5. **Writeback event emit solo cuando `rpaDataStatus='valid'`** (worth
 *    writing back). Tasks `unavailable` no se escriben a Notion — degraded
 *    honest canonical.
 *
 * 6. **Chain event pattern** (TASK-771): compute step y writeback step
 *    decoupled via outbox. Independientes failure-wise, idempotency keys
 *    distintos, retry exponencial per-step.
 *
 * **Idempotency canonical**: re-runs con mismo `sourceEventId` insertan
 * snapshots distintos (UUID PK fresh per invocation) pero ON CONFLICT
 * source_event_id DO NOTHING (UNIQUE partial index). Re-emit del chain event
 * downstream depende de si el writeback ya consumió el snapshot previo.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-913-rpa-v2-demo-pipeline-end-to-end.md
 * - Foundation helper: src/lib/notion-metrics/calculate-rpa-v2-demo.ts
 * - Tabla snapshot: migration 20260519130951001 (TASK-913 Slice 1)
 * - Upstream capture (chain emitter): src/lib/sync/projections/notion-status-transition-capture-demo.ts
 * - Downstream writeback (Slice 2): src/lib/sync/projections/notion-rpa-writeback-demo.ts
 */

interface TransitionCapturedDemoPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  fromStatus?: string
  toStatus?: string
  transitionedAt?: string
  sourceEventId?: string
  metadata?: {
    demo_mode?: boolean
  }
}

export const isDemoComputePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as TransitionCapturedDemoPayload

  return typed.metadata?.demo_mode === true && typed.workspaceId === 'demo'
}

interface PersistSnapshotInput {
  snapshotId: string
  taskSourceId: string
  rpaValue: number | null
  rpaDataStatus: 'valid' | 'unavailable' | 'low_confidence' | 'suppressed'
  sourceMode: 'canonical' | 'unavailable'
  correctionTransitionsCount: number
  formulaVersion: string
  sourceEventId: string
}

/**
 * Persiste row en `task_rpa_demo_snapshots`. Idempotent vía UNIQUE partial
 * index sobre `source_event_id` (excluding NULL). Re-runs con mismo
 * sourceEventId resultan en NOOP.
 *
 * CHECK constraint `workspace_id='demo'` PG-side rechaza INSERT con
 * workspace distinto (defense in depth canonical).
 */
const persistRpaDemoSnapshot = async (input: PersistSnapshotInput): Promise<boolean> => {
  const result = await runGreenhousePostgresQuery<{ snapshot_id: string }>(
    `INSERT INTO greenhouse_delivery.task_rpa_demo_snapshots (
       snapshot_id, task_source_id, workspace_id,
       rpa_value, rpa_data_status, source_mode,
       correction_transitions_count, formula_version,
       source_event_id, source_event_received_at,
       computed_at, created_at
     )
     VALUES (
       $1, $2, 'demo',
       $3, $4, $5,
       $6, $7,
       $8, NOW(),
       NOW(), NOW()
     )
     ON CONFLICT (source_event_id)
       WHERE source_event_id IS NOT NULL
       DO NOTHING
     RETURNING snapshot_id`,
    [
      input.snapshotId,
      input.taskSourceId,
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

export const notionRpaComputeDemoProjection: ProjectionDefinition = {
  name: 'notion_rpa_compute_demo',
  description:
    'TASK-913 Slice 1 — Compute RpA V2 via calculateRpaV2Demo post-transition captured, persiste snapshot en task_rpa_demo_snapshots, emite chain event writeback_requested.demo cuando valid. Defense in depth dual: filter demo_mode === true + workspaceId === "demo" + CHECK PG-side.',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.notionTaskTransitionCapturedDemo],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as TransitionCapturedDemoPayload

    if (!isDemoComputePayload(typed)) {
      return null // skip — productive event o invariant violation
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''

    if (!taskSourceId) {
      return null
    }

    return { entityType: 'notion_task', entityId: taskSourceId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as TransitionCapturedDemoPayload

    // Redundant safety: extractScope already filtered, but defense in depth.
    if (!isDemoComputePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''

    if (!taskSourceId || !sourceEventId) {
      captureWithDomain(
        new Error('RpA compute demo payload missing required fields'),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'demo_rpa_compute', stage: 'refresh' },
          extra: { taskSourceId, sourceEventId }
        }
      )

      return null
    }

    let rpaResult: Awaited<ReturnType<typeof calculateRpaV2Demo>>

    try {
      rpaResult = await calculateRpaV2Demo({ taskSourceId })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'demo_rpa_compute', stage: 'calculate_rpa_v2_demo' },
        extra: { taskSourceId, sourceEventId }
      })

      throw err // Re-throw para retry exponencial canonical
    }

    const snapshotId = randomUUID()
    let inserted = false

    try {
      inserted = await persistRpaDemoSnapshot({
        snapshotId,
        taskSourceId,
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
        tags: { source: 'demo_rpa_compute', stage: 'persist_snapshot' },
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
    // - Skipped (ON CONFLICT): writeback ya solicitado en run previo, no
    //   re-emitir (idempotency canonical downstream también enforce).
    // - dataStatus='unavailable': nada que escribir a Notion (degraded honest).
    const shouldEmitWriteback = inserted && rpaResult.dataStatus === 'valid' && rpaResult.value !== null

    if (shouldEmitWriteback) {
      try {
        await publishOutboxEvent({
          aggregateType: 'notion_task',
          aggregateId: taskSourceId,
          eventType: EVENT_TYPES.notionTaskMetricsWritebackRequestedDemo,
          payload: {
            schemaVersion: 1,
            taskSourceId,
            workspaceId: 'demo',
            rpaValue: rpaResult.value,
            rpaDataStatus: rpaResult.dataStatus,
            snapshotId,
            formulaVersion: rpaResult.formulaVersion,
            computedAt: new Date().toISOString(),
            metadata: { demo_mode: true }
          }
        })
      } catch (err) {
        // Chain event emit failure es non-blocking: el snapshot está
        // persistido. Nightly safety net (Slice 3) detecta snapshots con
        // `written_to_notion_at IS NULL` overdue y re-trigger writeback.
        captureWithDomain(err, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'demo_rpa_compute', stage: 'chain_event_emit' },
          extra: { taskSourceId, snapshotId, sourceEventId }
        })
      }
    }

    return `task_rpa_demo_snapshots:${taskSourceId}:${sourceEventId}:${rpaResult.dataStatus}${inserted ? '' : ':idempotent'}`
  }
}

// Export for tests
export const __testing__ = {
  isDemoComputePayload,
  persistRpaDemoSnapshot
}
