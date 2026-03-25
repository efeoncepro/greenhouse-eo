import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getCampaign, updateCampaign } from '@/lib/campaigns/campaign-store'

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
    const campaign = await getCampaign(campaignId)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Campaign subset enforcement
    if (tenant.campaignScopes.length > 0 && !tenant.campaignScopes.includes(campaignId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('GET /api/campaigns/[campaignId] failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tenant.routeGroups.includes('internal') && !tenant.roleCodes.includes('efeonce_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { campaignId } = await params
    const body = await request.json()

    const updated = await updateCampaign(campaignId, body)

    if (!updated) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/campaigns/[campaignId] failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
