import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'

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

    // Materialize current month
    const currentResults = await computeClientEconomicsSnapshots(year, month, 'cron-materialize')

    // Also materialize previous month (catches late entries)
    const prevDate = new Date(year, month - 2, 1)

    const prevResults = await computeClientEconomicsSnapshots(
      prevDate.getFullYear(),
      prevDate.getMonth() + 1,
      'cron-materialize-prev'
    )

    const durationMs = Date.now() - startMs

    console.log(
      `[economics-materialize] current=${currentResults.length} prev=${prevResults.length} ${durationMs}ms`
    )

    return NextResponse.json({
      currentMonth: { year, month, snapshots: currentResults.length },
      previousMonth: { year: prevDate.getFullYear(), month: prevDate.getMonth() + 1, snapshots: prevResults.length },
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
