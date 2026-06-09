import { NextResponse } from 'next/server'

import { canReviewOrganizationBrandAsset } from '@/lib/account-360/organization-brand-assets'
import { discoverOrganizationBrandAssets } from '@/lib/account-360/organization-brand-assets-discovery'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canReviewOrganizationBrandAsset(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : null
  const limit = typeof body.limit === 'number' ? body.limit : 1

  try {
    const result = await discoverOrganizationBrandAssets({
      organizationId,
      limit,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/admin/data-quality/organization-logos/discover failed:', error)

    return NextResponse.json({ error: 'Unable to discover organization logo candidates.' }, { status: 502 })
  }
}
