import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AdminCloudIntegrationsView from '@/views/greenhouse/admin/AdminCloudIntegrationsView'

export const metadata: Metadata = { title: 'Cloud & Integrations | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.cloud_integrations',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const data = await getOperationsOverview()

  return <AdminCloudIntegrationsView data={data} />
}
