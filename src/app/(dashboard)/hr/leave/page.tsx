import { redirect } from 'next/navigation'

import HrLeaveView from '@views/greenhouse/hr-core/HrLeaveView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const LeavePage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.permisos',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes('efeonce_admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <HrLeaveView />
}

export default LeavePage
