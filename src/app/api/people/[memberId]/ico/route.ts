import { NextResponse } from 'next/server'

import { assertMemberInPeopleOrganizationScope, resolvePeopleOrganizationScope } from '@/lib/people/organization-scope'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { readMemberMetrics, computeMetricsByContext } from '@/lib/ico-engine/read-metrics'
import { toIcoEngineErrorResponse } from '@/lib/ico-engine/shared'
import { readPersonIcoSnapshot } from '@/lib/person-360/get-person-ico-profile'

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
    const organizationId = resolvePeopleOrganizationScope(request, tenant)

    if (!Number.isInteger(periodYear) || periodYear < 2024 || periodYear > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    await assertMemberInPeopleOrganizationScope(memberId, organizationId)

    if (organizationId) {
      const scoped = await readPersonIcoSnapshot(memberId, periodYear, periodMonth, { organizationId })

      if (!scoped) {
        return NextResponse.json(
          { error: 'No task data found for this person, organization, and period' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        dimension: 'member',
        dimensionValue: memberId,
        dimensionLabel: null,
        periodYear: scoped.periodYear,
        periodMonth: scoped.periodMonth,
        metrics: [
          { metricId: 'rpa', value: scoped.rpaAvg, zone: null },
          { metricId: 'otd_pct', value: scoped.otdPct, zone: null },
          { metricId: 'ftr_pct', value: scoped.ftrPct, zone: null },
          { metricId: 'cycle_time', value: scoped.cycleTimeAvgDays, zone: null },
          { metricId: 'cycle_time_variance', value: scoped.cycleTimeVariance, zone: null },
          { metricId: 'throughput', value: scoped.throughputCount, zone: null },
          { metricId: 'pipeline_velocity', value: scoped.pipelineVelocity, zone: null },
          { metricId: 'stuck_assets', value: scoped.stuckAssetCount, zone: null },
          { metricId: 'stuck_asset_pct', value: scoped.stuckAssetPct, zone: null }
        ],
        cscDistribution: [],
        context: {
          totalTasks: scoped.totalTasks ?? 0,
          completedTasks: scoped.completedTasks ?? 0,
          activeTasks: scoped.activeTasks ?? 0,
          onTimeTasks: scoped.onTimeCount ?? 0,
          lateDropTasks: scoped.lateDropCount ?? 0,
          overdueTasks: scoped.overdueCount ?? 0,
          carryOverTasks: scoped.carryOverCount ?? 0
        },
        computedAt: null,
        engineVersion: 'v2.0.0-person-intelligence',
        source: 'live'
      })
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
