import { NextResponse } from 'next/server'

import { getPersonFinanceOverview } from '@/lib/people/get-person-finance-overview'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const { searchParams } = new URL(request.url)
    const requestedOrganizationId = searchParams.get('organizationId')?.trim() || null

    if (
      tenant.tenantType === 'client' &&
      requestedOrganizationId &&
      tenant.organizationId &&
      requestedOrganizationId !== tenant.organizationId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = tenant.tenantType === 'client'
      ? tenant.organizationId
      : requestedOrganizationId

    const detail = await getPersonFinanceOverview(memberId, { organizationId })

    return NextResponse.json(detail)
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load person finance overview.')
  }
}
