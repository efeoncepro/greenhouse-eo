import { redirect } from 'next/navigation'

import GreenhouseDashboard from '@views/greenhouse/GreenhouseDashboard'

import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (!tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  const data = await getDashboardOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  return <GreenhouseDashboard data={data} />
}
