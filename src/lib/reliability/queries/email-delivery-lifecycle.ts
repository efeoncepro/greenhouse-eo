import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

type EmailLifecycleHealthRow = {
  stale_token_intent_15m: number
  webhook_pending_15m: number
  webhook_dead_letter_24h: number
  lifecycle_missing_24h: number
  terminal_outcome_pending_24h: number
  provider_failure_24h: number
}

export const EMAIL_DELIVERY_LIFECYCLE_SIGNAL_ID = 'email.delivery.lifecycle_health'

export const getEmailDeliveryLifecycleSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<EmailLifecycleHealthRow>(
      `SELECT
         (SELECT COUNT(*)::int
            FROM greenhouse_notifications.email_deliveries
           WHERE email_type IN ('hiring_assessment_assigned','hiring_talent_pool_verification')
             AND status='pending'
             AND resend_id IS NULL
             AND delivery_payload->'persistence'->>'mode'='token_sensitive'
             AND created_at < NOW() - INTERVAL '15 minutes') AS stale_token_intent_15m,

         (SELECT COUNT(*)::int
            FROM greenhouse_notifications.email_provider_events
           WHERE event_source = 'webhook'
             AND processing_status = 'pending'
             AND first_received_at < NOW() - INTERVAL '15 minutes') AS webhook_pending_15m,

         (SELECT COUNT(*)::int
            FROM greenhouse_notifications.email_provider_events
           WHERE event_source = 'webhook'
             AND processing_status = 'dead_letter'
             AND dead_lettered_at > NOW() - INTERVAL '24 hours') AS webhook_dead_letter_24h,

         (SELECT COUNT(*)::int
            FROM greenhouse_notifications.email_deliveries
           WHERE resend_id IS NOT NULL
             AND status IN ('sent', 'delivered')
             AND created_at < NOW() - INTERVAL '24 hours'
             AND created_at > NOW() - INTERVAL '30 days'
             AND provider_status IS NULL) AS lifecycle_missing_24h,

         (SELECT COUNT(*)::int
            FROM greenhouse_notifications.email_deliveries
           WHERE resend_id IS NOT NULL
             AND status IN ('sent', 'delivered')
             AND created_at < NOW() - INTERVAL '24 hours'
             AND created_at > NOW() - INTERVAL '30 days'
             AND provider_status IN ('sent', 'delivery_delayed')) AS terminal_outcome_pending_24h,

         (SELECT COUNT(*)::int
            FROM greenhouse_notifications.email_deliveries
           WHERE failed_at > NOW() - INTERVAL '24 hours'
              OR bounced_at > NOW() - INTERVAL '24 hours'
              OR complained_at > NOW() - INTERVAL '24 hours'
              OR suppressed_at > NOW() - INTERVAL '24 hours'
              OR (
                provider_status_source = 'reconciliation'
                AND provider_observed_at > NOW() - INTERVAL '24 hours'
                AND provider_status IN ('failed', 'bounced', 'complained', 'suppressed')
              )) AS provider_failure_24h`
    )

    const row = rows[0] ?? {
      stale_token_intent_15m: 0,
      webhook_pending_15m: 0,
      webhook_dead_letter_24h: 0,
      lifecycle_missing_24h: 0,
      terminal_outcome_pending_24h: 0,
      provider_failure_24h: 0
    }

    const staleTokenIntents = Number(row.stale_token_intent_15m)
    const webhookPending = Number(row.webhook_pending_15m)
    const webhookDeadLetter = Number(row.webhook_dead_letter_24h)
    const lifecycleMissing = Number(row.lifecycle_missing_24h)
    const terminalPending = Number(row.terminal_outcome_pending_24h)
    const providerFailures = Number(row.provider_failure_24h)

    const severity = webhookPending > 0 || webhookDeadLetter > 0
      ? 'error'
      : staleTokenIntents > 0 || lifecycleMissing > 0 || terminalPending > 0 || providerFailures > 0
        ? 'warning'
        : 'ok'

    const summary =
      webhookDeadLetter > 0
        ? `${webhookDeadLetter} evento(s) firmado(s) de Resend agotaron su presupuesto de proyección en 24 horas.`
        : webhookPending > 0
        ? `${webhookPending} evento(s) firmado(s) de Resend siguen pendientes de proyección por más de 15 minutos.`
        : staleTokenIntents > 0
          ? `${staleTokenIntents} intento(s) con credencial llevan más de 15 minutos sin confirmación local de despacho; requieren recuperación explícita.`
          : lifecycleMissing > 0
          ? `${lifecycleMissing} despacho(s) de los últimos 30 días no tienen lifecycle de proveedor después de 24 horas.`
          : terminalPending > 0
            ? `${terminalPending} despacho(s) tienen lifecycle confirmado, pero aún no un resultado terminal después de 24 horas.`
            : providerFailures > 0
              ? `${providerFailures} despacho(s) registraron fallo, rebote, queja o supresión del proveedor en 24 horas.`
              : 'El lifecycle global de correo no tiene eventos pendientes, gaps ni fallos recientes.'

    return {
      signalId: EMAIL_DELIVERY_LIFECYCLE_SIGNAL_ID,
      moduleKey: 'delivery',
      kind: 'data_quality',
      source: 'getEmailDeliveryLifecycleSignal',
      label: 'Lifecycle global de correo',
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'stale_token_intent_15m', value: String(staleTokenIntents) },
        { kind: 'metric', label: 'webhook_pending_15m', value: String(webhookPending) },
        { kind: 'metric', label: 'webhook_dead_letter_24h', value: String(webhookDeadLetter) },
        { kind: 'metric', label: 'lifecycle_missing_24h', value: String(lifecycleMissing) },
        { kind: 'metric', label: 'terminal_outcome_pending_24h', value: String(terminalPending) },
        { kind: 'metric', label: 'provider_failure_24h', value: String(providerFailures) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', { tags: { source: 'email_delivery_lifecycle_health' } })

    return {
      signalId: EMAIL_DELIVERY_LIFECYCLE_SIGNAL_ID,
      moduleKey: 'delivery',
      kind: 'data_quality',
      source: 'getEmailDeliveryLifecycleSignal',
      label: 'Lifecycle global de correo',
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar el lifecycle global de correo.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
    }
  }
}
