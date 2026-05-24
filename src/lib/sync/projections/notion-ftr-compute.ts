import 'server-only'

import { randomUUID } from 'node:crypto'

import { calculateFtr } from '@/lib/notion-metrics/calculate-ftr'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import { publishOutboxEvent } from '../publish-event'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-903 Slice 1 — Reactive consumer compute FTR PRODUCTIVO (Efeonce + Sky):
 * invoca `calculateFtr` post `notion.task.status_transitioned` (emitido por la
 * captura prod TASK-912) + persiste snapshot en `task_ftr_snapshots` + emite
 * chain event `notion.task.ftr_writeback_requested` cuando el snapshot es
 * 'valid' con veredicto pass/fail.
 *
 * **Sibling físicamente separado** de `notion-rpa-compute.ts` (TASK-916).
 * Clone + repoint, NO rediseño — la lógica difícil (idempotencia, chain event,
 * degraded honest) ya está peleada en RpA. FTR es derivada pura de RpA
 * (FTR pass cuando RpA es 0, fail en otro caso); el compute delega a `calculateFtr`
 * (que delega a `calculateRpaV2` → `countCorrectionTransitions`). NUNCA recomputa
 * el veredicto inline (lint rule `greenhouse/no-inline-ftr-calculation`).
 *
 * 1. **Trigger `notion.task.status_transitioned`** (mismo que RpA — el productivo
 *    lo emite la captura TASK-912 una vez por transición real). No hay race: el
 *    compute recomputa desde `task_status_transitions` ya commiteada.
 *
 * 2. **Filter prod dual**: `workspaceId IN ('efeonce','sky')` Y
 *    `metadata.demo_mode !== true`. Defense in depth (FTR no tiene carril demo —
 *    el filtro es robusto igual).
 *
 * 3. **Compute via `calculateFtr`** — sin lógica propia. NUNCA toca tablas demo.
 *
 * 4. **Persistencia en `task_ftr_snapshots`** — CHECK `workspace_id IN
 *    ('efeonce','sky')` enforce PG-side. Guarda el veredicto FTR + el RpA
 *    subyacente (forensic full reproducibility).
 *
 * 5. **Writeback event emit solo cuando `ftr_data_status='valid'` + veredicto
 *    pass/fail** + persist real (no ON CONFLICT skip). `unavailable`/`low_confidence`
 *    no se escriben — degraded honest (mirror RpA `valid` only).
 *
 * 6. **Chain event pattern** (TASK-771): compute y writeback decoupled via outbox.
 *
 * **Idempotency canonical**: ON CONFLICT source_event_id DO NOTHING (UNIQUE
 * partial index). El re-emit del chain event solo ocurre cuando el INSERT persistió.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-903-ftr-writeback-notion-gh-property.md
 * - RpA sibling: src/lib/sync/projections/notion-rpa-compute.ts
 * - Helper compute: src/lib/notion-metrics/calculate-ftr.ts (TASK-909)
 * - Tabla snapshot: migration 20260524200315533 (TASK-903 Slice 0)
 * - Downstream writeback (Slice 2): src/lib/sync/projections/notion-ftr-writeback.ts
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
export const isProductiveFtrComputePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as StatusTransitionedPayload

  if (typed.metadata?.demo_mode === true) {
    return false
  }

  return typeof typed.workspaceId === 'string' && PRODUCTIVE_WORKSPACES.has(typed.workspaceId)
}

interface PersistFtrSnapshotInput {
  snapshotId: string
  taskSourceId: string
  workspaceId: string
  ftrValue: 'pass' | 'fail' | null
  ftrDataStatus: 'valid' | 'unavailable' | 'low_confidence'
  rpaValue: number | null
  rpaDataStatus: 'valid' | 'unavailable' | 'low_confidence' | 'suppressed'
  sourceMode: 'canonical' | 'unavailable'
  formulaVersion: string
  sourceEventId: string
}

/**
 * Persiste row en `task_ftr_snapshots`. Idempotent vía UNIQUE partial index
 * sobre `source_event_id` (excluding NULL). Re-runs con mismo sourceEventId → NOOP.
 *
 * CHECK constraint `workspace_id IN ('efeonce','sky')` PG-side rechaza INSERT con
 * workspace inválido (defense in depth canonical).
 */
const persistFtrSnapshot = async (input: PersistFtrSnapshotInput): Promise<boolean> => {
  const result = await runGreenhousePostgresQuery<{ snapshot_id: string }>(
    `INSERT INTO greenhouse_delivery.task_ftr_snapshots (
       snapshot_id, task_source_id, workspace_id,
       ftr_value, ftr_data_status,
       rpa_value, rpa_data_status, source_mode,
       formula_version,
       source_event_id, source_event_received_at,
       computed_at, created_at
     )
     VALUES (
       $1, $2, $3,
       $4, $5,
       $6, $7, $8,
       $9,
       $10, NOW(),
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
      input.ftrValue,
      input.ftrDataStatus,
      input.rpaValue,
      input.rpaDataStatus,
      input.sourceMode,
      input.formulaVersion,
      input.sourceEventId
    ]
  )

  // Si returning está vacío, ON CONFLICT DO NOTHING disparó (idempotent skip).
  return result.length > 0
}

export const notionFtrComputeProjection: ProjectionDefinition = {
  name: 'notion_ftr_compute',
  description:
    'TASK-903 Slice 1 — Compute FTR PRODUCTIVO via calculateFtr post notion.task.status_transitioned (captura TASK-912), persiste snapshot en task_ftr_snapshots, emite chain event ftr_writeback_requested cuando valid + pass/fail. Filter dual: demo_mode !== true + workspaceId IN (efeonce,sky).',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.notionTaskStatusTransitioned],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as StatusTransitionedPayload

    if (!isProductiveFtrComputePayload(typed)) {
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
    if (!isProductiveFtrComputePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''
    const workspaceId = typed.workspaceId as string

    if (!taskSourceId || !sourceEventId) {
      captureWithDomain(
        new Error('FTR compute productive payload missing required fields'),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'ftr_compute', stage: 'refresh' },
          extra: { taskSourceId, sourceEventId }
        }
      )

      return null
    }

    let ftrResult: Awaited<ReturnType<typeof calculateFtr>>

    try {
      ftrResult = await calculateFtr({ taskSourceId })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'ftr_compute', stage: 'calculate_ftr' },
        extra: { taskSourceId, sourceEventId }
      })

      throw err // Re-throw para retry exponencial canonical
    }

    // El veredicto writable es pass/fail; cualquier otro (null/not_applicable) → null.
    const ftrValue =
      ftrResult.value === 'pass' || ftrResult.value === 'fail' ? ftrResult.value : null

    const snapshotId = randomUUID()
    let inserted = false

    try {
      inserted = await persistFtrSnapshot({
        snapshotId,
        taskSourceId,
        workspaceId,
        ftrValue,
        ftrDataStatus: ftrResult.dataStatus,
        rpaValue: ftrResult.rpaSnapshot.value,
        rpaDataStatus: ftrResult.rpaSnapshot.dataStatus,
        sourceMode: ftrResult.sourceMode,
        formulaVersion: ftrResult.formulaVersion,
        sourceEventId
      })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'ftr_compute', stage: 'persist_snapshot' },
        extra: {
          taskSourceId,
          sourceEventId,
          ftrValue,
          ftrDataStatus: ftrResult.dataStatus
        }
      })

      throw err
    }

    // Chain event canonical: emit writeback request SOLO cuando snapshot
    // efectivamente persistido (no ON CONFLICT skip) Y ftr_data_status='valid'
    // con veredicto pass/fail. low_confidence/unavailable no se escriben (degraded
    // honest, mirror RpA `valid` only).
    const shouldEmitWriteback = inserted && ftrResult.dataStatus === 'valid' && ftrValue !== null

    if (shouldEmitWriteback) {
      try {
        await publishOutboxEvent({
          aggregateType: 'notion_task',
          aggregateId: taskSourceId,
          eventType: EVENT_TYPES.notionTaskFtrWritebackRequested,
          payload: {
            schemaVersion: 1,
            taskSourceId,
            workspaceId,
            ftrValue,
            ftrDataStatus: ftrResult.dataStatus,
            snapshotId,
            formulaVersion: ftrResult.formulaVersion,
            computedAt: new Date().toISOString()
          }
        })
      } catch (err) {
        // Chain event emit failure es non-blocking: el snapshot está persistido.
        // El reliability signal `ftr_writeback_lag` detecta snapshots con
        // `written_to_notion_at IS NULL` overdue. El snapshot persistido sigue
        // siendo source of truth.
        captureWithDomain(err, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'ftr_compute', stage: 'chain_event_emit' },
          extra: { taskSourceId, snapshotId, sourceEventId }
        })
      }
    }

    return `task_ftr_snapshots:${workspaceId}:${taskSourceId}:${sourceEventId}:${ftrResult.dataStatus}${inserted ? '' : ':idempotent'}`
  }
}

// Export for tests
export const __testing__ = {
  isProductiveFtrComputePayload,
  persistFtrSnapshot
}
