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

    // Step 1: Materialize commercial cost attribution (labor costs → clients)
    // This populates greenhouse_serving.commercial_cost_attribution from
    // member_capacity_economics + client_labor_cost_allocation
    const costAttrStart = Date.now()

    await Promise.all([
      materializeCommercialCostAttributionForPeriod(year, month, 'cron-materialize'),
      materializeCommercialCostAttributionForPeriod(prevDate.getFullYear(), prevDate.getMonth() + 1, 'cron-materialize-prev')
    ])

    const costAttrMs = Date.now() - costAttrStart

    // Step 2: Compute client economics snapshots (reads materialized cost attribution)
    const currentResults = await computeClientEconomicsSnapshots(year, month, 'cron-materialize')

    const prevResults = await computeClientEconomicsSnapshots(
      prevDate.getFullYear(),
      prevDate.getMonth() + 1,
      'cron-materialize-prev'
    )

    const durationMs = Date.now() - startMs

    console.log(
      `[economics-materialize] costAttr=${costAttrMs}ms current=${currentResults.length} prev=${prevResults.length} total=${durationMs}ms`
    )

    return NextResponse.json({
      currentMonth: { year, month, snapshots: currentResults.length },
      previousMonth: { year: prevDate.getFullYear(), month: prevDate.getMonth() + 1, snapshots: prevResults.length },
      costAttributionMs: costAttrMs,
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
