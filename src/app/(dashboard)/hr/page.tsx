import { redirect } from 'next/navigation'

import HrCoreDashboard from '@views/greenhouse/hr-core/HrCoreDashboard'
import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { ROLE_CODES } from '@/config/role-codes'

const HrPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: ['equipo.nomina', 'equipo.nomina_proyectada', 'equipo.permisos', 'equipo.jerarquia', 'equipo.departamentos', 'equipo.asistencia'],
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <HrCoreDashboard />
}

export default HrPage
