import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getIntegrationHealthSnapshots } from '@/lib/integrations/health'
import { getNotionDeliveryDataQualityOverview } from '@/lib/integrations/notion-delivery-data-quality'
import { getNotionSyncOrchestrationOverview } from '@/lib/integrations/notion-sync-orchestration'
import { getIntegrationRegistry } from '@/lib/integrations/registry'
import { listSisterPlatformBindings } from '@/lib/sister-platforms/bindings'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import type { SisterPlatformBindingRecord } from '@/lib/sister-platforms/types'
import type { IntegrationDataQualityOverview } from '@/types/integration-data-quality'
import type { NotionSyncOrchestrationOverview } from '@/types/notion-sync-orchestration'
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
    redirect(tenant.portalHomePath)
  }

  let integrations: IntegrationWithHealth[] = []
  let notionDataQualityOverview: IntegrationDataQualityOverview | null = null
  let notionOrchestrationOverview: NotionSyncOrchestrationOverview | null = null
  let sisterPlatformBindings: SisterPlatformBindingRecord[] = []

  try {
    const registry = await getIntegrationRegistry()

    const healthMap = await getIntegrationHealthSnapshots(registry.map(r => r.integrationKey))

    ;[notionDataQualityOverview, notionOrchestrationOverview, sisterPlatformBindings] = await Promise.all([
      getNotionDeliveryDataQualityOverview({ limit: 12 }),
      getNotionSyncOrchestrationOverview({ limit: 12 }),
      listSisterPlatformBindings({ tenant, limit: 24 })
    ])

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
      notionOrchestrationOverview={notionOrchestrationOverview}
      sisterPlatformBindings={sisterPlatformBindings}
    />
  )
}
