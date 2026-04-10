import { redirect } from 'next/navigation'

import GreenhouseAdminRoles from '@views/greenhouse/GreenhouseAdminRoles'

import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.roles',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const data = await getAdminAccessOverview()

  return <GreenhouseAdminRoles data={data} />
}
