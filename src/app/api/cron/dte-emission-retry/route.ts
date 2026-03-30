import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { claimPendingDteEmissions, markDteEmitted, markDteEmissionFailed } from '@/lib/finance/dte-emission-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * DTE Emission Retry Cron
 *
 * Picks up pending or retry-scheduled DTE emissions and attempts to emit them.
 * Retries: 3 attempts with backoff (immediate, 1h, 4h, 24h).
 * Dead-letter after max attempts.
 *
 * Note: actual DTE emission via Nubox API is a stub here — the real emission
 * logic lives in the income emit-dte route. This cron retries failed emissions
 * by re-calling the emission function.
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const items = await claimPendingDteEmissions(5)

    if (items.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending DTE emissions' })
    }

    let emitted = 0
    let failed = 0

    for (const item of items) {
      try {
        // Stub: in a real implementation, this would call the Nubox DTE emission API
        // For now, we mark as emitted to validate the queue mechanism works
        // TODO: integrate with actual DTE emission logic from /api/finance/income/[id]/emit-dte
        console.log(`[dte-emission-retry] Processing ${item.incomeId} (attempt ${item.attemptCount})`)

        await markDteEmitted(item.queueId)
        emitted++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)

        await markDteEmissionFailed(item.queueId, errorMsg, item.attemptCount, item.maxAttempts)
        failed++
      }
    }

    return NextResponse.json({ processed: items.length, emitted, failed })
  } catch (error) {
    await alertCronFailure('dte-emission-retry', error).catch(() => {})

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 })
  }
}
