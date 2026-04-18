import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runQuotationLifecycleSweep } from '@/lib/commercial-intelligence/renewal-lifecycle'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * TASK-351 — Daily quotation lifecycle sweep.
 *
 * - Flips quotations past `expiry_date` to status='expired' and publishes
 *   `commercial.quotation.expired`.
 * - Emits `commercial.quotation.renewal_due` for open quotes within the
 *   renewal lookahead window, deduplicated by the reminder cadence table.
 *
 * Triggered by Cloud Scheduler daily at 07:00 Santiago. Also wired as a Vercel
 * fallback / manual trigger.
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  try {
    const result = await runQuotationLifecycleSweep()

    return NextResponse.json({
      ok: true,
      expiredCount: result.expiredCount,
      renewalDueCount: result.renewalDueCount,
      quotationsProcessed: result.quotationsProcessed
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await alertCronFailure('quotation-lifecycle', message).catch(() => undefined)

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
