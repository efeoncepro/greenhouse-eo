import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { materializeCommercialCostAttributionForPeriod } from '@/lib/commercial-cost-attribution/member-period-attribution'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const startMs = Date.now()
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const prevDate = new Date(year, month - 2, 1)

    // Step 1: Materialize commercial cost attribution (best-effort on Vercel).
    // The VIEW client_labor_cost_allocation is complex and may timeout on serverless
    // cold starts. If materialization fails, client_economics will still read from
    // whatever was previously materialized (by Cloud Run ops-worker or admin trigger).
    let costAttrMs = 0
    let costAttrStatus = 'ok'

    try {
      const costAttrStart = Date.now()

      await Promise.all([
        materializeCommercialCostAttributionForPeriod(year, month, 'cron-materialize'),
        materializeCommercialCostAttributionForPeriod(prevDate.getFullYear(), prevDate.getMonth() + 1, 'cron-materialize-prev')
      ])

      costAttrMs = Date.now() - costAttrStart
    } catch (error: unknown) {
      costAttrStatus = 'failed'

      console.error(
        '[economics-materialize] cost attribution materialization failed (best-effort, continuing):',
        error instanceof Error ? error.message : error
      )
    }

    // Step 2: Compute client economics snapshots.
    // Reads commercial cost from materialized table if available,
    // or falls back to on-the-fly compute (which may also fail on serverless).
    const currentResults = await computeClientEconomicsSnapshots(year, month, 'cron-materialize')

    const prevResults = await computeClientEconomicsSnapshots(
      prevDate.getFullYear(),
      prevDate.getMonth() + 1,
      'cron-materialize-prev'
    )

    const durationMs = Date.now() - startMs

    console.log(
      `[economics-materialize] costAttr=${costAttrStatus}(${costAttrMs}ms) current=${currentResults.length} prev=${prevResults.length} total=${durationMs}ms`
    )

    return NextResponse.json({
      currentMonth: { year, month, snapshots: currentResults.length },
      previousMonth: { year: prevDate.getFullYear(), month: prevDate.getMonth() + 1, snapshots: prevResults.length },
      costAttribution: { status: costAttrStatus, durationMs: costAttrMs },
      durationMs
    })
  } catch (error) {
    console.error('[economics-materialize] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
