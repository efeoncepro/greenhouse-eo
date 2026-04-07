import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  materializeCommercialCostAttributionForPeriod,
  materializeAllAvailablePeriods
} from '@/lib/commercial-cost-attribution/member-period-attribution'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const year = body.year as number | undefined
    const month = body.month as number | undefined
    const recomputeEconomics = body.recomputeEconomics !== false

    const startMs = Date.now()
    let result: { periods: number; totalAllocations: number; economicsRecomputed: number }

    if (year && month) {
      // Single period
      const { replaced } = await materializeCommercialCostAttributionForPeriod(
        year, month, 'admin-trigger'
      )

      let economicsRecomputed = 0

      if (recomputeEconomics && replaced > 0) {
        const snapshots = await computeClientEconomicsSnapshots(year, month, 'admin-cost-attribution-refresh')

        economicsRecomputed = snapshots.length
      }

      result = { periods: 1, totalAllocations: replaced, economicsRecomputed }
    } else {
      // All periods
      const { periods, totalAllocations } = await materializeAllAvailablePeriods('admin-trigger-all')

      let economicsRecomputed = 0

      if (recomputeEconomics && totalAllocations > 0) {
        // Recompute economics for current + previous month
        const now = new Date()
        const currYear = now.getFullYear()
        const currMonth = now.getMonth() + 1
        const prevDate = new Date(currYear, currMonth - 2, 1)

        const [curr, prev] = await Promise.all([
          computeClientEconomicsSnapshots(currYear, currMonth, 'admin-cost-attribution-refresh'),
          computeClientEconomicsSnapshots(prevDate.getFullYear(), prevDate.getMonth() + 1, 'admin-cost-attribution-refresh-prev')
        ])

        economicsRecomputed = curr.length + prev.length
      }

      result = { periods, totalAllocations, economicsRecomputed }
    }

    const durationMs = Date.now() - startMs

    return NextResponse.json({
      ...result,
      durationMs
    })
  } catch (error) {
    console.error('[cost-attribution-materialize] Admin trigger failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
