import { NextResponse } from 'next/server'

import { getLatestEconomicIndicatorsSummary } from '@/lib/finance/economic-indicators'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const indicators = await getLatestEconomicIndicatorsSummary()

  return NextResponse.json({ indicators })
}
