import 'server-only'

import { materializeTransitionsFromPg } from '@/lib/ico-engine/materialize-task-status-transitions'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-912 Slice 3 — Projection reactiva: `task_status_transitions` (PG) →
 * `greenhouse_conformed.task_status_transitions` (BQ).
 *
 * Consume `notion.task.status_transitioned` (emitido por el capture consumer
 * Slice 2 post-persist) y MERGEa la transición a BQ via re-read de PG (canonical
 * TASK-771 — NUNCA confía el payload del evento como source of truth).
 *
 * **Canonical, sin Cloud Scheduler nuevo**: rides el reactive consumer existente
 * (domain `delivery`, scheduler `ops-reactive-process-delivery`). No-op seguro
 * cuando la captura está apagada (no hay eventos → no corre).
 *
 * **Idempotente**: MERGE ON `transition_id` (PK UUID). Re-runs safe.
 *
 * Failure mode: si el MERGE BQ throw-ea (BQ down, schema drift), el reactive
 * consumer routea a retry (maxRetries=3) → dead-letter. El reliability signal
 * `notion.task_status_transitions.bq_sync_lag` (TASK-912) lo captura.
 */
export const notionTransitionBqSyncProjection: ProjectionDefinition = {
  name: 'notion_transition_bq_sync',
  description:
    'TASK-912 Slice 3 — MERGE task_status_transitions (PG) → greenhouse_conformed.task_status_transitions (BQ) al capturar una transición productiva. Re-read PG por source_event_id (canonical), idempotente por transition_id, no-op si captura apagada.',
  domain: 'delivery',
  triggerEvents: ['notion.task.status_transitioned'],
  extractScope: (payload: Record<string, unknown>) => {
    const sourceEventId = typeof payload.sourceEventId === 'string' ? payload.sourceEventId.trim() : ''

    if (!sourceEventId) {
      return null
    }

    const taskSourceId = typeof payload.taskSourceId === 'string' ? payload.taskSourceId.trim() : ''

    return { entityType: 'notion_task', entityId: taskSourceId || sourceEventId }
  },
  refresh: async (_scope, payload) => {
    const sourceEventId = typeof payload.sourceEventId === 'string' ? payload.sourceEventId.trim() : ''

    if (!sourceEventId) {
      return null
    }

    try {
      const { merged } = await materializeTransitionsFromPg({ sourceEventIds: [sourceEventId] })

      return `notion_transition_bq_sync: merged ${merged} row(s) for source_event_id=${sourceEventId}`
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'notion_transition_bq_sync', stage: 'bq_merge' },
        extra: { sourceEventId }
      })

      throw err // retry exponencial canonical
    }
  },
  maxRetries: 3
}
