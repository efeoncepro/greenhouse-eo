import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  buildDealPipelineTotals,
  listDealPipelineSnapshots
} from '@/lib/commercial-intelligence/intelligence-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientIdFilter = searchParams.get('clientId')
  const organizationIdFilter = searchParams.get('organizationId')
  const dealstage = searchParams.get('dealstage')
  const wonOnly = searchParams.get('wonOnly') === 'true'
  const isOpenOnlyParam = searchParams.get('isOpenOnly')
  const isOpenOnly = isOpenOnlyParam === null ? !wonOnly : isOpenOnlyParam !== 'false'

  const isInternal = tenant.tenantType === 'efeonce_internal'

  const items = await listDealPipelineSnapshots({
    clientId: isInternal ? clientIdFilter || null : tenant.clientId,
    organizationId: isInternal ? organizationIdFilter || null : null,
    spaceId: tenant.spaceId ?? null,
    dealstage: dealstage || null,
    isOpenOnly,
    wonOnly
  })

  return NextResponse.json({
    items,
    totals: buildDealPipelineTotals(items),
    count: items.length
  })
}
