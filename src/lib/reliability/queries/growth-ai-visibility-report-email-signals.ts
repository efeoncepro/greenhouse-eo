import 'server-only'

/**
 * TASK-1250 — Growth AI Visibility · report email delivery · reliability signal.
 *
 * `report_email_failed`: dispatches del email de entrega en estado `failed` que NO se
 * recuperaron pasados 15 min ⇒ la entrega se está fallando persistentemente (delivery
 * rate-limited/caído, render del adjunto roto, o consumer atascado). Steady=0. El lag/
 * dead-letter del reactive handler lo cubre la infraestructura canónica de handler-health.
 *
 * Gate: con el flag `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` OFF no hay dispatches (el
 * command skipea en `disabled` antes de reclamar) → severity `ok`. Error de lectura →
 * `unknown` (degradación honesta).
 */

import { isReportEmailDeliveryEnabled } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_REPORT_EMAIL_FAILED_SIGNAL_ID = 'growth.ai_visibility.report_email_failed'

export const getGrowthAiVisibilityReportEmailSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()
  const enabled = isReportEmailDeliveryEnabled()

  try {
    const rows = await runGreenhousePostgresQuery<{ failed: number }>(
      `SELECT COUNT(*)::int AS failed
         FROM greenhouse_growth.grader_report_email_dispatches
        WHERE status = 'failed'
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
        signalId: GROWTH_AI_VISIBILITY_REPORT_EMAIL_FAILED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'drift',
        source: 'getGrowthAiVisibilityReportEmailSignals',
        label: 'Emails del informe del grader fallando',
        severity,
        summary: !enabled
          ? 'Email de entrega OFF: sin dispatches activos (esperado pre-launch).'
          : failed > 0
            ? `${failed} email(s) del informe en estado failed >15 min — entrega fallando persistentemente.`
            : 'Todos los emails del informe se entregaron correctamente.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'failed', value: String(failed) },
          { kind: 'metric', label: 'email_enabled', value: String(enabled) }
        ]
      }
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_growth_ai_visibility_report_email' }
    })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_REPORT_EMAIL_FAILED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'drift' as const,
        source: 'getGrowthAiVisibilityReportEmailSignals',
        label: 'Emails del informe del grader fallando',
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
