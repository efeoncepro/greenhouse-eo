import { NextResponse } from 'next/server'

import { getSpaceFinanceMetrics } from '@/lib/agency/agency-finance-metrics'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metrics = await getSpaceFinanceMetrics()

  return NextResponse.json(metrics)
}
