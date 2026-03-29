import AdminCenterView from '@/views/greenhouse/admin/AdminCenterView'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'

export default async function Page() {
  const [access, tenants] = await Promise.all([getAdminAccessOverview(), getAdminTenantsOverview()])

  return <AdminCenterView access={access} tenants={tenants} />
}
