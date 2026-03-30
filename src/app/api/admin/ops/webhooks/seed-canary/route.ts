import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { buildCanaryTargetUrl } from '@/lib/webhooks/canary-target'
import { resolveWebhookBaseUrl } from '@/lib/webhooks/target-url'

export const dynamic = 'force-dynamic'

const CANARY_SUBSCRIPTION_ID = 'wh-sub-canary'
const CANARY_SUBSCRIBER_CODE = 'greenhouse-canary'

/**
 * Seeds the first webhook subscription — an internal canary that validates
 * the outbox → dispatch → delivery pipeline end-to-end.
 *
 * The subscription targets `/api/internal/webhooks/canary` on the same
 * deployment, matching `finance.income.nubox_synced`, which is active and
 * low-risk in the current staging baseline.
 *
 * Idempotent: re-running activates the existing subscription if paused.
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = resolveWebhookBaseUrl({ request })

  const targetUrl = buildCanaryTargetUrl({ baseUrl })

  // Upsert canary subscription — idempotent
  const rows = await runGreenhousePostgresQuery<{ webhook_subscription_id: string; created: boolean } & Record<string, unknown>>(
    `INSERT INTO greenhouse_sync.webhook_subscriptions (
       webhook_subscription_id, subscriber_code, target_url, auth_mode, secret_ref,
       event_filters_json, active, created_at, updated_at
     ) VALUES (
       $1, $2, $3, 'hmac_sha256', 'WEBHOOK_CANARY_SECRET',
       '[{"event_type": "finance.income.nubox_synced"}]'::jsonb,
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
    eventFilters: ['finance.income.nubox_synced'],
    action: isNew ? 'created' : 'reactivated',
    note: 'The webhook-dispatch cron (*/2 min) will start delivering matched events on next cycle.'
  })
}
