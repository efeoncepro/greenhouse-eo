import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { readProjectMetrics } from '@/lib/ico-engine/read-metrics'
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

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId is required' }, { status: 400 })
    }

    const periodYear = Number(searchParams.get('year') || new Date().getFullYear())
    const periodMonth = Number(searchParams.get('month') || new Date().getMonth() + 1)

    if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    const projects = await readProjectMetrics(spaceId, periodYear, periodMonth)

    return NextResponse.json({
      periodYear,
      periodMonth,
      spaceId,
      projects,
      totalProjects: projects.length
    })
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read project-level ICO metrics')
  }
}
