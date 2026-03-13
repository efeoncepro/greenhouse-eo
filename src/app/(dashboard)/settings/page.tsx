import { redirect } from 'next/navigation'

import GreenhouseSettings from '@views/greenhouse/GreenhouseSettings'

import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page() {
  const tenant = await getTenantContext()
  const hasMicrosoftAuth = Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)

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

  return (
    <GreenhouseSettings
      hasMicrosoftAuth={hasMicrosoftAuth}
      accountTeam={data.accountTeam}
      businessLines={tenant.businessLines}
    />
  )
}
