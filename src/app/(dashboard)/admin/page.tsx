import { redirect } from 'next/navigation'

import AdminCenterView from '@/views/greenhouse/admin/AdminCenterView'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { getInternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'
import { getNotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { buildReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
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

  const [access, tenants, controlTower, operations, billing, notionOperational] = await Promise.all([
    getAdminAccessOverview(),
    getAdminTenantsOverview(),
    getInternalDashboardOverview(),
    getOperationsOverview(),
    getGcpBillingOverview().catch(() => null),
    getNotionSyncOperationalOverview().catch(() => null)
  ])

  const reliability = buildReliabilityOverview(operations, {
    billing,
    notionOperational
  })

  return (
    <AdminCenterView
      access={access}
      tenants={tenants}
      controlTower={controlTower}
      operations={operations}
      reliability={reliability}
    />
  )
}
