import { redirect } from 'next/navigation'

import HrLeaveView from '@views/greenhouse/hr-core/HrLeaveView'
import { hasBroadHrLeaveAccess, resolveHrLeaveAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const LeavePage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasBroadHrLeaveAccess(tenant)
  const accessContext = hasAccess ? null : await resolveHrLeaveAccessContext(tenant)

  if (!hasAccess && !accessContext) {
    redirect(tenant.portalHomePath)
  }

  return <HrLeaveView />
}

export default LeavePage
