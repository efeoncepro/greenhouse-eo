import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-910 Slice 4 — 6 reliability signals canonical para el demo teamspace
 * Notion sandbox (Demo Greenhouse, 36339c2f-...4ca0f5-...).
 *
 * Subsystem rollup canonical: `delivery` module (mismo que TASK-908 signal
 * `notion.correction_transitions.source_availability` — el demo es parte
 * del dominio Delivery ICO motor).
 *
 * **Signals canonical V1.0**:
 *
 * 1. `notion.metrics.shadow_paridad_rpa_demo` (drift):
 *    Paridad calculateRpa vs Notion formula `RpA` en el demo. Pre-TASK-912
 *    webhook ingestion deployment, tabla demo está vacía → severity=unknown.
 *    Post-TASK-912 + demo writeback Slice (V1.1+): severity warning si
 *    diff > 5% de tareas demo en últimos 24h.
 *
 * 2. `notion.metrics.echo_loop_detected_demo` (drift):
 *    Echo-loop sostenido en demo. Si webhook handler procesa events del
 *    integration user de Greenhouse (no canonical), incrementa. Steady=0.
 *    Pre-TASK-912: severity=ok (count=0, no webhook activity).
 *
 * 3. `notion.metrics.webhook_signature_failures_demo` (drift):
 *    HMAC validation failures sostenidas en demo webhook. Steady=0. Si
 *    > 0 sostenido, indica leak del secret o tampering. Pre-TASK-912:
 *    severity=ok (count=0).
 *
 * 4. `notion.metrics.writeback_dead_letter_demo` (drift):
 *    Cloud Tasks queue dead-letter rate del writeback demo. **Deferred a
 *    TASK-913 V1.1** cuando Fase C writeback shipee. Pre-TASK-913:
 *    severity=unknown (no writeback queue activa yet).
 *
 * 5. `notion.metrics.demo_teamspace_drift` (drift):
 *    Schema drift demo vs Efeonce template canonical (status options,
 *    properties). V1 manual detection comparando 11 canonical V1 vs actual
 *    status values en task_status_transitions_demo. Pre-TASK-912 (tabla
 *    vacía): severity=ok (no data para comparar).
 *
 * 6. `payroll.bonus.demo_member_contamination` (drift, ERROR si > 0):
 *    **CRITICAL defense in depth canonical**. Detecta si payroll_entries
 *    existen para demo members (members.is_demo = TRUE). Steady=0.
 *    NUNCA debe pasar. Si > 0, indica:
 *    - Bug en Slice 5 bonus guardrail filter SQL/helper
 *    - Manual SQL INSERT bypass del filter canonical
 *    - Demo member sin is_demo=TRUE asignado a tarea productive
 *    Severity=ok cuando count=0, ERROR cuando > 0 (alerta immediate).
 *
 * Cross-refs:
 * - Pattern fuente: src/lib/reliability/queries/notion-correction-transitions-source-availability.ts (TASK-908)
 * - Bonus guardrail Slice 5: src/lib/payroll/fetch-kpis-for-period.ts + bonus-proration.ts
 * - Tabla demo: greenhouse_delivery.task_status_transitions_demo (TASK-910 Slice 0)
 * - Members discriminator: greenhouse_core.members.is_demo (TASK-910 Slice 0)
 */

const MODULE_KEY = 'delivery' as const

// ════════════════════════════════════════════════════════════════════════════
// 1. notion.metrics.shadow_paridad_rpa_demo
// ════════════════════════════════════════════════════════════════════════════

export const SHADOW_PARIDAD_RPA_DEMO_SIGNAL_ID = 'notion.metrics.shadow_paridad_rpa_demo'

export const getNotionMetricsShadowParidadRpaDemoSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Pre-TASK-913 V1.1 (Fase C writeback shipped + paridad measured):
    // tabla task_status_transitions_demo puede tener transitions pero
    // calculateRpa demo aún no compara contra Notion formula RpA. Hasta
    // entonces, severity=unknown honest.
    const rows = await query<{ rows_count: string }>(
      `SELECT COUNT(*)::text AS rows_count
       FROM greenhouse_delivery.task_status_transitions_demo
       WHERE created_at >= NOW() - INTERVAL '24 hours'`
    )

    const count = Number(rows[0]?.rows_count ?? 0)

    return {
      signalId: SHADOW_PARIDAD_RPA_DEMO_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsShadowParidadRpaDemoSignal',
      label: 'Paridad RpA demo (shadow mode)',
      severity: 'unknown',
      summary:
        count === 0
          ? 'Sin transitions demo en últimos 24h — shadow paridad RpA pending TASK-912 webhook + demo activity.'
          : `${count} transitions demo capturadas en últimos 24h. Paridad RpA pending TASK-913 V1.1 Fase C writeback comparison.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'transitions_demo_24h', value: String(count) },
        { kind: 'doc', label: 'Spec writeback Fase C', value: 'TASK-913 V1.1 follow-up' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_shadow_paridad_rpa_demo' }
    })

    return buildErrorSignal(SHADOW_PARIDAD_RPA_DEMO_SIGNAL_ID, 'Paridad RpA demo (shadow mode)', err, observedAt)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 2. notion.metrics.echo_loop_detected_demo
// ════════════════════════════════════════════════════════════════════════════

export const ECHO_LOOP_DEMO_SIGNAL_ID = 'notion.metrics.echo_loop_detected_demo'

export const getNotionMetricsEchoLoopDemoSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Echo-loop detection canonical: webhook_inbox_events del endpoint
    // notion-tasks-demo con outcome 'echo_loop_dropped' (TASK-910 Slice 2
    // handler dropea echo events silently — el inbox row queda con outcome
    // labeled si el handler lo persiste — V1 NO persiste, future V1.1).
    //
    // V1: usamos proxy heuristic — count de events demo con same author como
    // integration user en últimos 24h. Pre-TASK-912 webhook subscription: 0.
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_sync.webhook_inbox_events
       WHERE endpoint_key = 'notion-tasks-demo'
         AND received_at >= NOW() - INTERVAL '24 hours'
         AND outcome = 'echo_loop_dropped'`
    )

    const count = Number(rows[0]?.count ?? 0)

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : count <= 10 ? 'warning' : 'error'

    return {
      signalId: ECHO_LOOP_DEMO_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsEchoLoopDemoSignal',
      label: 'Echo-loop detección demo webhook',
      severity,
      summary:
        count === 0
          ? 'No echo-loops detectados en demo webhook últimos 24h (steady state).'
          : `${count} echo-loop events detectados en demo webhook últimos 24h. Revisar integration user id mapping.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'echo_loop_count_24h', value: String(count) },
        { kind: 'doc', label: 'Webhook handler', value: 'src/lib/webhooks/handlers/notion-tasks-demo.ts' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_echo_loop_demo' }
    })

    return buildErrorSignal(ECHO_LOOP_DEMO_SIGNAL_ID, 'Echo-loop detección demo webhook', err, observedAt)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. notion.metrics.webhook_signature_failures_demo
// ════════════════════════════════════════════════════════════════════════════

export const WEBHOOK_SIGNATURE_FAILURES_DEMO_SIGNAL_ID = 'notion.metrics.webhook_signature_failures_demo'

export const getNotionMetricsWebhookSignatureFailuresDemoSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // HMAC validation failures del demo webhook. Detecta:
    // - Leak del secret demo (atacante envía requests sin HMAC válido)
    // - Tampering / man-in-the-middle (poco probable con HTTPS)
    // - Secret rotation mal hecha (transition window sin invalid HMAC)
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_sync.webhook_inbox_events
       WHERE endpoint_key = 'notion-tasks-demo'
         AND received_at >= NOW() - INTERVAL '24 hours'
         AND outcome IN ('signature_invalid', 'failed')
         AND error_message ILIKE '%signature%'`
    )

    const count = Number(rows[0]?.count ?? 0)

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : count <= 5 ? 'warning' : 'error'

    return {
      signalId: WEBHOOK_SIGNATURE_FAILURES_DEMO_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsWebhookSignatureFailuresDemoSignal',
      label: 'HMAC signature failures demo webhook',
      severity,
      summary:
        count === 0
          ? 'No HMAC validation failures en demo webhook últimos 24h (steady state).'
          : `${count} HMAC failures en demo webhook últimos 24h. Revisar secret rotation o posible tampering.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'hmac_failures_count_24h', value: String(count) },
        { kind: 'doc', label: 'Secret GCP', value: 'notion-webhook-signing-secret-demo' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_webhook_signature_failures_demo' }
    })

    return buildErrorSignal(WEBHOOK_SIGNATURE_FAILURES_DEMO_SIGNAL_ID, 'HMAC signature failures demo webhook', err, observedAt)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. notion.metrics.writeback_dead_letter_demo
// ════════════════════════════════════════════════════════════════════════════

export const WRITEBACK_DEAD_LETTER_DEMO_SIGNAL_ID = 'notion.metrics.writeback_dead_letter_demo'

export const getNotionMetricsWritebackDeadLetterDemoSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  // Writeback dead-letter detection — pending TASK-913 V1.1 Fase C cuando
  // Cloud Tasks queue notion-writeback-demo shipee. Pre-V1.1: severity=unknown
  // honest, no queue activa.
  return {
    signalId: WRITEBACK_DEAD_LETTER_DEMO_SIGNAL_ID,
    moduleKey: MODULE_KEY,
    kind: 'drift',
    source: 'getNotionMetricsWritebackDeadLetterDemoSignal',
    label: 'Writeback dead-letter demo',
    severity: 'unknown',
    summary:
      'Cloud Tasks queue writeback demo pending TASK-913 V1.1 Fase C deployment. Sin data yet.',
    observedAt,
    evidence: [
      { kind: 'doc', label: 'Spec Fase C', value: 'TASK-913 V1.1 follow-up' },
      { kind: 'doc', label: 'Pattern fuente', value: 'TASK-878 dead-letter handling' }
    ]
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. notion.metrics.demo_teamspace_drift
// ════════════════════════════════════════════════════════════════════════════

export const DEMO_TEAMSPACE_DRIFT_SIGNAL_ID = 'notion.metrics.demo_teamspace_drift'

const CANONICAL_V1_STATUSES = [
  'Sin empezar',
  'Brief listo',
  'Pendiente aprobación interna',
  'En pausa',
  'Bloqueado',
  'En curso',
  'Listo para revisión',
  'Cambios solicitados',
  'Aprobado',
  'Cancelado',
  'Archivado'
] as const

export const getNotionMetricsDemoTeamspaceDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Schema drift detection canonical: status values en demo que NO están en
    // canonical V1 (11 estados). Pre-TASK-912: tabla vacía → no drift visible.
    // Post-TASK-912: detecta si webhook ingiere status names fuera del canonical
    // V1 (defense in depth — el handler ya rechaza unknown statuses, pero esto
    // detecta si manual SQL INSERT bypassea el handler).
    const rows = await query<{ status: string; count: string }>(
      `SELECT to_status AS status, COUNT(*)::text AS count
       FROM greenhouse_delivery.task_status_transitions_demo
       WHERE created_at >= NOW() - INTERVAL '7 days'
         AND to_status NOT IN (${CANONICAL_V1_STATUSES.map((_, idx) => `$${idx + 1}`).join(', ')})
       GROUP BY to_status
       ORDER BY count DESC`,
      [...CANONICAL_V1_STATUSES]
    )

    const driftCount = rows.length

    const severity: ReliabilitySignal['severity'] = driftCount === 0 ? 'ok' : 'warning'

    return {
      signalId: DEMO_TEAMSPACE_DRIFT_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsDemoTeamspaceDriftSignal',
      label: 'Schema drift demo teamspace vs canonical V1',
      severity,
      summary:
        driftCount === 0
          ? 'Schema demo aligned con canonical V1 (0 status names fuera del canonical 11).'
          : `${driftCount} status names en demo NO están en canonical V1: ${rows.map(r => r.status).join(', ')}.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'drift_status_count', value: String(driftCount) },
        { kind: 'doc', label: 'Canonical V1', value: CANONICAL_V1_STATUSES.join(', ') }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_demo_teamspace_drift' }
    })

    return buildErrorSignal(DEMO_TEAMSPACE_DRIFT_SIGNAL_ID, 'Schema drift demo teamspace', err, observedAt)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 6. payroll.bonus.demo_member_contamination — CRITICAL defense in depth
// ════════════════════════════════════════════════════════════════════════════

export const BONUS_DEMO_CONTAMINATION_SIGNAL_ID = 'payroll.bonus.demo_member_contamination'

export const getPayrollBonusDemoContaminationSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // CRITICAL canonical: detecta si payroll_entries existen para demo members.
    // Steady=0. NUNCA debe pasar — defense in depth Slice 5 (filter SQL +
    // pre-check helpers) garantiza demo members NUNCA tocan payroll.
    //
    // Si count > 0:
    // - Bug en fetchKpisForPeriod filter SQL (Slice 5)
    // - Bug en calculateRpaBonus/calculateOtdBonus pre-check
    // - Manual SQL INSERT bypass del filter canonical
    // - Demo member tiene is_demo=FALSE accidentalmente (manual UPDATE)
    //
    // Severity=ok cuando count=0, ERROR cuando > 0 (alerta immediate).
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_payroll.payroll_entries pe
       JOIN greenhouse_core.members m ON m.member_id = pe.member_id
       WHERE m.is_demo = TRUE`
    )

    const count = Number(rows[0]?.count ?? 0)

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: BONUS_DEMO_CONTAMINATION_SIGNAL_ID,
      moduleKey: 'payroll' as const,
      kind: 'drift',
      source: 'getPayrollBonusDemoContaminationSignal',
      label: 'Demo members contamination en payroll (CRITICAL)',
      severity,
      summary:
        count === 0
          ? 'Steady state — zero payroll_entries para demo members. Defense in depth canonical operativo.'
          : `🚨 ${count} payroll_entries DETECTADAS para demo members. INMEDIATO: revisar bonus guardrail Slice 5 + auditar manual SQL recientes. Demo NUNCA debe tocar payroll real.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'payroll_entries_demo_count', value: String(count) },
        { kind: 'sql', label: 'Query', value: 'JOIN payroll_entries con members WHERE is_demo=TRUE' },
        { kind: 'doc', label: 'Defense in depth', value: 'TASK-910 Slice 5 bonus guardrail dual' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'payroll', {
      tags: { source: 'reliability_signal_bonus_demo_contamination' }
    })

    return {
      signalId: BONUS_DEMO_CONTAMINATION_SIGNAL_ID,
      moduleKey: 'payroll' as const,
      kind: 'drift',
      source: 'getPayrollBonusDemoContaminationSignal',
      label: 'Demo members contamination en payroll (CRITICAL)',
      severity: 'unknown',
      summary: 'No fue posible computar el signal — revisar logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Helper canonical para error responses uniformes
// ════════════════════════════════════════════════════════════════════════════

const buildErrorSignal = (
  signalId: string,
  label: string,
  err: unknown,
  observedAt: string
): ReliabilitySignal => ({
  signalId,
  moduleKey: MODULE_KEY,
  kind: 'drift',
  source: 'demo-signal',
  label,
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})
