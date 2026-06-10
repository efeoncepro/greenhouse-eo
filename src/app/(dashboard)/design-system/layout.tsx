import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'


import DesignSystemBreadcrumbShell from '@views/greenhouse/admin/design-system/DesignSystemBreadcrumbShell'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'
import { getDesignSystemFigmaNodeMap } from '@/lib/design-system/figma-nodes/store'

export const dynamic = 'force-dynamic'

/**
 * Design System layout guard — TASK-1070 (access) + TASK-1072 (figma node SSOT).
 *
 * The Design System is a cross-cutting INTERNAL resource (out of Admin Center).
 * Gated at the layout so the whole `/design-system/**` tree is covered:
 * authorized by the `plataforma.design_system` viewCode (granted to all internal
 * roles incl. `collaborator`) with an internal-tenant fallback so any internal
 * staff can reach it. Clients are NEVER allowed — defensive tenantType redirect.
 *
 * The server resolves the surface→AXIS-node map from the DB (SSOT, TASK-1072) and
 * whether the subject can LINK nodes (capability `design_system.figma_node.link`,
 * designer ∪ admin). Both are injected into the client shell — the client never
 * decides access; seeing the DS (view) ≠ linking a node (entitlement).
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

  const canLink = can(tenant, 'design_system.figma_node.link', 'update', 'tenant')
  const figmaNodeMap = await getDesignSystemFigmaNodeMap()

  return (
    <DesignSystemBreadcrumbShell figmaNodeMap={figmaNodeMap} canLinkFigmaNode={canLink}>
      {children}
    </DesignSystemBreadcrumbShell>
  )
}

export default Layout
