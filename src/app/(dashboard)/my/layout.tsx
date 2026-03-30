import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function MyLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: [
      'mi_ficha.mi_inicio',
      'mi_ficha.mis_asignaciones',
      'mi_ficha.mi_desempeno',
      'mi_ficha.mi_delivery',
      'mi_ficha.mi_perfil',
      'mi_ficha.mi_nomina',
      'mi_ficha.mis_permisos',
      'mi_ficha.mi_organizacion'
    ],
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return children
}
