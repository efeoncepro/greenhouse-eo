import GreenhouseAdminRoles from '@views/greenhouse/GreenhouseAdminRoles'

import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'

export default async function Page() {
  const data = await getAdminAccessOverview()

  return <GreenhouseAdminRoles data={data} />
}
