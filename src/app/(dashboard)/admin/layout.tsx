import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: [
      'administracion.admin_center',
      'administracion.spaces',
      'administracion.usuarios',
      'administracion.roles',
      'administracion.vistas',
      'administracion.ops_health',
      'administracion.instrumentos_pago',
      'ia.herramientas'
    ],
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return children
}
