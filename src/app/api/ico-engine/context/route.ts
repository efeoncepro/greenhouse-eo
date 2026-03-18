import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { computeMetricsByContext, readMemberMetrics } from '@/lib/ico-engine/read-metrics'
import { ICO_DIMENSIONS, type IcoDimensionKey, toIcoEngineErrorResponse } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

/**
 * Generic ICO context endpoint.
 *
 * GET /api/ico-engine/context?dimension=space&value=spc-xxx&year=2026&month=3
 * GET /api/ico-engine/context?dimension=member&value=mem-xxx&year=2026&month=3
 * GET /api/ico-engine/context?dimension=project&value=proj-xxx&year=2026&month=3
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureIcoEngineInfrastructure()

    const { searchParams } = new URL(request.url)
    const dimension = searchParams.get('dimension') as IcoDimensionKey | null
    const value = searchParams.get('value')
    const periodYear = Number(searchParams.get('year') || new Date().getFullYear())
    const periodMonth = Number(searchParams.get('month') || new Date().getMonth() + 1)

    if (!dimension || !(dimension in ICO_DIMENSIONS)) {
      return NextResponse.json(
        { error: `Invalid dimension. Valid: ${Object.keys(ICO_DIMENSIONS).join(', ')}` },
        { status: 400 }
      )
    }

    if (!value) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 })
    }

    if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    // Try materialized cache first for supported dimensions
    if (dimension === 'member') {
      const cached = await readMemberMetrics(value, periodYear, periodMonth)

      if (cached) return NextResponse.json(cached)
    }

    // Fall back to live compute
    const result = await computeMetricsByContext(dimension, value, periodYear, periodMonth)

    if (!result) {
      return NextResponse.json(
        { error: 'No task data found for this dimension and period' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to compute ICO context metrics')
  }
}
