import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { readSpaceMetrics, computeSpaceMetricsLive } from '@/lib/ico-engine/read-metrics'
import { toIcoEngineErrorResponse } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureIcoEngineInfrastructure()

    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('spaceId')
    const periodYear = Number(searchParams.get('year') || new Date().getFullYear())
    const periodMonth = Number(searchParams.get('month') || new Date().getMonth() + 1)
    const live = searchParams.get('live') === 'true'

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId is required' }, { status: 400 })
    }

    if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    // Try materialized snapshot first, fall back to live compute
    if (!live) {
      const snapshot = await readSpaceMetrics(spaceId, periodYear, periodMonth)

      if (snapshot) {
        return NextResponse.json(snapshot)
      }
    }

    // Live compute from enriched view
    const liveResult = await computeSpaceMetricsLive(spaceId, periodYear, periodMonth)

    if (!liveResult) {
      return NextResponse.json(
        { error: 'No task data found for this space and period' },
        { status: 404 }
      )
    }

    return NextResponse.json(liveResult)
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read ICO metrics')
  }
}
