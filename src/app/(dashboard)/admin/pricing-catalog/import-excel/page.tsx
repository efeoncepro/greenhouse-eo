import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { canAdministerPricingCatalog } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import ExcelImportView from '@/views/greenhouse/admin/pricing-catalog/ExcelImportView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Importar catálogo — Pricing'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <ExcelImportView />
}

export default Page
