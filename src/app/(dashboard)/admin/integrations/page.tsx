import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getIntegrationHealthSnapshots } from '@/lib/integrations/health'
import { getNotionDeliveryDataQualityOverview } from '@/lib/integrations/notion-delivery-data-quality'
import { getIntegrationRegistry } from '@/lib/integrations/registry'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import type { IntegrationDataQualityOverview } from '@/types/integration-data-quality'
import type { IntegrationWithHealth } from '@/types/integrations'
import AdminIntegrationGovernanceView from '@/views/greenhouse/admin/AdminIntegrationGovernanceView'

export const metadata: Metadata = { title: 'Integration Governance | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.cloud_integrations',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  let integrations: IntegrationWithHealth[] = []
  let notionDataQualityOverview: IntegrationDataQualityOverview | null = null

  try {
    const registry = await getIntegrationRegistry()
    const healthMap = await getIntegrationHealthSnapshots(registry.map(r => r.integrationKey))

    notionDataQualityOverview = await getNotionDeliveryDataQualityOverview({ limit: 12 })

    integrations = registry.map(entry => ({
      ...entry,
      healthSnapshot: healthMap.get(entry.integrationKey) ?? {
        integrationKey: entry.integrationKey,
        health: 'idle' as const,
        lastSyncAt: null,
        syncRunsLast24h: 0,
        syncFailuresLast24h: 0,
        freshnessPercent: 0,
        freshnessLabel: 'Sin señal'
      }
    }))
  } catch (error) {
    console.error('[admin/integrations] Failed to load integration registry:', error)
  }

  return (
    <AdminIntegrationGovernanceView
      integrations={integrations}
      notionDataQualityOverview={notionDataQualityOverview}
    />
  )
}
