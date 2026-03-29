import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const CANARY_SUBSCRIPTION_ID = 'wh-sub-canary'
const CANARY_SUBSCRIBER_CODE = 'greenhouse-canary'

/**
 * Seeds the first webhook subscription — an internal canary that validates
 * the outbox → dispatch → delivery pipeline end-to-end.
 *
 * The subscription targets `/api/internal/webhooks/canary` on the same
 * deployment, matching all `assignment.*` events (high volume, low risk).
 *
 * Idempotent: re-running activates the existing subscription if paused.
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve the base URL from the request or Vercel env
  const baseUrl = getBaseUrl(request)

  const targetUrl = `${baseUrl}/api/internal/webhooks/canary`

  // Upsert canary subscription — idempotent
  const rows = await runGreenhousePostgresQuery<{ webhook_subscription_id: string; created: boolean } & Record<string, unknown>>(
    `INSERT INTO greenhouse_sync.webhook_subscriptions (
       webhook_subscription_id, subscriber_code, target_url, auth_mode, secret_ref,
       event_filters_json, active, created_at, updated_at
     ) VALUES (
       $1, $2, $3, 'hmac_sha256', 'WEBHOOK_CANARY_SECRET',
       '[{"event_type": "assignment.*"}, {"event_type": "member.*"}]'::jsonb,
       TRUE, NOW(), NOW()
     )
     ON CONFLICT (webhook_subscription_id) DO UPDATE SET
       target_url = EXCLUDED.target_url,
       active = TRUE,
       paused_at = NULL,
       updated_at = NOW()
     RETURNING webhook_subscription_id, (xmax = 0) AS created`,
    [CANARY_SUBSCRIPTION_ID, CANARY_SUBSCRIBER_CODE, targetUrl]
  )

  const result = rows[0]
  const isNew = result?.created === true

  return NextResponse.json({
    subscriptionId: CANARY_SUBSCRIPTION_ID,
    subscriberCode: CANARY_SUBSCRIBER_CODE,
    targetUrl,
    eventFilters: ['assignment.*', 'member.*'],
    action: isNew ? 'created' : 'reactivated',
    note: 'The webhook-dispatch cron (*/2 min) will start delivering matched events on next cycle.'
  })
}

function getBaseUrl(request: Request): string {
  // Use VERCEL_URL if available (includes protocol-less domain)
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`

  // Fallback to request origin
  const url = new URL(request.url)
  return url.origin
}
