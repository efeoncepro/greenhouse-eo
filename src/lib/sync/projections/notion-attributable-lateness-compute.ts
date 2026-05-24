import 'server-only'

import { calculateAttributableLateness } from '@/lib/notion-metrics/calculate-attributable-lateness'
import {
  ATTRIBUTABLE_FREEZE_STATUSES,
  type FreezeInterval,
  type RescheduleObservation
} from '@/lib/notion-metrics/attributable-lateness-types'
import { classifyOtdBucket } from '@/lib/notion-metrics/classify-otd-bucket'
import type { RescheduleReasonCode } from '@/lib/delivery/reschedule-reason-inference'
import { normalizeTaskStatus } from '@/lib/delivery/task-status-canonical'
import { isAttributableLatenessOtdEnabled } from '@/lib/notion-metrics/status-transitions-flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-922 (M2) — Reactive consumer del cómputo SHADOW de atraso imputable.
 *
 * **Reusa el evento `notion.task.status_transitioned`** (emitido por el consumer
 * de captura TASK-912 en cada transición) como trigger de recompute — NO crea
 * webhook/cron nuevo. Por cada transición:
 *
 * 1. **Flag gate** `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (default OFF) → no-op.
 * 2. Re-lee de PG: la task (due/original/completed/status/legacy bucket), sus
 *    transiciones (→ intervalos de freeze) y sus reprogramaciones (→ fecha justa).
 * 3. `calculateAttributableLateness` (helper canónico, source of truth).
 * 4. `bucket_no_freeze` = mismo input con freeze OFF (baseline de paridad).
 * 5. UPSERT en `task_attributable_lateness_shadow` (último cómputo gana).
 *
 * CERO escrituras a Notion. NO toca el bono (shadow; nadie lee la tabla hasta el
 * cutover gated). Patrón RpA V2 (TASK-913/916): helper + snapshot + consumer.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-922-attributable-lateness-helper-otd-bucket-shadow.md
 * - Helper: src/lib/notion-metrics/calculate-attributable-lateness.ts
 * - Tabla: greenhouse_delivery.task_attributable_lateness_shadow (Slice 3)
 */

const FREEZE_STATUS_SET: ReadonlySet<string> = new Set(ATTRIBUTABLE_FREEZE_STATUSES)

interface StatusTransitionedPayload {
  schemaVersion?: number
  taskSourceId?: string
  workspaceId?: string
  metadata?: { demo_mode?: boolean }
}

export const isDemoModePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return (payload as StatusTransitionedPayload).metadata?.demo_mode === true
}

type TaskRow = {
  task_status: string | null
  due_date: string | null
  original_due_date: string | null
  completed_at: string | null
  performance_indicator_code: string | null
}

const parseDate = (s: string | null): Date | null => {
  if (!s) {
    return null
  }

  // `date` viene como 'YYYY-MM-DD' (UTC midnight); timestamptz como ISO.
  const iso = s.length === 10 ? `${s}T00:00:00Z` : s
  const d = new Date(iso)

  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Reconstruye los intervalos de freeze desde las transiciones ordenadas ASC:
 * cada entrada a un estado de freeze dura hasta la siguiente transición (o
 * `null` = aún en freeze al cierre, el helper clampa a `end`). Pure + exported.
 */
export const reconstructFreezeIntervals = (
  transitions: readonly { toStatus: string; transitionedAt: string }[]
): FreezeInterval[] => {
  const intervals: FreezeInterval[] = []

  for (let i = 0; i < transitions.length; i++) {
    const canonical = normalizeTaskStatus(transitions[i].toStatus) ?? transitions[i].toStatus

    if (!FREEZE_STATUS_SET.has(canonical)) {
      continue
    }

    const entered = parseDate(transitions[i].transitionedAt)

    if (!entered) {
      continue
    }

    const next = transitions[i + 1]
    const exited = next ? parseDate(next.transitionedAt) : null

    intervals.push({ entered, exited })
  }

  return intervals
}

export const notionAttributableLatenessComputeProjection: ProjectionDefinition = {
  name: 'notion_attributable_lateness_compute',
  description:
    'TASK-922 — Cómputo shadow de atraso imputable (Efeonce/Sky). Trigger notion.task.status_transitioned → re-lee task + transitions + reschedules de PG → calculateAttributableLateness → UPSERT task_attributable_lateness_shadow. Gated ATTRIBUTABLE_LATENESS_OTD_ENABLED (default OFF). CERO escrituras a Notion, bono intacto.',
  domain: 'delivery',
  triggerEvents: ['notion.task.status_transitioned'],
  extractScope: (payload: Record<string, unknown>) => {
    const typed = payload as unknown as StatusTransitionedPayload

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
    // 1. Flag gate — default OFF → no-op (cero compute, cero persist).
    if (!isAttributableLatenessOtdEnabled()) {
      return 'noop:flag_off'
    }

    const typed = payload as unknown as StatusTransitionedPayload

    if (isDemoModePayload(typed)) {
      return null
    }

    const taskSourceId = typed.taskSourceId?.trim() ?? ''
    const workspaceId = typed.workspaceId?.trim() ?? ''

    if (!taskSourceId || !workspaceId) {
      return null
    }

    try {
      // 2. Re-leer la task + transitions + reschedules de PG (source of truth).
      const taskRows = await runGreenhousePostgresQuery<TaskRow>(
        `SELECT task_status,
                due_date::text AS due_date,
                original_due_date::text AS original_due_date,
                completed_at::text AS completed_at,
                performance_indicator_code
         FROM greenhouse_delivery.tasks
         WHERE notion_task_id = $1`,
        [taskSourceId]
      )

      const task = taskRows[0]

      if (!task) {
        return `skip:task_not_found:${taskSourceId}`
      }

      const transitions = await runGreenhousePostgresQuery<{
        to_status: string
        transitioned_at: string
      }>(
        `SELECT to_status, transitioned_at::text AS transitioned_at
         FROM greenhouse_delivery.task_status_transitions
         WHERE task_source_id = $1
         ORDER BY transitioned_at ASC, created_at ASC`,
        [taskSourceId]
      )

      const rescheduleRows = await runGreenhousePostgresQuery<{
        days_delta: number | null
        reason_code: string
        reason_source: string
      }>(
        `SELECT days_delta, reason_code, reason_source
         FROM greenhouse_delivery.task_due_date_changes
         WHERE task_source_id = $1`,
        [taskSourceId]
      )

      const freezeIntervals = reconstructFreezeIntervals(
        transitions.map(t => ({ toStatus: t.to_status, transitionedAt: t.transitioned_at }))
      )

      const reschedules: RescheduleObservation[] = rescheduleRows.map(r => ({
        daysDelta: r.days_delta,
        reasonCode: r.reason_code as RescheduleReasonCode,
        reasonSource: r.reason_source === 'operator_confirmed' ? 'operator_confirmed' : 'inferred'
      }))

      const completedAt = parseDate(task.completed_at)

      const result = calculateAttributableLateness({
        originalDueDate: parseDate(task.original_due_date),
        currentDueDate: parseDate(task.due_date),
        completedAt,
        taskStatus: task.task_status,
        freezeIntervals,
        reschedules,
        hasStatusHistory: transitions.length > 0
      })

      // 4. bucket_no_freeze: mismo input con freeze OFF (baseline de paridad).
      const noFreezeBucket = result.fairDeadline
        ? classifyOtdBucket({
            taskStatus: task.task_status,
            dueDate: parseDate(result.fairDeadline),
            completedAt,
            frozenDays: 0,
            applyMonthGate: false
          }).bucket
        : result.bucket

      // 5. UPSERT shadow (último cómputo gana).
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_delivery.task_attributable_lateness_shadow (
           task_source_id, workspace_id, fair_deadline, attributable_days_late,
           frozen_days_excluded, bucket_attributable, bucket_no_freeze, bucket_legacy,
           data_status, formula_version, computed_at, created_at
         )
         VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (task_source_id) DO UPDATE SET
           workspace_id = EXCLUDED.workspace_id,
           fair_deadline = EXCLUDED.fair_deadline,
           attributable_days_late = EXCLUDED.attributable_days_late,
           frozen_days_excluded = EXCLUDED.frozen_days_excluded,
           bucket_attributable = EXCLUDED.bucket_attributable,
           bucket_no_freeze = EXCLUDED.bucket_no_freeze,
           bucket_legacy = EXCLUDED.bucket_legacy,
           data_status = EXCLUDED.data_status,
           formula_version = EXCLUDED.formula_version,
           computed_at = NOW()`,
        [
          taskSourceId,
          workspaceId,
          result.fairDeadline,
          result.attributableDaysLate,
          result.frozenDaysExcluded,
          result.bucket,
          noFreezeBucket,
          task.performance_indicator_code,
          result.dataStatus,
          result.formulaVersion
        ]
      )

      return `task_attributable_lateness_shadow:${workspaceId}:${taskSourceId}:${result.dataStatus}`
    } catch (err) {
      captureWithDomain(err, 'delivery', {
        level: 'error',
        tags: { source: 'attributable_lateness_compute', stage: 'refresh' },
        extra: { taskSourceId, workspaceId }
      })

      throw err
    }
  }
}

// Export for tests
export const __testing__ = {
  isDemoModePayload,
  reconstructFreezeIntervals,
  parseDate
}
