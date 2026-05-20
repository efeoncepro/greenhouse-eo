import 'server-only'

import { normalizeTaskStatus } from '@/lib/delivery/task-status-canonical'
import { fetchDemoPageStatus } from '@/lib/notion-metrics/notion-demo-client'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import { publishOutboxEvent } from '../publish-event'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * Estado canónico inicial cuando no hay transición previa registrada para una
 * task (Notion no provee el estado previo; es el primer cambio que observamos).
 */
const INITIAL_STATUS = 'Sin empezar'

/**
 * TASK-910 Slice 3 — Reactive consumer demo para persist status transitions
 * en tabla físicamente SEPARADA `greenhouse_delivery.task_status_transitions_demo`.
 *
 * **Defense in depth canonical**:
 *
 * 1. **Filter por `payload.metadata.demo_mode === true`**: solo procesa
 *    events del webhook handler demo (TASK-910 Slice 2). Events productivos
 *    SIN el flag son ignorados silenciosamente — el consumer productivo
 *    (TASK-912) los maneja. Strict `=== true` (anti-coersion).
 *
 * 2. **Tabla física separada**: persist en `task_status_transitions_demo`
 *    (CHECK workspace_id='demo' + triggers anti-UPDATE/anti-DELETE).
 *    Aunque el filter falle, la tabla productiva NUNCA recibe demo events.
 *
 * 3. **Idempotency**: UNIQUE index parcial sobre `source_event_id` (excluding
 *    NULL). ON CONFLICT DO NOTHING canonical — re-runs safe.
 *
 * 4. **Captura observability**: errors via captureWithDomain con tags
 *    canonical `source: 'demo_status_transition_capture'`.
 *
 * **Anti-regresión crítica**: el filter `metadata.demo_mode === true` es
 * load-bearing. Si falla:
 * - Falso negativo (demo events drop): degraded mode honest, reliability
 *   signal `notion.metrics.shadow_paridad_rpa_demo` alerta count=0.
 * - Falso positivo (productive events entran a tabla demo): defense in depth
 *   adicional — CHECK constraint workspace_id='demo' rechaza INSERT con
 *   workspaceId != 'demo'. Productive events NUNCA pasan el filter
 *   workspace_id check downstream.
 *
 * **Cross-refs**:
 * - Spec: docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md
 * - Webhook handler (emisor): src/lib/webhooks/handlers/notion-tasks-demo.ts
 * - Migration Slice 0: task_status_transitions_demo + CHECK workspace_id='demo'
 * - Pattern fuente: src/lib/sync/projections/hubspot-companies-intake.ts (TASK-878)
 */

/**
 * TASK-914 — Payload del trigger `notion.task.page_change_signal.demo`. El
 * webhook NO incluye from/to (Notion solo manda IDs de propiedad cambiada).
 * Este consumer re-fetchea la página para resolver el estado real.
 */
interface PageChangeSignalPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  changedPropertyIds?: readonly string[]
  sourceEventId?: string
  occurredAt?: string
  metadata?: {
    demo_mode?: boolean
  }
}

/**
 * Predicate canonical defensive: returns TRUE solo si payload.metadata.demo_mode
 * === true (strict). Anti-coersion contra 'true' string, 1, etc.
 *
 * Exported para tests anti-regresión.
 */
export const isDemoModePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as PageChangeSignalPayload

  return typed.metadata?.demo_mode === true
}

/**
 * Deriva el estado previo (`from`) de una task desde la última transición
 * registrada en PG. Notion no provee el estado previo en el webhook — el
 * último `to_status` registrado ES el estado previo canonical. Si no hay
 * transición previa, retorna el estado inicial canonical `'Sin empezar'`.
 */
const deriveFromStatus = async (taskSourceId: string): Promise<string> => {
  const rows = await runGreenhousePostgresQuery<{ to_status: string }>(
    `SELECT to_status FROM greenhouse_delivery.task_status_transitions_demo
     WHERE task_source_id = $1
     ORDER BY transitioned_at DESC, created_at DESC
     LIMIT 1`,
    [taskSourceId]
  )

  return rows[0]?.to_status ?? INITIAL_STATUS
}

interface PersistTransitionDemoInput {
  taskSourceId: string
  fromStatus: string
  toStatus: string
  transitionedAt: string
  transitionedBy: string | null
  sourceEventId: string
  workspaceId: string
}

/**
 * Persiste una transition canonical en tabla demo.
 * Idempotent vía UNIQUE source_event_id partial index.
 *
 * CHECK constraint workspace_id='demo' enforced PG-side — INSERT con
 * workspaceId != 'demo' fallaría a nivel DB (defense in depth dual).
 */
const persistStatusTransitionDemo = async (input: PersistTransitionDemoInput): Promise<void> => {
  if (input.workspaceId !== 'demo') {
    throw new Error(
      `[notion-status-transition-capture-demo] Refuse to INSERT row con workspace_id="${input.workspaceId}" — solo 'demo' permitido (defense in depth)`
    )
  }

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_delivery.task_status_transitions_demo (
       task_source_id, workspace_id, from_status, to_status,
       transitioned_at, transitioned_by, source_event_id,
       source_quality, captured_at, created_at
     )
     VALUES (
       $1, 'demo', $2, $3,
       $4::timestamptz, $5, $6,
       'canonical', NOW(), NOW()
     )
     ON CONFLICT (source_event_id) WHERE source_event_id IS NOT NULL DO NOTHING`,
    [
      input.taskSourceId,
      input.fromStatus,
      input.toStatus,
      input.transitionedAt,
      input.transitionedBy,
      input.sourceEventId
    ]
  )
}

export const notionStatusTransitionCaptureDemoProjection: ProjectionDefinition = {
  name: 'notion_status_transition_capture_demo',
  description:
    'TASK-914 — Resuelve transitions del demo teamspace vía re-fetch de la página (Notion no manda from/to en el webhook). Trigger notion.task.page_change_signal.demo → re-fetch status actual → derive from de última transición PG → persist-if-changed en task_status_transitions_demo. Filter strict metadata.demo_mode === true. Defense in depth dual: filter + tabla separada + CHECK workspace_id=demo PG-side.',
  domain: 'delivery',
  triggerEvents: ['notion.task.page_change_signal.demo'],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as PageChangeSignalPayload

    // CRITICAL: filter canonical anti-coersion. Solo procesa events demo.
    // Productive events (sin demo_mode flag) son ignorados — el consumer
    // productivo TASK-912 los maneja en tabla task_status_transitions.
    if (!isDemoModePayload(typed)) {
      return null // skip event entirely
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''

    if (!taskSourceId) {
      return null
    }

    const workspaceId = typed.workspaceId?.trim() ?? ''

    if (workspaceId !== 'demo') {
      // Defense in depth: payload tiene demo_mode=true pero workspaceId != 'demo'
      // → invariant violation upstream (webhook handler). Skip + signal.
      captureWithDomain(
        new Error(`Demo payload with workspaceId="${workspaceId}" (expected "demo")`),
        'integrations.notion',
        {
          level: 'warning',
          tags: {
            source: 'demo_status_transition_capture',
            stage: 'extract_scope'
          },
          extra: { taskSourceId, workspaceId }
        }
      )

      return null
    }

    return { entityType: 'notion_task', entityId: taskSourceId }
  },
  refresh: async (_scope, payload) => {
    const typed = payload as unknown as PageChangeSignalPayload

    // Redundant safety check (extractScope already filtered, but defense in depth)
    if (!isDemoModePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''
    const occurredAt = typed.occurredAt?.trim() || new Date().toISOString()

    if (!taskSourceId || !sourceEventId) {
      captureWithDomain(
        new Error('Demo page-change signal payload missing required fields'),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'demo_status_transition_capture', stage: 'refresh' },
          extra: { taskSourceId, sourceEventId }
        }
      )

      return null
    }

    // 1. RE-FETCH la página (source of truth del estado actual). Notion no manda
    //    valores en el webhook → re-fetch canonical (notion-platform Pillar 1).
    let page

    try {
      page = await fetchDemoPageStatus(taskSourceId)
    } catch (err) {
      // Re-fetch falló (429 / 5xx / network). Throw → outbox retry exponencial.
      // Reliability signal `transition_capture_refetch_failed_demo` lo detecta.
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'demo_status_transition_capture', stage: 'refetch' },
        extra: { taskSourceId, sourceEventId }
      })

      throw err
    }

    if (!page) {
      // Página borrada (404) — degradación honesta, skip sin error.
      return `skip:page_deleted:${taskSourceId}`
    }

    // 2. Normalizar el estado actual a canonical V1 (acepta aliases legacy).
    const toStatus = page.statusName ? normalizeTaskStatus(page.statusName) : null

    if (!toStatus) {
      // Status ausente o no canonical — skip honesto (no inventar). Drift de
      // schema lo detecta `notion.metrics.demo_teamspace_drift`.
      return `skip:status_unresolved:${taskSourceId}`
    }

    // 3. Derivar el estado previo de la última transición registrada en PG.
    const fromStatus = await deriveFromStatus(taskSourceId)

    // 4. Idempotencia: si el estado no cambió respecto al último registrado,
    //    no-op (maneja signals over-emitidos + retries + cambios non-status).
    if (fromStatus === toStatus) {
      return `noop:unchanged:${taskSourceId}:${toStatus}`
    }

    const transitionedAt = page.lastEditedTime ?? occurredAt

    try {
      await persistStatusTransitionDemo({
        taskSourceId,
        fromStatus,
        toStatus,
        transitionedAt,
        transitionedBy: page.lastEditedBy ?? null,
        sourceEventId,
        workspaceId: 'demo'
      })

      // TASK-913 Slice 1 — Emit chain event canonical post-persist exitoso.
      // Garantiza happens-before: capture commitea → emite → compute consume.
      // Compute projection downstream lee task_status_transitions_demo con
      // fila garantizadamente persistida (sin race condition).
      //
      // Solo correction transitions (`Listo para revisión → Cambios solicitados`)
      // disparan el chain — otras transitions persisten pero no emiten chain
      // event (compute solo le interesan correcciones). Defense in depth:
      // si el filter falla, compute igual filtra por su lógica downstream.
      const isCorrectionTransition =
        fromStatus === 'Listo para revisión' && toStatus === 'Cambios solicitados'

      if (isCorrectionTransition) {
        try {
          await publishOutboxEvent({
            aggregateType: 'notion_task',
            aggregateId: taskSourceId,
            eventType: EVENT_TYPES.notionTaskTransitionCapturedDemo,
            payload: {
              schemaVersion: 1,
              taskSourceId,
              workspaceId: 'demo',
              fromStatus,
              toStatus,
              transitionedAt,
              sourceEventId,
              metadata: { demo_mode: true }
            }
          })
        } catch (chainErr) {
          // Chain event emit failure es non-blocking: la transition está
          // persistida (idempotent fix posterior puede re-emitir). Captura
          // observability para detectar gap si emerge.
          captureWithDomain(chainErr, 'integrations.notion', {
            level: 'warning',
            tags: {
              source: 'demo_status_transition_capture',
              stage: 'chain_event_emit'
            },
            extra: { taskSourceId, sourceEventId }
          })
        }
      }

      return `task_status_transitions_demo:${taskSourceId}:${sourceEventId}`
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'demo_status_transition_capture', stage: 'persist' },
        extra: { taskSourceId, fromStatus, toStatus, sourceEventId }
      })

      throw err // Re-throw for retry exponencial canonical
    }
  }
}

// Export for tests
export const __testing__ = {
  persistStatusTransitionDemo,
  isDemoModePayload
}
