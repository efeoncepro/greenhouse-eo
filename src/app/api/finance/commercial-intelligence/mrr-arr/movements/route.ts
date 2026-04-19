import { NextResponse } from 'next/server'

import {
  MRR_ARR_MOVEMENT_TYPES,
  type MrrArrMovementType
} from '@/lib/commercial-intelligence/contracts'
import {
  listMrrArrMovements,
  type MrrArrFilters
} from '@/lib/commercial-intelligence/mrr-arr-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-462 — GET /api/finance/commercial-intelligence/mrr-arr/movements
 *
 * Returns drill-down list of contracts whose MRR moved in the given period.
 * Query params:
 *   year (required), month (required)
 *   movementType (optional — 'new' | 'expansion' | 'contraction' | 'churn' | 'reactivation' | 'unchanged')
 *     When omitted, excludes 'unchanged' rows.
 *   clientId, businessLineCode, commercialModel, staffingModel (optional filters)
 *
 * Response: { period, movementType, items, count }
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

  const movementTypeRaw = searchParams.get('movementType')
  let movementType: MrrArrMovementType | undefined

  if (movementTypeRaw) {
    if (!MRR_ARR_MOVEMENT_TYPES.includes(movementTypeRaw as MrrArrMovementType)) {
      return NextResponse.json({ error: 'Invalid movementType' }, { status: 400 })
    }

    movementType = movementTypeRaw as MrrArrMovementType
  }

  const filters: MrrArrFilters = {
    spaceId: tenant.spaceId ?? null,
    clientId: searchParams.get('clientId') || null,
    businessLineCode: searchParams.get('businessLineCode') || null,
    commercialModel: searchParams.get('commercialModel') || null,
    staffingModel: searchParams.get('staffingModel') || null
  }

  const items = await listMrrArrMovements({ year, month, filters, movementType })

  return NextResponse.json({
    period: { year, month },
    movementType: movementType ?? null,
    items,
    count: items.length
  })
}
