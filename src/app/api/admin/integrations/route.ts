import { NextResponse } from 'next/server'

import { getIntegrationHealthSnapshots } from '@/lib/integrations/health'
import { getIntegrationRegistry } from '@/lib/integrations/registry'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { IntegrationWithHealth } from '@/types/integrations'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const registry = await getIntegrationRegistry()
  const healthMap = await getIntegrationHealthSnapshots(registry.map(r => r.integrationKey))

  const integrations: IntegrationWithHealth[] = registry.map(entry => ({
    ...entry,
    healthSnapshot: healthMap.get(entry.integrationKey) ?? {
      integrationKey: entry.integrationKey,
      health: 'idle',
      lastSyncAt: null,
      syncRunsLast24h: 0,
      syncFailuresLast24h: 0,
      freshnessPercent: 0,
      freshnessLabel: 'Sin seal'
    }
  }))

  return NextResponse.json({ integrations })
}
