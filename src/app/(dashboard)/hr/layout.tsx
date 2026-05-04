import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode, resolveHrLeaveAccessContext } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { ROLE_CODES } from '@/config/role-codes'

export default async function HrLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: ['equipo.nomina', 'equipo.nomina_proyectada', 'equipo.permisos', 'equipo.jerarquia', 'equipo.organigrama', 'equipo.departamentos', 'equipo.asistencia', 'equipo.offboarding'],
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  const leaveAccessContext = hasAccess ? null : await resolveHrLeaveAccessContext(tenant)

  if (!hasAccess && !leaveAccessContext) {
    redirect(tenant.portalHomePath)
  }

  return children
}
