import { redirect } from 'next/navigation'

import type { ChildrenType } from '@core/types'

import { getResolvedCapabilityModule } from '@/lib/capabilities/resolve-capabilities'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Layout({ children, params }: ChildrenType & { params: Promise<{ moduleId: string }> }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType !== 'client' || !tenant.routeGroups.includes('client')) {
    redirect(tenant.portalHomePath)
  }

  const { moduleId } = await params

  const capabilityModule = getResolvedCapabilityModule(moduleId, {
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  if (!capabilityModule) {
    redirect('/home')
  }

  return children
}
