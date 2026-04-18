import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { requireTenantContext } from '@/lib/tenant/authorization'
import { removeProjectFromCampaign } from '@/lib/campaigns/campaign-store'
import { getCampaignForTenant } from '@/lib/campaigns/tenant-scope'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string; linkId: string }> }
) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tenant.routeGroups.includes('internal') && !tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { campaignId, linkId } = await params
    const access = await getCampaignForTenant({ tenant, campaignId })

    if (!access.ok && access.reason === 'not_found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await removeProjectFromCampaign(linkId)

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('DELETE /api/campaigns/[campaignId]/projects/[linkId] failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
