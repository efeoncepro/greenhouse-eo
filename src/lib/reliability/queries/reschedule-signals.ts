import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-921 — Reliability signals del pipeline de captura de cambios de fecha
 * límite (`task_due_date_changes`). Subsystem rollup `delivery` (mismo módulo
 * que TASK-908/912). Pre-activación (flag `NOTION_DUE_DATE_CAPTURE_ENABLED`
 * default OFF) ambos reportan steady state (sin actividad).
 */

const MODULE_KEY = 'delivery' as const

const buildErrorSignal = (
  signalId: string,
  label: string,
  kind: ReliabilitySignal['kind'],
  err: unknown,
  observedAt: string
): ReliabilitySignal => ({
  signalId,
  moduleKey: MODULE_KEY,
  kind,
  source: 'reschedule-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

// ════════════════════════════════════════════════════════════════════════════
// delivery.reschedule.capture_lag
// ════════════════════════════════════════════════════════════════════════════

export const RESCHEDULE_CAPTURE_LAG_SIGNAL_ID = 'delivery.reschedule.capture_lag'

// El consumer reactivo `notion_due_date_change_capture` rides el evento
// `notion.task.page_change_signal`. Su handler canonical en outbox_reactive_log.
const CAPTURE_HANDLER = 'notion_due_date_change_capture:notion.task.page_change_signal'

/**
 * Detecta lag/falla de la captura de cambios de fecha límite: cuenta entries
 * dead-letter activas (agotaron retries, sin ack/recover) para el handler del
 * consumer. Steady state = 0 (flag OFF o pipeline sano). > 0 → la captura está
 * rota (típicamente NOTION_TOKEN no configurado en ops-worker, o schema drift)
 * y `task_due_date_changes` queda stale → TASK-922 computaría atraso con datos
 * incompletos.
 */
export const getRescheduleCaptureLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_sync.outbox_reactive_log
       WHERE handler = $1
         AND result = 'dead-letter'
         AND acknowledged_at IS NULL
         AND recovered_at IS NULL`,
      [CAPTURE_HANDLER]
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: RESCHEDULE_CAPTURE_LAG_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'lag',
      source: 'getRescheduleCaptureLagSignal',
      label: 'Captura de reprogramaciones — lag/dead-letter',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Captura de cambios de fecha límite sin dead-letters.'
          : `${count} ${count === 1 ? 'entry' : 'entries'} en dead-letter — la captura de reprogramaciones está fallando; task_due_date_changes quedará stale.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'handler', value: CAPTURE_HANDLER },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-921-due-date-change-capture-reschedule-reason.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.notion', {
      tags: { source: 'reliability_signal_reschedule_capture_lag' }
    })

    return buildErrorSignal(
      RESCHEDULE_CAPTURE_LAG_SIGNAL_ID,
      'Captura de reprogramaciones — lag/dead-letter',
      'lag',
      error,
      observedAt
    )
  }
}

// ════════════════════════════════════════════════════════════════════════════
// delivery.reschedule.pending_reason_confirmation
// ════════════════════════════════════════════════════════════════════════════

export const RESCHEDULE_PENDING_REASON_SIGNAL_ID =
  'delivery.reschedule.pending_reason_confirmation'

// Backlog de motivos inferidos sin confirmar por el operador. El bono (TASK-922+)
// SOLO usa motivos confirmados → un backlog grande/viejo significa que muchas
// reprogramaciones se atribuyen con el default conservador en lugar del motivo real.
const PENDING_WARNING_DAYS = 7
const PENDING_ERROR_DAYS = 30

export const getReschedulePendingReasonSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ pending_count: string; oldest_days: string | null }>(
      `SELECT
         COUNT(*)::text AS pending_count,
         MAX((CURRENT_DATE - changed_at::date))::text AS oldest_days
       FROM greenhouse_delivery.task_due_date_changes
       WHERE reason_source = 'inferred'`
    )

    const pendingCount = Number(rows[0]?.pending_count ?? 0)
    const oldestDays = rows[0]?.oldest_days != null ? Number(rows[0].oldest_days) : 0

    // Grace window: motivos recién inferidos (< 7 días) son ok — el operador
    // aún tiene tiempo de confirmar. >= 7d → warning; >= 30d → error.
    const severity: ReliabilitySignal['severity'] =
      pendingCount === 0 || oldestDays < PENDING_WARNING_DAYS
        ? 'ok'
        : oldestDays >= PENDING_ERROR_DAYS
          ? 'error'
          : 'warning'

    return {
      signalId: RESCHEDULE_PENDING_REASON_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: 'getReschedulePendingReasonSignal',
      label: 'Reprogramaciones con motivo sin confirmar',
      severity,
      summary:
        pendingCount === 0
          ? 'Todos los motivos de reprogramación están confirmados.'
          : `${pendingCount} reprogramación(es) con motivo inferido sin confirmar (más antigua: ${oldestDays} días). El bono usa el default conservador hasta que el operador confirme en Notion.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'pending_count', value: String(pendingCount) },
        { kind: 'metric', label: 'oldest_days', value: String(oldestDays) },
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_delivery.task_due_date_changes WHERE reason_source='inferred'"
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.notion', {
      tags: { source: 'reliability_signal_reschedule_pending_reason' }
    })

    return buildErrorSignal(
      RESCHEDULE_PENDING_REASON_SIGNAL_ID,
      'Reprogramaciones con motivo sin confirmar',
      'data_quality',
      error,
      observedAt
    )
  }
}
