import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-992 — Client Lifecycle reliability signals (GREENHOUSE_CLIENT_LIFECYCLE_V1 §13).
 * All roll up under subsystem `Commercial Health` (moduleKey 'commercial'). Steady=0
 * (override anomaly: steady < 3 in 30d). V1.0 covers the onboarding scope; the
 * offboarding-specific `offboarding_blocked_overdue` signal lands with offboarding.
 */

type Kind = ReliabilitySignal['kind']
type Severity = ReliabilitySignal['severity']

const buildSignal = (
  signalId: string,
  source: string,
  kind: Kind,
  label: string,
  severity: Severity,
  summary: string,
  count: number,
  sqlNote: string
): ReliabilitySignal => ({
  signalId,
  moduleKey: 'commercial',
  kind,
  source,
  label,
  severity,
  summary,
  observedAt: new Date().toISOString(),
  evidence: [
    { kind: 'sql', label: 'Query', value: sqlNote },
    { kind: 'metric', label: 'count', value: String(count) },
    { kind: 'doc', label: 'Spec', value: 'docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md §13' }
  ]
})

const errorSignal = (signalId: string, source: string, kind: Kind, label: string, error: unknown): ReliabilitySignal => {
  captureWithDomain(error, 'commercial', { tags: { source: `reliability_signal_${source}` } })

  return {
    signalId,
    moduleKey: 'commercial',
    kind,
    source,
    label,
    severity: 'unknown',
    summary: 'No fue posible leer el signal. Revisa los logs.',
    observedAt: new Date().toISOString(),
    evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
  }
}

const readCount = async (sql: string, params: unknown[] = []): Promise<number> => {
  const rows = await query<{ n: number }>(sql, params)

  return Number(rows[0]?.n ?? 0)
}

// 1. onboarding_stalled — onboarding in_progress > 14 días sin avance de items.
export const getClientLifecycleOnboardingStalledSignal = async (): Promise<ReliabilitySignal> => {
  const id = 'client.lifecycle.onboarding_stalled'
  const source = 'getClientLifecycleOnboardingStalledSignal'

  try {
    const count = await readCount(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_lifecycle_cases c
       WHERE c.case_kind = 'onboarding'
         AND c.status = 'in_progress'
         AND c.created_at < NOW() - INTERVAL '14 days'
         AND NOT EXISTS (
           SELECT 1 FROM greenhouse_core.client_lifecycle_case_events e
           WHERE e.case_id = c.case_id
             AND e.event_kind LIKE 'item_%'
             AND e.occurred_at > NOW() - INTERVAL '14 days'
         )`
    )

    return buildSignal(
      id,
      source,
      'drift',
      'Onboardings estancados',
      count === 0 ? 'ok' : 'warning',
      count === 0 ? 'Sin onboardings estancados.' : `${count} onboarding(s) en progreso sin avance hace +14 días.`,
      count,
      'client_lifecycle_cases (onboarding, in_progress, sin item_* events últimos 14d)'
    )
  } catch (error) {
    return errorSignal(id, source, 'drift', 'Onboardings estancados', error)
  }
}

// 2. checklist_orphan_items — items de casos activos sin fila en el template activo.
export const getClientLifecycleChecklistOrphanItemsSignal = async (): Promise<ReliabilitySignal> => {
  const id = 'client.lifecycle.checklist_orphan_items'
  const source = 'getClientLifecycleChecklistOrphanItemsSignal'

  try {
    const count = await readCount(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_lifecycle_checklist_items i
       JOIN greenhouse_core.client_lifecycle_cases c ON c.case_id = i.case_id
       WHERE c.status NOT IN ('completed','cancelled')
         AND NOT EXISTS (
           SELECT 1 FROM greenhouse_core.client_lifecycle_checklist_templates t
           WHERE t.template_code = i.template_code AND t.item_code = i.item_code AND t.effective_to IS NULL
         )`
    )

    return buildSignal(
      id,
      source,
      'data_quality',
      'Ítems de checklist huérfanos',
      count === 0 ? 'ok' : 'error',
      count === 0 ? 'Sin ítems huérfanos en casos activos.' : `${count} ítem(s) sin template activo correspondiente.`,
      count,
      'checklist_items de casos activos sin (template_code,item_code) en template activo'
    )
  } catch (error) {
    return errorSignal(id, source, 'data_quality', 'Ítems de checklist huérfanos', error)
  }
}

// 3. cascade_dead_letter — outbox client.lifecycle.* en dead_letter.
export const getClientLifecycleCascadeDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const id = 'client.lifecycle.cascade_dead_letter'
  const source = 'getClientLifecycleCascadeDeadLetterSignal'

  try {
    const count = await readCount(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_sync.outbox_events
       WHERE event_type LIKE 'client.lifecycle.%' AND status = 'dead_letter'`
    )

    return buildSignal(
      id,
      source,
      'dead_letter',
      'Cascade lifecycle en dead-letter',
      count === 0 ? 'ok' : 'error',
      count === 0 ? 'Sin eventos lifecycle en dead-letter.' : `${count} evento(s) client.lifecycle.* en dead-letter.`,
      count,
      "outbox_events WHERE event_type LIKE 'client.lifecycle.%' AND status='dead_letter'"
    )
  } catch (error) {
    return errorSignal(id, source, 'dead_letter', 'Cascade lifecycle en dead-letter', error)
  }
}

// 4. case_without_template — casos cuyo template_code no existe en templates.
export const getClientLifecycleCaseWithoutTemplateSignal = async (): Promise<ReliabilitySignal> => {
  const id = 'client.lifecycle.case_without_template'
  const source = 'getClientLifecycleCaseWithoutTemplateSignal'

  try {
    const count = await readCount(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_lifecycle_cases c
       WHERE NOT EXISTS (
         SELECT 1 FROM greenhouse_core.client_lifecycle_checklist_templates t
         WHERE t.template_code = c.template_code
       )`
    )

    return buildSignal(
      id,
      source,
      'data_quality',
      'Casos sin template registrado',
      count === 0 ? 'ok' : 'error',
      count === 0
        ? 'Todos los casos referencian un template registrado.'
        : `${count} caso(s) con template_code inexistente.`,
      count,
      'client_lifecycle_cases con template_code ausente de la tabla de templates'
    )
  } catch (error) {
    return errorSignal(id, source, 'data_quality', 'Casos sin template registrado', error)
  }
}

// 5. blocker_override_anomaly_rate — overrides en los últimos 30 días (steady < 3).
export const getClientLifecycleBlockerOverrideAnomalySignal = async (): Promise<ReliabilitySignal> => {
  const id = 'client.lifecycle.blocker_override_anomaly_rate'
  const source = 'getClientLifecycleBlockerOverrideAnomalySignal'
  const threshold = 3

  try {
    const count = await readCount(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_lifecycle_case_events
       WHERE event_kind = 'blocker_overridden'
         AND occurred_at > NOW() - INTERVAL '30 days'`
    )

    return buildSignal(
      id,
      source,
      'drift',
      'Tasa de overrides de bloqueo',
      count < threshold ? 'ok' : 'warning',
      count < threshold
        ? `${count} override(s) de bloqueo en 30 días (bajo umbral).`
        : `${count} override(s) de bloqueo en 30 días — posible mal uso del override.`,
      count,
      "case_events WHERE event_kind='blocker_overridden' últimos 30d"
    )
  } catch (error) {
    return errorSignal(id, source, 'drift', 'Tasa de overrides de bloqueo', error)
  }
}
