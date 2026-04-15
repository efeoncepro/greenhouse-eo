import { redirect } from 'next/navigation'

import SupervisorWorkspaceView from '@views/greenhouse/hr-core/SupervisorWorkspaceView'
import { hasBroadHrLeaveAccess, resolveHrLeaveAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const HrTeamPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasBroadHrLeaveAccess(tenant)
  const accessContext = hasAccess ? null : await resolveHrLeaveAccessContext(tenant)

  if (!hasAccess && !accessContext) {
    redirect(tenant.portalHomePath)
  }

  return <SupervisorWorkspaceView initialTab='team' />
}

export default HrTeamPage
