import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import OverheadAddonsListView from '@/views/greenhouse/admin/pricing-catalog/OverheadAddonsListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Overheads y fees — Catálogo de pricing'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <OverheadAddonsListView />
}

export default Page
