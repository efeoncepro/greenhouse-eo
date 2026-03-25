import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getCampaignMetrics } from '@/lib/campaigns/campaign-metrics'

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

    // Campaign subset enforcement
    if (tenant.campaignScopes.length > 0 && !tenant.campaignScopes.includes(campaignId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const metrics = await getCampaignMetrics(campaignId)

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('GET /api/campaigns/[campaignId]/metrics failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
