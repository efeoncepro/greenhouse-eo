import { redirect } from 'next/navigation'

import HrOrgChartView from '@views/greenhouse/hr-core/HrOrgChartView'
import { resolveHrOrgChartAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const HrOrgChartPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const accessContext = await resolveHrOrgChartAccessContext(tenant)

  if (!accessContext) {
    redirect(tenant.portalHomePath)
  }

  return <HrOrgChartView />
}

export default HrOrgChartPage
