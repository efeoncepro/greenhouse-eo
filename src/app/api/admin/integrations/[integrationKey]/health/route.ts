import { NextResponse } from 'next/server'

import { getIntegrationHealthSnapshots } from '@/lib/integrations/health'
import { getIntegrationByKey } from '@/lib/integrations/registry'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { integrationKey } = await params

  const entry = await getIntegrationByKey(integrationKey)

  if (!entry) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }


  const healthMap = await getIntegrationHealthSnapshots([integrationKey])

  const healthSnapshot = healthMap.get(integrationKey) ?? {
    integrationKey,
    health: 'idle',
    lastSyncAt: null,
    syncRunsLast24h: 0,
    syncFailuresLast24h: 0,
    freshnessPercent: 0,
    freshnessLabel: 'Sin seal'
  }

  return NextResponse.json({
    integration: entry,
    healthSnapshot
  })
}
