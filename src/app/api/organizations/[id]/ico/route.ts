import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationDetail } from '@/lib/account-360/organization-store'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { readSpaceMetrics, computeSpaceMetricsLive } from '@/lib/ico-engine/read-metrics'
import type { SpaceMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import { toIcoEngineErrorResponse } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/{id}/ico?year=2026&month=3
 *
 * Returns ICO Engine metrics for all active spaces belonging to this organization.
 * Tries materialized snapshots first, falls back to live compute.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const detail = await getOrganizationDetail(id)

    if (!detail) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    await ensureIcoEngineInfrastructure()

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const periodYear = Number(searchParams.get('year')) || now.getFullYear()
    const periodMonth = Number(searchParams.get('month')) || now.getMonth() + 1

    // Collect active spaces with a spaceId
    const activeSpaces = (detail.spaces ?? []).filter(s => s.status === 'active' && s.spaceId)

    if (activeSpaces.length === 0) {
      return NextResponse.json({
        periodYear,
        periodMonth,
        spaces: [],
        totalSpaces: 0
      })
    }

    // Fetch metrics for each space in parallel (materialized → live fallback)
    const snapshots = await Promise.all(
      activeSpaces.map(async (space): Promise<SpaceMetricSnapshot | null> => {
        const snapshot = await readSpaceMetrics(space.spaceId, periodYear, periodMonth)

        if (snapshot) return snapshot

        // Fall back to live compute
        return computeSpaceMetricsLive(space.spaceId, periodYear, periodMonth)
      })
    )

    const spaces = snapshots.filter((s): s is SpaceMetricSnapshot => s !== null)

    return NextResponse.json({
      periodYear,
      periodMonth,
      spaces,
      totalSpaces: activeSpaces.length
    })
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read organization ICO metrics')
  }
}
