import { redirect } from 'next/navigation'

import AdminCenterView from '@/views/greenhouse/admin/AdminCenterView'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { getInternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'
import { getNotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { buildReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
import { getReliabilityRegistry } from '@/lib/reliability/registry-store'
import {
  getLatestSweepRun,
  getLatestSyntheticSnapshotsByRoute
} from '@/lib/reliability/synthetic/reader'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.admin_center',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const [
    access,
    tenants,
    controlTower,
    operations,
    billing,
    notionOperational,
    syntheticSnapshots,
    syntheticSweep,
    reliabilityModules
  ] = await Promise.all([
    getAdminAccessOverview(),
    getAdminTenantsOverview(),
    getInternalDashboardOverview(),
    getOperationsOverview(),
    getGcpBillingOverview().catch(() => null),
    getNotionSyncOperationalOverview().catch(() => null),
    getLatestSyntheticSnapshotsByRoute().catch(() => []),
    getLatestSweepRun().catch(() => null),

    // TASK-635: módulos resueltos por el store DB-aware (defaults DB +
    // overlay overrides para `tenant.spaceId` cuando existe). Fallback al
    // STATIC_RELIABILITY_REGISTRY si DB falla.
    getReliabilityRegistry(tenant.spaceId ?? null).catch(() => null)
  ])

  const reliability = buildReliabilityOverview(operations, {
    billing,
    notionOperational,
    syntheticSnapshots,
    modules: reliabilityModules
  })

  return (
    <AdminCenterView
      access={access}
      tenants={tenants}
      controlTower={controlTower}
      operations={operations}
      reliability={reliability}
      syntheticSnapshots={syntheticSnapshots}
      syntheticSweep={syntheticSweep}
    />
  )
}
