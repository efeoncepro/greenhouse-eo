import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { listCampaignProjects, addProjectToCampaign, getCampaign } from '@/lib/campaigns/campaign-store'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { campaignId } = await params
    const projects = await listCampaignProjects(campaignId)

    return NextResponse.json({ items: projects, total: projects.length })
  } catch (error) {
    console.error('GET /api/campaigns/[campaignId]/projects failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tenant.routeGroups.includes('internal') && !tenant.roleCodes.includes('efeonce_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { campaignId } = await params
    const body = await request.json()

    if (!body.projectSourceId) {
      return NextResponse.json({ error: 'projectSourceId is required' }, { status: 400 })
    }

    const campaign = await getCampaign(campaignId)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const link = await addProjectToCampaign({
      campaignId,
      spaceId: campaign.spaceId,
      projectSourceId: body.projectSourceId,
      projectSourceSystem: body.projectSourceSystem
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    // Unique constraint violation = project already linked
    if (error instanceof Error && error.message.includes('uq_campaign_project_space')) {
      return NextResponse.json({ error: 'Este proyecto ya está vinculado a una campaña en este Space' }, { status: 409 })
    }

    console.error('POST /api/campaigns/[campaignId]/projects failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
