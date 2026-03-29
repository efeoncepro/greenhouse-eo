import AdminCenterView from '@/views/greenhouse/admin/AdminCenterView'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { getInternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'

export default async function Page() {
  const [access, tenants, controlTower] = await Promise.all([
    getAdminAccessOverview(),
    getAdminTenantsOverview(),
    getInternalDashboardOverview()
  ])

  return <AdminCenterView access={access} tenants={tenants} controlTower={controlTower} />
}
