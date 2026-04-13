import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BOUNCE_RATE_THRESHOLD = 0.02   // 2% — Gmail recommendation
const COMPLAINT_RATE_THRESHOLD = 0.001 // 0.1% — Gmail recommendation

interface RateRow {
  total_sent: string
  hard_bounces: string
  complaints: string
}

export async function POST(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const rows = await runGreenhousePostgresQuery<RateRow & Record<string, unknown>>(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::text AS total_sent,
        COUNT(*) FILTER (
          WHERE source_entity = 'email_delivery.undeliverable_marked'
            AND created_at > NOW() - INTERVAL '7 days'
        )::text AS hard_bounces,
        COUNT(*) FILTER (
          WHERE source_entity = 'email_delivery.complained'
            AND created_at > NOW() - INTERVAL '7 days'
        )::text AS complaints
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

    if (bounceRate > BOUNCE_RATE_THRESHOLD) {
      alerts.push(`bounce_rate:${(bounceRate * 100).toFixed(2)}%`)

      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.emailDelivery,
        aggregateId: `deliverability-monitor-${new Date().toISOString().slice(0, 10)}`,
        eventType: EVENT_TYPES.emailDeliverabilityAlert,
        payload: {
          alertType: 'bounce_rate',
          bounceRate,
          hardBounces,
          totalSent,
          threshold: BOUNCE_RATE_THRESHOLD,
          windowDays: 7,
          detectedAt: new Date().toISOString()
        }
      })
    }

    if (complaintRate > COMPLAINT_RATE_THRESHOLD) {
      alerts.push(`complaint_rate:${(complaintRate * 100).toFixed(2)}%`)

      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.emailDelivery,
        aggregateId: `deliverability-monitor-${new Date().toISOString().slice(0, 10)}`,
        eventType: EVENT_TYPES.emailDeliverabilityAlert,
        payload: {
          alertType: 'complaint_rate',
          complaintRate,
          complaints,
          totalSent,
          threshold: COMPLAINT_RATE_THRESHOLD,
          windowDays: 7,
          detectedAt: new Date().toISOString()
        }
      })
    }

    return NextResponse.json({
      ok: true,
      totalSent,
      hardBounces,
      complaints,
      bounceRate: Number(bounceRate.toFixed(4)),
      complaintRate: Number(complaintRate.toFixed(4)),
      alerts,
      alertsTriggered: alerts.length
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
