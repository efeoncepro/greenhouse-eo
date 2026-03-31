import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export default async function HrPayrollLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'equipo.nomina',
    fallback: tenant.routeGroups.includes('hr') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return children
}
