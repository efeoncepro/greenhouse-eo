import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function NotificationsLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.notificaciones',
    fallback: tenant.routeGroups.includes('client') || tenant.routeGroups.includes('my') || tenant.routeGroups.includes('internal')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return children
}
