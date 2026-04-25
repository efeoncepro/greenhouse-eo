import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import ApprovalsQueueView from '@/views/greenhouse/admin/pricing-catalog/ApprovalsQueueView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Aprobaciones — Pricing Catalog'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <ApprovalsQueueView />
}

export default Page
