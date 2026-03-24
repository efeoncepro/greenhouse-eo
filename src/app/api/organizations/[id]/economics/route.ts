import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import {
  getOrganizationEconomics,
  getOrganizationEconomicsTrend,
  getOrganizationProfitabilityBreakdown,
  getOrganizationIcoSummary
} from '@/lib/account-360/organization-economics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/{id}/economics?year=2026&month=3&trend=6
 *
 * Returns unified economics for an organization:
 * - Current period: revenue, labor cost, adjusted margin, FTE
 * - Optional trend: N months of historical economics
 * - Profitability breakdown per client
 * - ICO health summary (if available)
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)

  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1
  const trendMonths = Math.min(12, Math.max(0, Number(searchParams.get('trend')) || 0))

  try {
    // Fetch current period economics + breakdown in parallel
    const [current, breakdown, ico] = await Promise.all([
      getOrganizationEconomics(id, year, month),
      getOrganizationProfitabilityBreakdown(id, year, month),
      getOrganizationIcoSummary(id, year, month)
    ])

    // Optional trend
    const trend = trendMonths > 0
      ? await getOrganizationEconomicsTrend(id, trendMonths)
      : null

    return NextResponse.json({
      current,
      breakdown,
      ico,
      trend
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute organization economics'

    console.error('[organization-economics]', message, error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
