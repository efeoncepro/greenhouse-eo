import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'


import DesignSystemBreadcrumbShell from '@views/greenhouse/admin/design-system/DesignSystemBreadcrumbShell'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Design System layout guard — TASK-1070.
 *
 * The Design System is a cross-cutting INTERNAL resource (out of Admin Center).
 * Gated at the layout so the whole `/design-system/**` tree is covered:
 * authorized by the `plataforma.design_system` viewCode (granted to all internal
 * roles incl. `collaborator`) with an internal-tenant fallback so any internal
 * staff can reach it. Clients are NEVER allowed — defensive tenantType redirect.
 */
const Layout = async ({ children }: { children: ReactNode }) => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'plataforma.design_system',
    fallback: tenant.tenantType === 'efeonce_internal'
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <DesignSystemBreadcrumbShell>{children}</DesignSystemBreadcrumbShell>
}

export default Layout
