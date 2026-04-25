import { NextResponse } from 'next/server'

import {
  getPartyLifecycleFunnelMetrics,
  materializeAllPartyLifecycleSnapshots
} from '@/lib/commercial/party'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  void request
  await materializeAllPartyLifecycleSnapshots()
  const metrics = await getPartyLifecycleFunnelMetrics()

  return NextResponse.json(metrics)
}
