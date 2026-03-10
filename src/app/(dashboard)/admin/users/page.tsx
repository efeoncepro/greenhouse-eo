import GreenhouseInternalDashboard from '@views/greenhouse/GreenhouseInternalDashboard'

import { getInternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'

export default async function Page() {
  const data = await getInternalDashboardOverview()

  return <GreenhouseInternalDashboard data={data} />
}
