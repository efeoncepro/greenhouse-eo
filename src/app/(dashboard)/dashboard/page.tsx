import { redirect } from 'next/navigation'

import GreenhouseDashboard from '@views/greenhouse/GreenhouseDashboard'

import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'
import { getTeamMembers } from '@/lib/team-queries'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.pulse',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  const data = await getDashboardOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  const teamMembersData = await getTeamMembers({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  }).catch(() => null)

  return <GreenhouseDashboard clientName={tenant.clientName} data={data} teamMembersData={teamMembersData} />
}
