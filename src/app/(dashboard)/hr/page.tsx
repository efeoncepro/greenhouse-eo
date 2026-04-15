import { redirect } from 'next/navigation'

import HrCoreDashboard from '@views/greenhouse/hr-core/HrCoreDashboard'
import SupervisorWorkspaceView from '@views/greenhouse/hr-core/SupervisorWorkspaceView'
import { hasAnyAuthorizedViewCode, resolveHrLeaveAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { ROLE_CODES } from '@/config/role-codes'

const HrPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: ['equipo.nomina', 'equipo.nomina_proyectada', 'equipo.permisos', 'equipo.jerarquia', 'equipo.organigrama', 'equipo.departamentos', 'equipo.asistencia'],
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  const accessContext = hasAccess ? null : await resolveHrLeaveAccessContext(tenant)

  if (!hasAccess && !accessContext) {
    redirect(tenant.portalHomePath)
  }

  if (hasAccess) {
    return <HrCoreDashboard />
  }

  return <SupervisorWorkspaceView initialTab='overview' />
}

export default HrPage
