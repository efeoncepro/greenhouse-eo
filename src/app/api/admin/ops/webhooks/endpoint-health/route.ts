import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { acknowledgeWebhookDeadLetters, type WebhookEndpointHealthState } from '@/lib/webhooks/endpoint-health'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface UnhealthyEndpointRow extends Record<string, unknown> {
  webhook_subscription_id: string
  current_state: WebhookEndpointHealthState
  consecutive_failures: number
  active_dead_letter_count: number
  total_dead_letter_count: number
  last_failure_at: string | null
  last_http_status: number | null
  last_error_message: string | null
}

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const endpoints = await runGreenhousePostgresQuery<UnhealthyEndpointRow>(
    `SELECT webhook_subscription_id,
            current_state,
            consecutive_failures,
            active_dead_letter_count,
            total_dead_letter_count,
            last_failure_at::text AS last_failure_at,
            last_http_status,
            last_error_message
       FROM greenhouse_sync.webhook_endpoint_health
      WHERE current_state <> 'healthy'
      ORDER BY active_dead_letter_count DESC, last_failure_at DESC NULLS LAST`
  )

  return NextResponse.json({ endpoints })
}

interface AckRequestBody {
  webhookSubscriptionId?: string
  resolutionNote?: string
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AckRequestBody

  try {
    body = (await request.json()) as AckRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subscriptionId = body.webhookSubscriptionId?.trim()

  if (!subscriptionId) {
    return NextResponse.json({ error: 'webhookSubscriptionId is required' }, { status: 400 })
  }

  const acknowledgedBy = tenant.identityProfileId ?? tenant.userId

  const result = await acknowledgeWebhookDeadLetters({
    webhookSubscriptionId: subscriptionId,
    acknowledgedBy,
    resolutionNote: body.resolutionNote ?? null
  })

  return NextResponse.json({
    webhookSubscriptionId: subscriptionId,
    acknowledgedBy,
    acknowledgedRows: result.acknowledgedRows,
    newState: result.newState
  })
}
