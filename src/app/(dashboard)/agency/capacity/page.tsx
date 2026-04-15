import { redirect } from 'next/navigation'

import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function AgencyCapacityRedirect() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'gestion.capacidad',
    fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  redirect('/agency?tab=capacidad')
}
