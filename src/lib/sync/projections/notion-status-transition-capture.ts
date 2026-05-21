import 'server-only'

import { normalizeTaskStatus } from '@/lib/delivery/task-status-canonical'
import { resolveProductiveWorkspace } from '@/lib/notion-metrics/notion-productive-workspaces'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { fetchPageStatus } from '@/lib/space-notion/notion-client'

import { EVENT_TYPES } from '../event-catalog'
import { publishOutboxEvent } from '../publish-event'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-912 — Reactive consumer PRODUCTIVO (Efeonce + Sky) que persiste status
 * transitions en `greenhouse_delivery.task_status_transitions` (tabla TASK-908).
 *
 * Sibling físicamente separado del consumer demo `notion-status-transition-
 * capture-demo.ts` (TASK-910/914). Mismo patrón re-fetch canonical:
 *
 * 1. Trigger `notion.task.page_change_signal` (productivo, sin `.demo`).
 * 2. RE-FETCH la página (source of truth del estado actual + del data source
 *    autoritativo). Notion no manda valores en el webhook (notion-platform
 *    Pillar 1).
 * 3. **Resolución autoritativa de workspace** por `parent.data_source_id` de la
 *    página re-fetcheada → Efeonce/Sky o SKIP. Es la garantía canonical de que
 *    la captura productiva NUNCA persiste tareas del demo ni de otros teamspaces
 *    (la suscripción es amplia). NO confía el `parent.id` del webhook.
 * 4. Derive `from` de la última transición registrada en PG.
 * 5. Persist-if-changed en `task_status_transitions` con `workspace_id` resuelto.
 * 6. Emit `notion.task.status_transitioned` (canonical, con from/to) para que
 *    downstream (RpA TASK-916, FTR, Cycle Time) lo consuma.
 *
 * **No-interferencia (TASK-912 invariantes)**:
 * - Defense in depth: skip si `metadata.demo_mode === true` (no debería pasar en
 *   el payload productivo, pero blinda contra cross-emit).
 * - Workspace null → skip (no persist, no más llamadas Notion).
 * - CERO escrituras a Notion (solo GET re-fetch read-only).
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-912-ico-status-transition-webhook-ingestion-and-bq-formula.md
 * - Demo sibling: src/lib/sync/projections/notion-status-transition-capture-demo.ts
 * - Tabla: greenhouse_delivery.task_status_transitions (TASK-908 foundation)
 * - Webhook handler (emisor): src/lib/webhooks/handlers/notion-status-transitions.ts
 */

/** Estado inicial canonical cuando no hay transición previa registrada. */
const INITIAL_STATUS = 'Sin empezar'

interface PageChangeSignalPayload {
  schemaVersion?: number
  taskSourceId?: string
  changedPropertyIds?: readonly string[]
  parentId?: string | null
  sourceEventId?: string
  occurredAt?: string
  metadata?: {
    demo_mode?: boolean
  }
}

/**
 * Predicate defensivo: TRUE si el payload viene marcado demo_mode (no debería en
 * el path productivo). Exported para tests anti-regresión.
 */
export const isDemoModePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return (payload as PageChangeSignalPayload).metadata?.demo_mode === true
}

/**
 * Deriva el estado previo (`from`) desde la última transición registrada en PG
 * (productiva). El último `to_status` ES el estado previo canonical. Si no hay
 * transición previa, retorna el estado inicial canonical `'Sin empezar'`.
 */
const deriveFromStatus = async (taskSourceId: string): Promise<string> => {
  const rows = await runGreenhousePostgresQuery<{ to_status: string }>(
    `SELECT to_status FROM greenhouse_delivery.task_status_transitions
     WHERE task_source_id = $1
     ORDER BY transitioned_at DESC, created_at DESC
     LIMIT 1`,
    [taskSourceId]
  )

  return rows[0]?.to_status ?? INITIAL_STATUS
}

interface PersistTransitionInput {
  taskSourceId: string
  workspaceId: 'efeonce' | 'sky'
  fromStatus: string
  toStatus: string
  transitionedAt: string
  transitionedBy: string | null
  sourceEventId: string
}

/**
 * Persiste una transition canonical en `task_status_transitions`.
 * Idempotent vía UNIQUE source_event_id partial index. CHECK enum cerrado +
 * triggers append-only enforced PG-side.
 */
const persistStatusTransition = async (input: PersistTransitionInput): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_delivery.task_status_transitions (
       task_source_id, workspace_id, from_status, to_status,
       transitioned_at, transitioned_by, source_event_id,
       source_quality, captured_at, created_at
     )
     VALUES (
       $1, $2, $3, $4,
       $5::timestamptz, $6, $7,
       'canonical', NOW(), NOW()
     )
     ON CONFLICT (source_event_id) WHERE source_event_id IS NOT NULL DO NOTHING`,
    [
      input.taskSourceId,
      input.workspaceId,
      input.fromStatus,
      input.toStatus,
      input.transitionedAt,
      input.transitionedBy,
      input.sourceEventId
    ]
  )
}

export const notionStatusTransitionCaptureProjection: ProjectionDefinition = {
  name: 'notion_status_transition_capture',
  description:
    'TASK-912 — Resuelve transitions productivas (Efeonce/Sky) vía re-fetch de la página (Notion no manda from/to). Trigger notion.task.page_change_signal → re-fetch status + parent.data_source_id → resolve workspace (o SKIP si no es Efeonce/Sky) → derive from de última transición PG → persist-if-changed en task_status_transitions → emit notion.task.status_transitioned. CERO escrituras a Notion.',
  domain: 'delivery',
  triggerEvents: ['notion.task.page_change_signal'],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as PageChangeSignalPayload

    // Defense in depth: el path productivo NO lleva demo_mode. Si llega marcado,
    // lo maneja el consumer demo — skip acá.
    if (isDemoModePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''

    if (!taskSourceId) {
      return null
    }

    return { entityType: 'notion_task', entityId: taskSourceId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as PageChangeSignalPayload

    if (isDemoModePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''
    const occurredAt = typed.occurredAt?.trim() || new Date().toISOString()

    if (!taskSourceId || !sourceEventId) {
      captureWithDomain(new Error('Productive page-change signal payload missing required fields'), 'integrations.notion', {
        level: 'warning',
        tags: { source: 'status_transition_capture', stage: 'refresh' },
        extra: { taskSourceId, sourceEventId }
      })

      return null
    }

    // 1. RE-FETCH la página (source of truth del estado + del data source).
    let page

    try {
      page = await fetchPageStatus(taskSourceId)
    } catch (err) {
      // 429 / 5xx / network → throw → outbox retry exponencial. Reliability
      // signal `transition_capture_refetch_failed` lo detecta en dead-letter.
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'status_transition_capture', stage: 'refetch' },
        extra: { taskSourceId, sourceEventId }
      })

      throw err
    }

    if (!page) {
      // Página borrada (404) — degradación honesta, skip sin error.
      return `skip:page_deleted:${taskSourceId}`
    }

    // 2. Resolución AUTORITATIVA de workspace. Si no es Efeonce/Sky (demo u otro
    //    teamspace de la suscripción amplia) → skip. Garantía canonical de
    //    no-contaminación de la tabla productiva.
    const workspaceId = resolveProductiveWorkspace(page.parentDataSourceId)

    if (!workspaceId) {
      return `skip:not_productive_workspace:${taskSourceId}`
    }

    // 3. Normalizar el estado actual a canonical V1 (acepta aliases legacy).
    const toStatus = page.statusName ? normalizeTaskStatus(page.statusName) : null

    if (!toStatus) {
      // Status ausente o no canonical — skip honesto (no inventar).
      return `skip:status_unresolved:${taskSourceId}`
    }

    // 4. Derivar estado previo de la última transición registrada en PG.
    const fromStatus = await deriveFromStatus(taskSourceId)

    // 5. Idempotencia: si no cambió, no-op (signals over-emitidos + retries +
    //    cambios non-status).
    if (fromStatus === toStatus) {
      return `noop:unchanged:${taskSourceId}:${toStatus}`
    }

    const transitionedAt = page.lastEditedTime ?? occurredAt

    try {
      await persistStatusTransition({
        taskSourceId,
        workspaceId,
        fromStatus,
        toStatus,
        transitionedAt,
        transitionedBy: page.lastEditedBy ?? null,
        sourceEventId
      })

      // 6. Emit notion.task.status_transitioned (canonical, con from/to) para
      //    downstream RpA/CT/FTR (TASK-916+). Emitido para TODA transición.
      //    Non-blocking: la transition ya está persistida.
      try {
        await publishOutboxEvent({
          aggregateType: 'notion_task',
          aggregateId: taskSourceId,
          eventType: EVENT_TYPES.notionTaskStatusTransitioned,
          payload: {
            schemaVersion: 1,
            taskSourceId,
            workspaceId,
            fromStatus,
            toStatus,
            transitionedAt,
            transitionedBy: page.lastEditedBy ?? null,
            sourceEventId
          }
        })
      } catch (chainErr) {
        captureWithDomain(chainErr, 'integrations.notion', {
          level: 'warning',
          tags: { source: 'status_transition_capture', stage: 'chain_event_emit' },
          extra: { taskSourceId, sourceEventId }
        })
      }

      return `task_status_transitions:${workspaceId}:${taskSourceId}:${sourceEventId}`
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'status_transition_capture', stage: 'persist' },
        extra: { taskSourceId, fromStatus, toStatus, sourceEventId }
      })

      throw err // Re-throw para retry exponencial canonical
    }
  }
}

// Export for tests
export const __testing__ = {
  persistStatusTransition,
  isDemoModePayload,
  deriveFromStatus
}
