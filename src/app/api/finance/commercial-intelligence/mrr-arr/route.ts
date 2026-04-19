import { NextResponse } from 'next/server'

import {
  getMrrArrPeriodTotals,
  listMrrArrByPeriod,
  type MrrArrFilters
} from '@/lib/commercial-intelligence/mrr-arr-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-462 — GET /api/finance/commercial-intelligence/mrr-arr
 *
 * Returns tenant-scoped MRR/ARR snapshots and totals for a given period.
 * Query params:
 *   year (required) — 4-digit year
 *   month (required) — 1..12
 *   clientId, businessLineCode, commercialModel, staffingModel (optional filters)
 *
 * Response: { period, totals, items, count }
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const yearRaw = searchParams.get('year')
  const monthRaw = searchParams.get('month')

  const now = new Date()
  const year = yearRaw ? Number(yearRaw) : now.getUTCFullYear()
  const month = monthRaw ? Number(monthRaw) : now.getUTCMonth() + 1

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  const filters: MrrArrFilters = {
    spaceId: tenant.spaceId ?? null,
    clientId: searchParams.get('clientId') || null,
    businessLineCode: searchParams.get('businessLineCode') || null,
    commercialModel: searchParams.get('commercialModel') || null,
    staffingModel: searchParams.get('staffingModel') || null
  }

  const [items, totals] = await Promise.all([
    listMrrArrByPeriod({ year, month, filters }),
    getMrrArrPeriodTotals({ year, month, filters })
  ])

  return NextResponse.json({
    period: { year, month },
    totals,
    items,
    count: items.length
  })
}
