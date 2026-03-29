import AdminCenterView from '@/views/greenhouse/admin/AdminCenterView'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { getInternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'
import { getOperationsOverview } from '@/lib/operations/get-operations-overview'

export default async function Page() {
  const [access, tenants, controlTower, operations] = await Promise.all([
    getAdminAccessOverview(),
    getAdminTenantsOverview(),
    getInternalDashboardOverview(),
    getOperationsOverview()
  ])

  return (
    <AdminCenterView
      access={access}
      tenants={tenants}
      controlTower={controlTower}
      operations={operations}
    />
  )
}
