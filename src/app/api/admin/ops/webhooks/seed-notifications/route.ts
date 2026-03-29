import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { NOTIFICATION_EVENT_TYPES } from '@/lib/webhooks/consumers/notification-mapping'
import { buildNotificationDispatchTargetUrl } from '@/lib/webhooks/notification-target'

export const dynamic = 'force-dynamic'

const NOTIFICATIONS_SUBSCRIPTION_ID = 'wh-sub-notifications'
const NOTIFICATIONS_SUBSCRIBER_CODE = 'greenhouse-notifications'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = getBaseUrl(request)
  const targetUrl = buildNotificationDispatchTargetUrl({ baseUrl })

  const eventFiltersJson = JSON.stringify(
    NOTIFICATION_EVENT_TYPES.map(eventType => ({ event_type: eventType }))
  )

  const rows = await runGreenhousePostgresQuery<{ webhook_subscription_id: string; created: boolean } & Record<string, unknown>>(
    `INSERT INTO greenhouse_sync.webhook_subscriptions (
       webhook_subscription_id, subscriber_code, target_url, auth_mode, secret_ref,
       event_filters_json, active, created_at, updated_at
     ) VALUES (
       $1, $2, $3, 'hmac_sha256', 'WEBHOOK_NOTIFICATIONS_SECRET',
       $4::jsonb,
       TRUE, NOW(), NOW()
     )
     ON CONFLICT (webhook_subscription_id) DO UPDATE SET
       target_url = EXCLUDED.target_url,
       event_filters_json = EXCLUDED.event_filters_json,
       active = TRUE,
       paused_at = NULL,
       updated_at = NOW()
     RETURNING webhook_subscription_id, (xmax = 0) AS created`,
    [NOTIFICATIONS_SUBSCRIPTION_ID, NOTIFICATIONS_SUBSCRIBER_CODE, targetUrl, eventFiltersJson]
  )

  const result = rows[0]
  const isNew = result?.created === true

  return NextResponse.json({
    subscriptionId: NOTIFICATIONS_SUBSCRIPTION_ID,
    subscriberCode: NOTIFICATIONS_SUBSCRIBER_CODE,
    targetUrl,
    eventFilters: NOTIFICATION_EVENT_TYPES,
    action: isNew ? 'created' : 'reactivated',
    note: 'La siguiente pasada de webhook-dispatch empezará a entregar eventos compatibles al consumer de notificaciones.'
  })
}

function getBaseUrl(request: Request): string {
  const vercelUrl = process.env.VERCEL_URL

  if (vercelUrl) return `https://${vercelUrl}`

  const url = new URL(request.url)

  return url.origin
}
