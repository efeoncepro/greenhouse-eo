import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { listCampaigns, createCampaign } from '@/lib/campaigns/campaign-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined

  // Client users: filter by their space + campaign_subset
  // Internal users: filter by spaceId param or show all
  const spaceId = tenant.tenantType === 'client'
    ? tenant.clientId
    : searchParams.get('spaceId') || ''

  if (!spaceId) {
    return NextResponse.json({ error: 'spaceId is required' }, { status: 400 })
  }

  try {
    // Apply campaign_subset if user has restricted scopes
    const campaignIds = tenant.campaignScopes.length > 0 ? tenant.campaignScopes : undefined

    const campaigns = await listCampaigns(spaceId, { status, campaignIds })

    return NextResponse.json({ items: campaigns, total: campaigns.length })
  } catch (error) {
    console.error('GET /api/campaigns failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only internal users can create campaigns
  if (!tenant.routeGroups.includes('internal') && !tenant.roleCodes.includes('efeonce_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    if (!body.spaceId || !body.displayName) {
      return NextResponse.json({ error: 'spaceId and displayName are required' }, { status: 400 })
    }

    const campaign = await createCampaign({
      spaceId: body.spaceId,
      displayName: body.displayName,
      description: body.description,
      campaignType: body.campaignType,
      status: body.status,
      plannedStartDate: body.plannedStartDate,
      plannedEndDate: body.plannedEndDate,
      plannedLaunchDate: body.plannedLaunchDate,
      ownerUserId: body.ownerUserId || tenant.userId,
      createdByUserId: tenant.userId,
      tags: body.tags,
      channels: body.channels,
      notes: body.notes,
      budgetClp: body.budgetClp,
      currency: body.currency
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
