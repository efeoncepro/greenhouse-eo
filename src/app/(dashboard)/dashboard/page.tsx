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

  // client-portal-visibility-allowed: `cliente.pulse` es el HOME del portal cliente, y el home
  // es el terminator del guard — es adonde `requireViewCodeAccess` redirige cuando deniega.
  // Gatearlo con el primitive lo haría depender de que algún módulo declare `cliente.pulse`, y
  // una organización sin ese módulo quedaría sin entrada Y sin destino de denegación: un
  // cliente encerrado. Por eso `cliente.pulse` está marcado `guarded: false` en el catálogo de
  // navegación y queda en el carril de rol a propósito.
  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.pulse',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect('/401')
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
