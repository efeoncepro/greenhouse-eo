import { NextResponse } from 'next/server'

import { readCommercialCostAttributionByClientForPeriod } from '@/lib/commercial-cost-attribution/member-period-attribution'
import { requireCostIntelligenceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const toInteger = (value: string | null) => {
  if (!value) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireCostIntelligenceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const year = toInteger(searchParams.get('year')) ?? now.getFullYear()
  const month = toInteger(searchParams.get('month')) ?? now.getMonth() + 1

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }

  const clients = await readCommercialCostAttributionByClientForPeriod(year, month)

  return NextResponse.json({ clients, periodYear: year, periodMonth: month })
}
