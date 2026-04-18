import { NextResponse } from 'next/server'

import { updateCampaign } from '@/lib/campaigns/campaign-store'
import { getCampaignForTenant } from '@/lib/campaigns/tenant-scope'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

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

    return NextResponse.json(access.campaign)
  } catch (error) {
    console.error('GET /api/agency/campaigns/[campaignId] failed:', error)

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
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { campaignId } = await params
    const body = await request.json()
    const access = await getCampaignForTenant({ tenant, campaignId })

    if (!access.ok && access.reason === 'not_found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await updateCampaign(campaignId, body)

    if (!updated) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/agency/campaigns/[campaignId] failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
