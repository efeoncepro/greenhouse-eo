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

  // Schema canonical `greenhouse_sync.webhook_inbox_events` (verificado contra
  // `src/types/db.d.ts` 2026-05-19): NO existe columna `outcome` ni `endpoint_key`.
  // FK canónica es `webhook_endpoint_id` → JOIN con `webhook_endpoints`.
  //
  // Detección canonical V1 echo-loop demo: el handler dropea echo events
  // ANTES de persistir en inbox (TASK-910 Slice 2 spec). Por tanto no hay
  // rows observables en `webhook_inbox_events` para echo-loops en V1.
  //
  // Como proxy honest: medimos events del endpoint demo con status='failed'
  // AND error_message LIKE '%echo_loop%' (placeholder — el handler V1.1
  // futuro podría persistir echo events con este pattern). Pre-V1.1: count=0
  // siempre por design. Severity=ok steady.
  //
  // Forward-compat V1.1: modificar handler `notion-tasks-demo` para persistir
  // echo events con `status='echo_loop_dropped'` (CHECK constraint extension)
  // o `error_message='echo_loop: <reason>'`. Cuando emerja, esta query
  // detecta automáticamente sin schema change.
  try {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_sync.webhook_inbox_events ie
       JOIN greenhouse_sync.webhook_endpoints we
         ON we.webhook_endpoint_id = ie.webhook_endpoint_id
       WHERE we.endpoint_key = 'notion-tasks-demo'
         AND ie.received_at >= NOW() - INTERVAL '24 hours'
         AND ie.error_message ILIKE '%echo_loop%'`
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

  // Schema canonical `greenhouse_sync.webhook_inbox_events` (verificado contra
  // `src/types/db.d.ts` 2026-05-19): la columna canonical para HMAC failures
  // es `signature_verified BOOLEAN` (populated por `processInboundWebhook`
  // en `src/lib/webhooks/store.ts` post-validación). NO existe `outcome`.
  // Endpoint scope canonical via JOIN con `webhook_endpoints.endpoint_key`.
  //
  // HMAC validation failures del demo webhook. Detecta:
  // - Leak del secret demo (atacante envía requests sin HMAC válido)
  // - Tampering / man-in-the-middle (poco probable con HTTPS)
  // - Secret rotation mal hecha (transition window sin invalid HMAC)
  try {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_sync.webhook_inbox_events ie
       JOIN greenhouse_sync.webhook_endpoints we
         ON we.webhook_endpoint_id = ie.webhook_endpoint_id
       WHERE we.endpoint_key = 'notion-tasks-demo'
         AND ie.received_at >= NOW() - INTERVAL '24 hours'
         AND ie.signature_verified = FALSE`
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

// Dead-letter threshold canonical: notion-rpa-writeback-demo projection
// maxRetries=4 → snapshot con attempt_count >= 4 está exhausto.
const WRITEBACK_DEAD_LETTER_THRESHOLD = 4

export const getNotionMetricsWritebackDeadLetterDemoSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // TASK-913 Slice 3 — Real signal canonical sobre task_rpa_demo_snapshots.
    // Detecta snapshots con writeback exhausto (attempt_count >= threshold)
    // AND last_error NOT NULL AND aún no written. Indica:
    // - Notion API rate limit sostenido (unlikely para demo low volume)
    // - Integration token revocado / corrupto
    // - Notion page borrada del teamspace
    // - Bug en property name / shape
    const rows = await query<{ count: string; latest_error: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(notion_writeback_last_error) AS latest_error
       FROM greenhouse_delivery.task_rpa_demo_snapshots
       WHERE notion_writeback_attempt_count >= $1
         AND notion_writeback_last_error IS NOT NULL
         AND written_to_notion_at IS NULL`,
      [WRITEBACK_DEAD_LETTER_THRESHOLD]
    )

    const count = Number(rows[0]?.count ?? 0)
    const latestError = rows[0]?.latest_error ?? null

    const severity: ReliabilitySignal['severity'] = count === 0 ? 'ok' : 'error'

    return {
      signalId: WRITEBACK_DEAD_LETTER_DEMO_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionMetricsWritebackDeadLetterDemoSignal',
      label: 'Writeback dead-letter demo',
      severity,
      summary:
        count === 0
          ? 'Steady state — zero snapshots en dead-letter (attempt_count >= 4).'
          : `${count} snapshots en dead-letter. Revisar Notion token + property RpA (demo) + rate limit.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'dead_letter_count', value: String(count) },
        { kind: 'metric', label: 'threshold_attempts', value: String(WRITEBACK_DEAD_LETTER_THRESHOLD) },
        { kind: 'metric', label: 'latest_error', value: latestError?.slice(0, 200) ?? 'none' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_writeback_dead_letter_demo' }
    })

    return buildErrorSignal(WRITEBACK_DEAD_LETTER_DEMO_SIGNAL_ID, 'Writeback dead-letter demo', err, observedAt)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4b. notion.metrics.writeback_lag_demo (TASK-913 Slice 3 new)
// ════════════════════════════════════════════════════════════════════════════

export const WRITEBACK_LAG_DEMO_SIGNAL_ID = 'notion.metrics.writeback_lag_demo'

// Threshold canonical para "demasiado lag": reactive consumer corre cada 5 min
// + Notion API typical latency <1s → un snapshot pending > 30 min indica un
// problema real (consumer caído, token corrupto, snapshot fuera del happy path).
const WRITEBACK_LAG_THRESHOLD_MIN = 30

export const getNotionMetricsWritebackLagDemoSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // TASK-913 Slice 3 — Detecta snapshots pending writeback con lag overdue.
    // Filtra solo snapshots writable (rpa_data_status='valid' + value != NULL)
    // y aún NO en dead-letter (attempt_count < threshold). Esos son los que
    // el reactive consumer debería estar procesando activamente.
    const rows = await query<{ count: string; oldest_age_minutes: string | null }>(
      `SELECT
          COUNT(*)::text AS count,
          MAX(EXTRACT(EPOCH FROM (NOW() - computed_at)) / 60)::text AS oldest_age_minutes
       FROM greenhouse_delivery.task_rpa_demo_snapshots
       WHERE rpa_data_status = 'valid'
         AND rpa_value IS NOT NULL
         AND written_to_notion_at IS NULL
         AND notion_writeback_attempt_count < $1
         AND computed_at < NOW() - INTERVAL '${WRITEBACK_LAG_THRESHOLD_MIN} minutes'`,
      [WRITEBACK_DEAD_LETTER_THRESHOLD]
    )

    const count = Number(rows[0]?.count ?? 0)
    const oldestAgeMin = rows[0]?.oldest_age_minutes ? Math.round(Number(rows[0].oldest_age_minutes)) : 0

    const severity: ReliabilitySignal['severity'] =
      count === 0 ? 'ok' : count <= 3 ? 'warning' : 'error'

    return {
      signalId: WRITEBACK_LAG_DEMO_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'lag',
      source: 'getNotionMetricsWritebackLagDemoSignal',
      label: 'Writeback lag demo',
      severity,
      summary:
        count === 0
          ? `Steady state — zero snapshots con lag > ${WRITEBACK_LAG_THRESHOLD_MIN}min.`
          : `${count} snapshots pending writeback > ${WRITEBACK_LAG_THRESHOLD_MIN}min (oldest=${oldestAgeMin}min). Reactive consumer puede estar caído o token revocado.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'lag_count', value: String(count) },
        { kind: 'metric', label: 'threshold_minutes', value: String(WRITEBACK_LAG_THRESHOLD_MIN) },
        { kind: 'metric', label: 'oldest_age_minutes', value: String(oldestAgeMin) }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_writeback_lag_demo' }
    })

    return buildErrorSignal(WRITEBACK_LAG_DEMO_SIGNAL_ID, 'Writeback lag demo', err, observedAt)
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
