import { NextResponse } from 'next/server'

import {
  computeNrr,
  getMrrArrSeries,
  type MrrArrFilters
} from '@/lib/commercial-intelligence/mrr-arr-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-462 — GET /api/finance/commercial-intelligence/mrr-arr/timeline
 *
 * Returns MRR/ARR monthly series + NRR/GRR computation over the last N months.
 * Query params:
 *   months (default 12, max 60)
 *   clientId, businessLineCode, commercialModel, staffingModel (optional filters)
 *
 * Response: { series, nrr, range }
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthsRaw = searchParams.get('months')
  const months = monthsRaw ? Math.max(1, Math.min(60, Number(monthsRaw))) : 12

  if (!Number.isFinite(months)) {
    return NextResponse.json({ error: 'Invalid months parameter' }, { status: 400 })
  }

  const filters: MrrArrFilters = {
    spaceId: tenant.spaceId ?? null,
    clientId: searchParams.get('clientId') || null,
    businessLineCode: searchParams.get('businessLineCode') || null,
    commercialModel: searchParams.get('commercialModel') || null,
    staffingModel: searchParams.get('staffingModel') || null
  }

  const now = new Date()
  const endYear = now.getUTCFullYear()
  const endMonth = now.getUTCMonth() + 1

  const [series, nrr] = await Promise.all([
    getMrrArrSeries({ months, filters }),
    computeNrr({ endYear, endMonth, filters })
  ])

  return NextResponse.json({
    range: { months, endYear, endMonth },
    series,
    nrr
  })
}
