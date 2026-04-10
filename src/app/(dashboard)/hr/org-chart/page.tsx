import { redirect } from 'next/navigation'

import HrOrgChartView from '@views/greenhouse/hr-core/HrOrgChartView'
import { hasBroadHrOrgChartAccess, resolveHrLeaveAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const HrOrgChartPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasBroadHrOrgChartAccess(tenant)
  const accessContext = hasAccess ? null : await resolveHrLeaveAccessContext(tenant)

  if (!hasAccess && !accessContext) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <HrOrgChartView />
}

export default HrOrgChartPage
