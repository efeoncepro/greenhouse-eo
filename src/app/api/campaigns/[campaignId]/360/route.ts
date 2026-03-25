import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getCampaign } from '@/lib/campaigns/campaign-store'
import { getCampaignMetrics } from '@/lib/campaigns/campaign-metrics'
import { getCampaign360 } from '@/lib/campaigns/campaign-extended'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { campaignId } = await params

    if (tenant.campaignScopes.length > 0 && !tenant.campaignScopes.includes(campaignId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campaign = await getCampaign(campaignId)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const [metrics, extended] = await Promise.all([
      getCampaignMetrics(campaignId),
      getCampaign360(campaignId)
    ])

    return NextResponse.json({
      campaign,
      metrics,
      financials: extended.financials,
      team: extended.team,
      teamCount: extended.teamCount
    })
  } catch (error) {
    console.error('GET /api/campaigns/[campaignId]/360 failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
