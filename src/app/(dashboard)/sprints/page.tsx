import { redirect } from 'next/navigation'

import GreenhouseSprints from '@views/greenhouse/GreenhouseSprints'

import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based. D1 bypass para
  // internal admins. Clientes con cliente.ciclos asignado pasan;
  // otros redirect a /home?denied=ciclos.
  await requireViewCodeAccess('cliente.ciclos')

  const data = await getDashboardOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  return <GreenhouseSprints data={data} />
}
