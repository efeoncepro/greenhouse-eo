import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { EVENT_TYPES } from '../event-catalog'
import { publishOutboxEvent } from '../publish-event'
import type { ProjectionDefinition } from '../projection-registry'

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

interface StatusTransitionPayload {
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
 * Predicate canonical defensive: returns TRUE solo si payload.metadata.demo_mode
 * === true (strict). Anti-coersion contra 'true' string, 1, etc.
 *
 * Exported para tests anti-regresión.
 */
export const isDemoModePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const typed = payload as StatusTransitionPayload

  
return typed.metadata?.demo_mode === true
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
    'TASK-910 Slice 3 — Persist Notion task status transitions del demo teamspace en tabla físicamente separada task_status_transitions_demo. Filter canonical strict metadata.demo_mode === true (anti-coersion). Defense in depth dual: filter + tabla separada + CHECK workspace_id=demo PG-side.',
  domain: 'delivery',
  triggerEvents: ['notion.task.status_transitioned'],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as StatusTransitionPayload

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
    const typed = payload as unknown as StatusTransitionPayload

    // Redundant safety check (extractScope already filtered, but defense in depth)
    if (!isDemoModePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const fromStatus = typed.fromStatus?.trim() ?? ''
    const toStatus = typed.toStatus?.trim() ?? ''
    const transitionedAt = typed.transitionedAt?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''

    if (!taskSourceId || !fromStatus || !toStatus || !transitionedAt || !sourceEventId) {
      // Malformed payload — drop + capture for diagnostic
      captureWithDomain(
        new Error('Demo status transition payload missing required fields'),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'demo_status_transition_capture', stage: 'refresh' },
          extra: {
            taskSourceId,
            fromStatus,
            toStatus,
            transitionedAt,
            sourceEventId
          }
        }
      )

      return null
    }

    try {
      await persistStatusTransitionDemo({
        taskSourceId,
        fromStatus,
        toStatus,
        transitionedAt,
        transitionedBy: typed.transitionedBy ?? null,
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
