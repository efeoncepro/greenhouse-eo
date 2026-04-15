import { redirect } from 'next/navigation'

import type { ChildrenType } from '@core/types'

import { verifyCapabilityModuleAccess } from '@/lib/capabilities/verify-module-access'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Layout({ children, params }: ChildrenType & { params: Promise<{ moduleId: string }> }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType !== 'client' || !tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath)
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.modulos',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const { moduleId } = await params

  if (!verifyCapabilityModuleAccess(moduleId, tenant)) {
    redirect('/home')
  }

  return children
}
