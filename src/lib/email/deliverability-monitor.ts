import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * TASK-775 Slice 2 — Lógica pura del email deliverability monitor.
 *
 * Calcula bounce rate y complaint rate de los últimos 7 días sobre
 * `greenhouse_notifications.email_deliveries`. Si excede thresholds Gmail
 * (2% bounces / 0.1% complaints), emite outbox events `email.deliverability.alert`
 * que el reactive consumer downstream toma para notificar al equipo.
 *
 * Reusable desde:
 *   - Vercel cron (legacy fallback): `src/app/api/cron/email-deliverability-monitor/route.ts`
 *   - Cloud Run ops-worker (canónico): `services/ops-worker/server.ts` (POST /email-deliverability-monitor)
 *
 * Ambos invocan esta función pura. Single source of truth — no duplicación.
 */

export const BOUNCE_RATE_THRESHOLD = 0.02   // 2% — Gmail recommendation
export const COMPLAINT_RATE_THRESHOLD = 0.001 // 0.1% — Gmail recommendation
export const MONITOR_WINDOW_DAYS = 7

export interface EmailDeliverabilityMonitorResult {
  totalSent: number
  hardBounces: number
  complaints: number
  bounceRate: number
  complaintRate: number
  alerts: string[]
  alertsTriggered: number
}

interface RateRow {
  total_sent: string
  hard_bounces: string
  complaints: string
}

export const runEmailDeliverabilityMonitor = async (): Promise<EmailDeliverabilityMonitorResult> => {
  const rows = await runGreenhousePostgresQuery<RateRow & Record<string, unknown>>(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::text AS total_sent,
      COUNT(*) FILTER (WHERE bounced_at IS NOT NULL AND bounced_at > NOW() - INTERVAL '7 days')::text AS hard_bounces,
      COUNT(*) FILTER (WHERE complained_at IS NOT NULL AND complained_at > NOW() - INTERVAL '7 days')::text AS complaints
    FROM greenhouse_notifications.email_deliveries
    WHERE created_at > NOW() - INTERVAL '7 days'
  `)

  const row = rows[0]
  const totalSent = Number(row?.total_sent ?? 0)
  const hardBounces = Number(row?.hard_bounces ?? 0)
  const complaints = Number(row?.complaints ?? 0)

  const bounceRate = totalSent > 0 ? hardBounces / totalSent : 0
  const complaintRate = totalSent > 0 ? complaints / totalSent : 0

  const alerts: string[] = []
  const detectedAt = new Date().toISOString()
  const monitorDayKey = detectedAt.slice(0, 10)

  if (bounceRate > BOUNCE_RATE_THRESHOLD) {
    alerts.push(`bounce_rate:${(bounceRate * 100).toFixed(2)}%`)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.emailDelivery,
      aggregateId: `deliverability-monitor-${monitorDayKey}`,
      eventType: EVENT_TYPES.emailDeliverabilityAlert,
      payload: {
        alertType: 'bounce_rate',
        bounceRate,
        hardBounces,
        totalSent,
        threshold: BOUNCE_RATE_THRESHOLD,
        windowDays: MONITOR_WINDOW_DAYS,
        detectedAt
      }
    })
  }

  if (complaintRate > COMPLAINT_RATE_THRESHOLD) {
    alerts.push(`complaint_rate:${(complaintRate * 100).toFixed(2)}%`)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.emailDelivery,
      aggregateId: `deliverability-monitor-${monitorDayKey}`,
      eventType: EVENT_TYPES.emailDeliverabilityAlert,
      payload: {
        alertType: 'complaint_rate',
        complaintRate,
        complaints,
        totalSent,
        threshold: COMPLAINT_RATE_THRESHOLD,
        windowDays: MONITOR_WINDOW_DAYS,
        detectedAt
      }
    })
  }

  return {
    totalSent,
    hardBounces,
    complaints,
    bounceRate: Number(bounceRate.toFixed(4)),
    complaintRate: Number(complaintRate.toFixed(4)),
    alerts,
    alertsTriggered: alerts.length
  }
}
