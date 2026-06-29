import 'server-only'

/**
 * TASK-1279 — Growth AI Visibility · cross-sell operador · reliability signal.
 *
 * `operator_send_failed`: envíos operador (informe + Lead HubSpot) con `email_status='failed'`
 * o `lead_status='failed'` que NO se recuperaron pasados 15 min ⇒ el envío o la creación del Lead
 * se están fallando persistentemente (delivery caído, render roto, HubSpot rechazando, o el objeto
 * `leads`/property `aeo_check_result` aún no provisionados). Steady=0. El lag/dead-letter del
 * reactive handler lo cubre la infraestructura canónica de handler-health.
 *
 * Gate: con `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` OFF el command rechaza antes de claimar
 * → no hay sends → severity `ok`. Error de lectura → `unknown` (degradación honesta).
 */

import { isOperatorSendEnabled } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_OPERATOR_SEND_FAILED_SIGNAL_ID = 'growth.ai_visibility.operator_send_failed'

export const getGrowthAiVisibilityOperatorSendSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()
  const enabled = isOperatorSendEnabled()

  try {
    const rows = await runGreenhousePostgresQuery<{ failed: number }>(
      `SELECT COUNT(*)::int AS failed
         FROM greenhouse_growth.grader_report_send_log
        WHERE (email_status = 'failed' OR lead_status = 'failed')
          AND updated_at < NOW() - INTERVAL '15 minutes'`
    )

    const failed = Number(rows[0]?.failed ?? 0)

    const severity: ReliabilitySignal['severity'] = !enabled
      ? 'ok'
      : failed > 3
        ? 'error'
        : failed > 0
          ? 'warning'
          : 'ok'

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_OPERATOR_SEND_FAILED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'drift',
        source: 'getGrowthAiVisibilityOperatorSendSignals',
        label: 'Cross-sell AEO operador fallando',
        severity,
        summary: !enabled
          ? 'Envío operador AEO OFF: sin envíos activos (esperado pre-launch).'
          : failed > 0
            ? `${failed} envío(s) operador (informe/Lead) en estado failed >15 min — revisar entrega o HubSpot.`
            : 'Todos los envíos operador AEO se completaron correctamente.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'failed', value: String(failed) },
          { kind: 'metric', label: 'operator_send_enabled', value: String(enabled) }
        ]
      }
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_growth_ai_visibility_operator_send' }
    })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_OPERATOR_SEND_FAILED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'drift' as const,
        source: 'getGrowthAiVisibilityOperatorSendSignals',
        label: 'Cross-sell AEO operador fallando',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          { kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }
        ]
      }
    ]
  }
}
