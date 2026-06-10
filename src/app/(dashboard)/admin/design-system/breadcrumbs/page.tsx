import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import BreadcrumbsLabView from '@views/greenhouse/admin/design-system/BreadcrumbsLabView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Breadcrumbs Lab — Design System | Greenhouse'
}

// Internal Breadcrumbs primitive reference. Mirrors `/admin/design-system` guard:
// AXIS/Greenhouse design-system surfaces must never be exposed to clients.
export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.design_system',
    fallback: tenant.routeGroups.includes('internal')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <BreadcrumbsLabView />
}
