import { NextResponse } from 'next/server'

import { getAgencyTeamCapacity, toAgencyCapacityOverview } from '@/lib/agency/team-capacity-store'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const capacity = await getAgencyTeamCapacity()

  return NextResponse.json(toAgencyCapacityOverview(capacity))
}
