import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import ServiceCatalogListView from '@/views/greenhouse/admin/pricing-catalog/ServiceCatalogListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Servicios empaquetados — Catálogo de pricing'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <ServiceCatalogListView />
}

export default Page
