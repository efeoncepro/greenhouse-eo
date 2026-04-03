import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { createOrRenewSubscription } from '@/lib/entra/webhook-subscription'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  const startMs = Date.now()

  try {
    const result = await createOrRenewSubscription()
    const durationMs = Date.now() - startMs

    console.log(
      `[entra-webhook-renew] ${result.action} subscription=${result.subscription.id} expires=${result.subscription.expirationDateTime} duration=${durationMs}ms`
    )

    return NextResponse.json({
      action: result.action,
      subscriptionId: result.subscription.id,
      expirationDateTime: result.subscription.expirationDateTime,
      durationMs
    })
  } catch (error) {
    const durationMs = Date.now() - startMs

    console.error('[entra-webhook-renew] Failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error', durationMs },
      { status: 500 }
    )
  }
}
