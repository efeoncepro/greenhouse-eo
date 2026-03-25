import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationExecutiveSnapshot } from '@/lib/account-360/organization-executive'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: organizationId } = await params
    const { searchParams } = new URL(request.url)

    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
    const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
    const trend = searchParams.get('trend') ? Number(searchParams.get('trend')) : 6

    const snapshot = await getOrganizationExecutiveSnapshot(organizationId, {
      year,
      month,
      trendMonths: trend
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('GET /api/organizations/[id]/executive failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
