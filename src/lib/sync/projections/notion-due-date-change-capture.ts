import 'server-only'

import {
  inferRescheduleReason,
  notionReasonOptionToCode,
  type RecentStatusTransition,
  type RescheduleReasonCode,
  type RescheduleReasonConfidence
} from '@/lib/delivery/reschedule-reason-inference'
import { normalizeTaskStatus } from '@/lib/delivery/task-status-canonical'
import { isNotionDueDateCaptureEnabled } from '@/lib/notion-metrics/status-transitions-flags'
import { resolveProductiveWorkspace } from '@/lib/notion-metrics/notion-productive-workspaces'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { fetchPageDueDate } from '@/lib/space-notion/notion-client'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-921 (M0) — Reactive consumer PRODUCTIVO (Efeonce + Sky) que captura
 * cambios de FECHA LÍMITE en `greenhouse_delivery.task_due_date_changes`.
 *
 * **Reusa el evento `notion.task.page_change_signal`** que el webhook
 * `notion-status-transitions` (TASK-912) YA emite para CUALQUIER cambio de
 * propiedad — NO hay segundo endpoint/HMAC/suscripción. Es un 2do consumer del
 * mismo evento (fan-out). Mismo patrón re-fetch canonical que el consumer de
 * transiciones de estado:
 *
 * 1. **Flag gate** `NOTION_DUE_DATE_CAPTURE_ENABLED` (default OFF). Como el
 *    webhook de TASK-912 YA está ON en prod, sin este flag propio el merge
 *    empezaría a capturar inmediato. OFF → no-op (cero re-fetch, cero persist).
 * 2. **RE-FETCH** la página (Notion no manda valores; Pillar 1) → fecha vigente
 *    + fecha original (baseline seed) + motivo confirmado + estado + data source.
 * 3. **Workspace autoritativo** por `parent.data_source_id` → Efeonce/Sky o SKIP.
 * 4. **Persist-if-changed**: compara la fecha vigente vs la última registrada
 *    (la 1ra observación ancla baseline; si hay `Fecha límite original` distinta,
 *    siembra un cambio histórico best-effort `source_quality='backfilled'`).
 * 5. **Motivo**: si el operador confirmó en Notion → `operator_confirmed`; si no
 *    → inferencia pura (`inferRescheduleReason`) desde estado + transiciones
 *    recientes → `inferred`. El bono (TASK-922+) SOLO usa `operator_confirmed`.
 * 6. **Confirmation-only path**: si la fecha NO cambió pero el operador confirmó
 *    un motivo, UPDATE de la última fila a `operator_confirmed` (las columnas de
 *    motivo son las únicas mutables; el resto es audit inmutable).
 *
 * CERO escrituras a Notion (solo GET re-fetch read-only). NO computa atraso —
 * eso es TASK-922.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-921-due-date-change-capture-reschedule-reason.md
 * - Sibling: src/lib/sync/projections/notion-status-transition-capture.ts (TASK-912)
 * - Tabla: greenhouse_delivery.task_due_date_changes (TASK-921 Slice 1)
 * - Inferencia: src/lib/delivery/reschedule-reason-inference.ts (TASK-921 Slice 2)
 */

const INFERENCE_WINDOW_DAYS = 14
const RECENT_TRANSITIONS_LIMIT = 20

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

/** Predicate defensivo: TRUE si el payload viene marcado demo_mode. */
export const isDemoModePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return (payload as PageChangeSignalPayload).metadata?.demo_mode === true
}

interface PriorChangeRow {
  changeId: string
  newDueDate: string | null
  reasonCode: string
  reasonSource: string
}

/** Última fila registrada para la tarea (fecha actual ancla + estado de motivo). */
const fetchLatestChange = async (taskSourceId: string): Promise<PriorChangeRow | undefined> => {
  const rows = await runGreenhousePostgresQuery<{
    change_id: string
    new_due_date: string | null
    reason_code: string
    reason_source: string
  }>(
    `SELECT change_id, new_due_date::text AS new_due_date, reason_code, reason_source
     FROM greenhouse_delivery.task_due_date_changes
     WHERE task_source_id = $1
     ORDER BY changed_at DESC, created_at DESC
     LIMIT 1`,
    [taskSourceId]
  )

  const row = rows[0]

  if (!row) {
    return undefined
  }

  return {
    changeId: row.change_id,
    newDueDate: row.new_due_date,
    reasonCode: row.reason_code,
    reasonSource: row.reason_source
  }
}

/** Transiciones recientes (ventana) para alimentar la inferencia de motivo. */
const fetchRecentTransitions = async (
  taskSourceId: string,
  changedAtIso: string
): Promise<RecentStatusTransition[]> => {
  const rows = await runGreenhousePostgresQuery<{ to_status: string; transitioned_at: string }>(
    `SELECT to_status, transitioned_at::text AS transitioned_at
     FROM greenhouse_delivery.task_status_transitions
     WHERE task_source_id = $1
       AND transitioned_at <= $2::timestamptz
       AND transitioned_at >= ($2::timestamptz - ($3 || ' days')::interval)
     ORDER BY transitioned_at DESC
     LIMIT $4`,
    [taskSourceId, changedAtIso, String(INFERENCE_WINDOW_DAYS), RECENT_TRANSITIONS_LIMIT]
  )

  return rows.map(r => ({ toStatus: r.to_status, transitionedAt: r.transitioned_at }))
}

/**
 * Diferencia en días entre dos fechas calendario `YYYY-MM-DD` (computada en TS,
 * NO en SQL — evita `EXTRACT(EPOCH FROM date - date)` que PG rechaza, ver
 * SQL Signal Reader Schema Validation Gate TASK-893). `null` si alguna es null.
 */
export const computeDaysDelta = (previous: string | null, next: string | null): number | null => {
  if (!previous || !next) {
    return null
  }

  const prevMs = Date.parse(`${previous}T00:00:00Z`)
  const nextMs = Date.parse(`${next}T00:00:00Z`)

  if (Number.isNaN(prevMs) || Number.isNaN(nextMs)) {
    return null
  }

  return Math.round((nextMs - prevMs) / 86_400_000)
}

interface PersistChangeInput {
  taskSourceId: string
  workspaceId: 'efeonce' | 'sky'
  previousDueDate: string | null
  newDueDate: string | null
  statusAtChange: string | null
  reasonCode: RescheduleReasonCode
  reasonSource: 'inferred' | 'operator_confirmed'
  reasonConfidence: RescheduleReasonConfidence | null
  changedAt: string
  changedBy: string | null
  sourceEventId: string
  sourceQuality: 'canonical' | 'backfilled'
}

const persistChange = async (input: PersistChangeInput): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_delivery.task_due_date_changes (
       task_source_id, workspace_id, previous_due_date, new_due_date, days_delta,
       status_at_change, reason_code, reason_source, reason_confidence,
       changed_at, changed_by, source_event_id, source_quality, captured_at, created_at
     )
     VALUES (
       $1, $2, $3::date, $4::date, $5,
       $6, $7, $8, $9,
       $10::timestamptz, $11, $12, $13, NOW(), NOW()
     )
     ON CONFLICT (source_event_id) WHERE source_event_id IS NOT NULL DO NOTHING`,
    [
      input.taskSourceId,
      input.workspaceId,
      input.previousDueDate,
      input.newDueDate,
      computeDaysDelta(input.previousDueDate, input.newDueDate),
      input.statusAtChange,
      input.reasonCode,
      input.reasonSource,
      input.reasonConfidence,
      input.changedAt,
      input.changedBy,
      input.sourceEventId,
      input.sourceQuality
    ]
  )
}

/** Confirmación del operador: UPDATE de las columnas de motivo (mutables). */
const confirmReason = async (changeId: string, reasonCode: RescheduleReasonCode): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_delivery.task_due_date_changes
     SET reason_code = $1, reason_source = 'operator_confirmed', reason_confidence = NULL
     WHERE change_id = $2
       AND (reason_code <> $1 OR reason_source <> 'operator_confirmed')`,
    [reasonCode, changeId]
  )
}

export const notionDueDateChangeCaptureProjection: ProjectionDefinition = {
  name: 'notion_due_date_change_capture',
  description:
    'TASK-921 — Captura cambios de Fecha límite (Efeonce/Sky) en task_due_date_changes vía re-fetch del page_change_signal de TASK-912. Persist-if-changed + inferencia de motivo + confirmation-read del operador. Gateada por NOTION_DUE_DATE_CAPTURE_ENABLED (default OFF). CERO escrituras a Notion.',
  domain: 'delivery',
  triggerEvents: ['notion.task.page_change_signal'],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as PageChangeSignalPayload

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
    // 1. Flag gate — default OFF → no-op (cero re-fetch, cero persist).
    if (!isNotionDueDateCaptureEnabled()) {
      return 'noop:flag_off'
    }

    const typed = payload as unknown as PageChangeSignalPayload

    if (isDemoModePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const sourceEventId = typed.sourceEventId?.trim() ?? ''
    const occurredAt = typed.occurredAt?.trim() || new Date().toISOString()

    if (!taskSourceId || !sourceEventId) {
      captureWithDomain(
        new Error('Due-date capture signal payload missing required fields'),
        'integrations.notion',
        {
          level: 'warning',
          tags: { source: 'due_date_change_capture', stage: 'refresh' },
          extra: { taskSourceId, sourceEventId }
        }
      )

      return null
    }

    // 2. RE-FETCH la página (source of truth de la fecha + data source).
    let page

    try {
      page = await fetchPageDueDate(taskSourceId)
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'due_date_change_capture', stage: 'refetch' },
        extra: { taskSourceId, sourceEventId }
      })

      throw err
    }

    if (!page) {
      return `skip:page_deleted:${taskSourceId}`
    }

    // 3. Workspace autoritativo. No Efeonce/Sky → skip (no-contaminación).
    const workspaceId = resolveProductiveWorkspace(page.parentDataSourceId)

    if (!workspaceId) {
      return `skip:not_productive_workspace:${taskSourceId}`
    }

    const currentDue = page.dueDate
    const statusAtChange = page.statusName ? normalizeTaskStatus(page.statusName) : null
    const operatorReasonCode = notionReasonOptionToCode(page.rescheduleReasonLabel)
    const changedAt = page.lastEditedTime ?? occurredAt

    const prior = await fetchLatestChange(taskSourceId)

    try {
      // ── Primera observación: anclar baseline (seed histórico best-effort) ──
      if (!prior) {
        if (currentDue === null && !page.originalDueDate) {
          return `noop:no_due_date_yet:${taskSourceId}`
        }

        const originalDiffers = !!page.originalDueDate && page.originalDueDate !== currentDue
        const previousDueDate = originalDiffers ? page.originalDueDate : null

        const inference =
          operatorReasonCode === null
            ? inferRescheduleReason({
                statusAtChange,
                recentTransitions: await fetchRecentTransitions(taskSourceId, changedAt),
                daysDelta: computeDaysDelta(previousDueDate, currentDue)
              })
            : null

        await persistChange({
          taskSourceId,
          workspaceId,
          previousDueDate,
          newDueDate: currentDue,
          statusAtChange,
          reasonCode: operatorReasonCode ?? inference!.reasonCode,
          reasonSource: operatorReasonCode ? 'operator_confirmed' : 'inferred',
          reasonConfidence: operatorReasonCode ? null : inference!.reasonConfidence,
          changedAt,
          changedBy: page.lastEditedBy ?? null,
          sourceEventId,
          // baseline = no es un cambio observado en vivo → backfilled (honesto)
          sourceQuality: 'backfilled'
        })

        return `task_due_date_changes:baseline:${workspaceId}:${taskSourceId}:${sourceEventId}`
      }

      // ── Fecha sin cambio: posible confirmación de motivo del operador ──
      if (currentDue === prior.newDueDate) {
        if (
          operatorReasonCode !== null &&
          (prior.reasonSource !== 'operator_confirmed' || prior.reasonCode !== operatorReasonCode)
        ) {
          await confirmReason(prior.changeId, operatorReasonCode)

          return `task_due_date_changes:reason_confirmed:${taskSourceId}:${prior.changeId}`
        }

        return `noop:unchanged:${taskSourceId}`
      }

      // ── Reprogramación real observada en vivo ──
      const previousDueDate = prior.newDueDate

      const inference =
        operatorReasonCode === null
          ? inferRescheduleReason({
              statusAtChange,
              recentTransitions: await fetchRecentTransitions(taskSourceId, changedAt),
              daysDelta: computeDaysDelta(previousDueDate, currentDue)
            })
          : null

      await persistChange({
        taskSourceId,
        workspaceId,
        previousDueDate,
        newDueDate: currentDue,
        statusAtChange,
        reasonCode: operatorReasonCode ?? inference!.reasonCode,
        reasonSource: operatorReasonCode ? 'operator_confirmed' : 'inferred',
        reasonConfidence: operatorReasonCode ? null : inference!.reasonConfidence,
        changedAt,
        changedBy: page.lastEditedBy ?? null,
        sourceEventId,
        sourceQuality: 'canonical'
      })

      return `task_due_date_changes:${workspaceId}:${taskSourceId}:${sourceEventId}`
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'due_date_change_capture', stage: 'persist' },
        extra: { taskSourceId, sourceEventId, currentDue }
      })

      throw err
    }
  }
}

// Export for tests
export const __testing__ = {
  isDemoModePayload,
  computeDaysDelta,
  fetchLatestChange,
  fetchRecentTransitions,
  persistChange,
  confirmReason
}
