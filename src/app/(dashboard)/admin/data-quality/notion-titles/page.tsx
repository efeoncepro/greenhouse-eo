import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getUntitledPagesOverview } from '@/lib/delivery/get-untitled-pages-overview'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AdminUntitledNotionPagesView from '@/views/greenhouse/admin/AdminUntitledNotionPagesView'

export const metadata: Metadata = {
  title: 'Páginas sin título en Notion | Admin Center | Greenhouse'
}
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

  const overview = await getUntitledPagesOverview({ recentLimit: 200 })

  return <AdminUntitledNotionPagesView overview={overview} />
}
