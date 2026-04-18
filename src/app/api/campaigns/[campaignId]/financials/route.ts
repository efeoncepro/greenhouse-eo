import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getCampaignFinancials } from '@/lib/campaigns/campaign-extended'
import { getCampaignForTenant } from '@/lib/campaigns/tenant-scope'

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
    const access = await getCampaignForTenant({ tenant, campaignId })

    if (!access.ok && access.reason === 'not_found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const financials = await getCampaignFinancials(campaignId)

    return NextResponse.json(financials)
  } catch (error) {
    console.error('GET /api/campaigns/[campaignId]/financials failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
