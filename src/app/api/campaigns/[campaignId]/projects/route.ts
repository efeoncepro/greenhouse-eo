import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { requireTenantContext } from '@/lib/tenant/authorization'
import { addProjectToCampaign, listCampaignProjects } from '@/lib/campaigns/campaign-store'
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
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tenant.routeGroups.includes('internal') && !tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { campaignId } = await params
    const body = await request.json()

    if (!body.projectSourceId) {
      return NextResponse.json({ error: 'projectSourceId is required' }, { status: 400 })
    }

    const access = await getCampaignForTenant({ tenant, campaignId })

    if (!access.ok && access.reason === 'not_found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const link = await addProjectToCampaign({
      campaignId,
      spaceId: access.campaign.spaceId,
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
