import { NextResponse } from 'next/server'

import {
  canReviewOrganizationBrandAsset,
  getOrganizationBrandAssetReviewOverview
} from '@/lib/account-360/organization-brand-assets'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canReviewOrganizationBrandAsset(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get('limit') ?? '80', 10)

  try {
    const overview = await getOrganizationBrandAssetReviewOverview({
      limit: Number.isFinite(limit) ? limit : 80
    })

    return NextResponse.json(overview)
  } catch (error) {
    console.error('GET /api/admin/data-quality/organization-logos failed:', error)

    return NextResponse.json({ error: 'Unable to load organization logo queue.' }, { status: 502 })
  }
}
