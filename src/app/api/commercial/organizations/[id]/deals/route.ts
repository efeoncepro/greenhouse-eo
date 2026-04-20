import { NextResponse } from 'next/server'

import { listCommercialDealsForOrganization } from '@/lib/commercial/deals-store'
import { resolveFinanceQuoteTenantOrganizationIds } from '@/lib/finance/quotation-canonical-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: organizationId } = await params
  const normalizedOrganizationId = organizationId?.trim()

  if (!normalizedOrganizationId) {
    return NextResponse.json({ error: 'organization id is required' }, { status: 400 })
  }

  const visibleOrgIds = await resolveFinanceQuoteTenantOrganizationIds(tenant)

  if (!visibleOrgIds.includes(normalizedOrganizationId)) {
    return NextResponse.json({ error: 'Organization not visible to this tenant.' }, { status: 403 })
  }

  const items = await listCommercialDealsForOrganization(normalizedOrganizationId)

  return NextResponse.json({ items, total: items.length })
}
