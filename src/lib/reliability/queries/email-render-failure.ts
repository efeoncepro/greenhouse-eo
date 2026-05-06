import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-408 Slice 4 — Reliability signal: email render/template failures.
 *
 * Steady state esperado = 0. Este reader cuenta fallas de render/template en
 * las ultimas 24h usando las dos fuentes canonicas del runtime actual:
 *
 * 1. `greenhouse_notifications.email_deliveries` — audit del email engine.
 * 2. `greenhouse_sync.outbox_reactive_log` — failures de projections reactivas
 *    que envian emails/notificaciones.
 *
 * La spec inicial apuntaba a `outbox_events.last_error`, pero TASK-773 movio el
 * contrato real a `last_publish_error` para publisher PG -> BQ; los errores de
 * render de emails no viven ahi. Consultar estas fuentes evita una senal verde
 * falsa justo cuando un template migrado se rompe.
 */
export const EMAIL_RENDER_FAILURE_SIGNAL_ID = 'notifications.email.render_failure_rate'

const QUERY_SQL = `
  WITH delivery_window AS (
    SELECT
      COUNT(*)::int AS total_attempts,
      (COUNT(*) FILTER (
        WHERE status = 'failed'
          AND (
            error_class = 'template_error'
            OR COALESCE(error_message, '') ILIKE ANY (
              ARRAY[
                '%render%',
                '%template%',
                '%No email template registered%',
                '%Objects are not valid as a React child%'
              ]
            )
          )
      ))::int AS delivery_render_failures
    FROM greenhouse_notifications.email_deliveries
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  ),
  reactive_window AS (
    SELECT COUNT(*)::int AS reactive_render_failures
    FROM greenhouse_sync.outbox_reactive_log r
    WHERE r.reacted_at >= NOW() - INTERVAL '24 hours'
      AND r.result IN ('retry', 'dead-letter')
      AND r.handler LIKE ANY (
        ARRAY[
          'notification_dispatch:%',
          'payment_profile_notifications:%',
          'payroll_receipts_delivery:%',
          'payroll_export_ready_notification:%',
          'pricing_catalog_approval_notifier:%',
          'payslip_on_payment_%:%'
        ]
      )
      AND COALESCE(r.last_error, '') ILIKE ANY (
        ARRAY[
          '%render%',
          '%template%',
          '%No email template registered%',
          '%Objects are not valid as a React child%'
        ]
      )
  )
  SELECT
    delivery_window.total_attempts,
    delivery_window.delivery_render_failures,
    reactive_window.reactive_render_failures,
    (
      delivery_window.delivery_render_failures
      + reactive_window.reactive_render_failures
    )::int AS total_render_failures
  FROM delivery_window
  CROSS JOIN reactive_window
`

interface EmailRenderFailureRow extends Record<string, unknown> {
  total_attempts: number
  delivery_render_failures: number
  reactive_render_failures: number
  total_render_failures: number
}

export const getEmailRenderFailureSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<EmailRenderFailureRow>(QUERY_SQL)
    const row = rows[0]
    const totalAttempts = Number(row?.total_attempts ?? 0)
    const deliveryRenderFailures = Number(row?.delivery_render_failures ?? 0)
    const reactiveRenderFailures = Number(row?.reactive_render_failures ?? 0)
    const totalRenderFailures = Number(row?.total_render_failures ?? 0)
    const failureRate = totalAttempts > 0 ? (deliveryRenderFailures / totalAttempts) * 100 : 0

    return {
      signalId: EMAIL_RENDER_FAILURE_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'runtime',
      source: 'getEmailRenderFailureSignal',
      label: 'Email render failures (24h)',
      severity: totalRenderFailures === 0 ? 'ok' : 'error',
      summary:
        totalRenderFailures === 0
          ? 'Sin fallas de render/template en emails durante las ultimas 24h.'
          : `${totalRenderFailures} falla${totalRenderFailures === 1 ? '' : 's'} de render/template en emails durante las ultimas 24h. Revisar templates migrados y projections reactivas antes de avanzar mas copy.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'email_deliveries failed template/render + outbox_reactive_log email projection retry/dead-letter, rolling 24h'
        },
        {
          kind: 'metric',
          label: 'total_render_failures',
          value: String(totalRenderFailures)
        },
        {
          kind: 'metric',
          label: 'delivery_render_failures',
          value: String(deliveryRenderFailures)
        },
        {
          kind: 'metric',
          label: 'reactive_render_failures',
          value: String(reactiveRenderFailures)
        },
        {
          kind: 'metric',
          label: 'delivery_failure_rate_percent',
          value: failureRate.toFixed(2)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-408-copy-migration-notifications-emails.md (slice 4)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'sync', {
      tags: { source: 'reliability_signal_email_render_failure' }
    })

    return {
      signalId: EMAIL_RENDER_FAILURE_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'runtime',
      source: 'getEmailRenderFailureSignal',
      label: 'Email render failures (24h)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de render de emails. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
