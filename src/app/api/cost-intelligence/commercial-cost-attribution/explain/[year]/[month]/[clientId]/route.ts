import { NextResponse } from 'next/server'

import { getCommercialCostAttributionExplainForClient } from '@/lib/commercial-cost-attribution/insights'
import { requireCostIntelligenceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ year: string; month: string; clientId: string }> }
) {
  const { tenant, errorResponse } = await requireCostIntelligenceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { year: yearRaw, month: monthRaw, clientId } = await context.params
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const explain = await getCommercialCostAttributionExplainForClient(year, month, clientId)

  if (!explain) {
    return NextResponse.json({ error: 'Commercial cost attribution not found' }, { status: 404 })
  }

  return NextResponse.json(explain)
}
