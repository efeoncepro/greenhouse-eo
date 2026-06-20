import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { processDteEmissionRetryQueue } from '@/lib/finance/dte-emission-retry'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * DTE Emission Retry Cron
 *
 * Picks up pending or retry-scheduled DTE emissions and attempts to emit them.
 * Retries: 3 attempts with backoff (immediate, 1h, 4h, 24h).
 * Dead-letter after max attempts.
 *
 * Retries failed emissions by re-calling the canonical Nubox emission logic.
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await processDteEmissionRetryQueue(5)

    return NextResponse.json(result)
  } catch (error) {
    await alertCronFailure('dte-emission-retry', error).catch(() => {})

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 })
  }
}
