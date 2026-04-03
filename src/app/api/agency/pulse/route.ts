import { NextResponse } from 'next/server'

import { getAgencyPulseKpis, getAgencyStatusMix, getAgencyWeeklyActivity, getAgencyDeliveryTrend } from '@/lib/agency/agency-queries'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [kpis, statusMix, weeklyActivity, deliveryTrend] = await Promise.all([
    getAgencyPulseKpis(),
    getAgencyStatusMix(),
    getAgencyWeeklyActivity(),
    getAgencyDeliveryTrend(6)
  ])

  return NextResponse.json({ kpis, statusMix, weeklyActivity, deliveryTrend })
}
