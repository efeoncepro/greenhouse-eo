import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import AdminViewAccessGovernanceView from '@/views/greenhouse/admin/AdminViewAccessGovernanceView'
import { getAdminViewAccessGovernance } from '@/lib/admin/get-admin-view-access-governance'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const metadata: Metadata = {
  title: 'Vistas y acceso | Admin Center | Greenhouse'
}

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.vistas',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const data = await getAdminViewAccessGovernance()

  return <AdminViewAccessGovernanceView data={data} />
}
