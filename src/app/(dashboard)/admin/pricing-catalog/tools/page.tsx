import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import ToolCatalogListView from '@/views/greenhouse/admin/pricing-catalog/ToolCatalogListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Herramientas — Catálogo de pricing'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <ToolCatalogListView />
}

export default Page
