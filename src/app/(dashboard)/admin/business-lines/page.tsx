import { redirect } from 'next/navigation'

import { loadBusinessLineMetadata } from '@/lib/business-line/metadata'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AdminBusinessLinesView from '@/views/greenhouse/admin/business-lines/AdminBusinessLinesView'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.admin_center',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const businessLines = await loadBusinessLineMetadata()

  return <AdminBusinessLinesView initialData={businessLines} />
}
