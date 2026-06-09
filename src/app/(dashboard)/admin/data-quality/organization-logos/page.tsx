import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getOrganizationBrandAssetReviewOverview } from '@/lib/account-360/organization-brand-assets'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AdminOrganizationLogoReviewView from '@/views/greenhouse/admin/AdminOrganizationLogoReviewView'

export const metadata: Metadata = {
  title: 'Logos de organizaciones | Admin Center | Greenhouse'
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
    redirect('/401')
  }

  const overview = await getOrganizationBrandAssetReviewOverview({ limit: 120 })

  return <AdminOrganizationLogoReviewView overview={overview} />
}
