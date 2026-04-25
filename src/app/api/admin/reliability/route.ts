import { NextResponse } from 'next/server'

import { getReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const overview = await getReliabilityOverview()

  return NextResponse.json(overview)
}
