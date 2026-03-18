import { NextResponse } from 'next/server'

import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { readMemberMetrics, computeMetricsByContext } from '@/lib/ico-engine/read-metrics'
import { toIcoEngineErrorResponse } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureIcoEngineInfrastructure()

    const { memberId } = await params
    const { searchParams } = new URL(request.url)
    const periodYear = Number(searchParams.get('year') || new Date().getFullYear())
    const periodMonth = Number(searchParams.get('month') || new Date().getMonth() + 1)

    if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    // Try materialized cache first
    const cached = await readMemberMetrics(memberId, periodYear, periodMonth)

    if (cached) return NextResponse.json(cached)

    // Fall back to live compute
    const result = await computeMetricsByContext('member', memberId, periodYear, periodMonth)

    if (!result) {
      return NextResponse.json(
        { error: 'No task data found for this person and period' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read person ICO metrics')
  }
}
