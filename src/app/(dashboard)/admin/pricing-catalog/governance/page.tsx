import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import GovernanceInlineView from '@/views/greenhouse/admin/pricing-catalog/GovernanceInlineView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gobierno de márgenes — Catálogo de pricing'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <GovernanceInlineView />
}

export default Page
