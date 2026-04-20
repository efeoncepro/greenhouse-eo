import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import {
  canAdministerPricingCatalog,
  canRevertPricingCatalogChange
} from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import AuditLogTimelineView from '@/views/greenhouse/admin/pricing-catalog/AuditLogTimelineView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Historial de cambios — Catálogo de pricing'
}

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (!canAdministerPricingCatalog(tenant)) redirect(tenant.portalHomePath)

  return <AuditLogTimelineView canRevert={canRevertPricingCatalogChange(tenant)} />
}

export default Page
