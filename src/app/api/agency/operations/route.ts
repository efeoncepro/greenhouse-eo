import { NextResponse } from 'next/server'

import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getOperationsOverview()

  return NextResponse.json(data)
}
