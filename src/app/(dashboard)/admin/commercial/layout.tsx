import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function AdminCommercialLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: ['administracion.admin_center', 'administracion.commercial_parties'],
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return children
}
