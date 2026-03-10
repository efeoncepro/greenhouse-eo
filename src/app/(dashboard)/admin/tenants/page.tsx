import GreenhouseAdminTenants from '@views/greenhouse/GreenhouseAdminTenants'

import { getAdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'

export default async function Page() {
  const data = await getAdminTenantsOverview()

  return <GreenhouseAdminTenants data={data} />
}
