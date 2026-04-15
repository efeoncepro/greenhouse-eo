import { redirect } from 'next/navigation'

import HrHierarchyView from '@views/greenhouse/hr-core/HrHierarchyView'
import { ROLE_CODES } from '@/config/role-codes'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

const HrHierarchyPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.jerarquia',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <HrHierarchyView />
}

export default HrHierarchyPage
