import GreenhouseAdminUsers from '@views/greenhouse/GreenhouseAdminUsers'

import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getAdminAccessOverview()

  return <GreenhouseAdminUsers data={data} />
}
