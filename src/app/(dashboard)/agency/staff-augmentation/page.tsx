import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import StaffAugmentationListView from '@/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Staff Augmentation | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'

const StaffAugmentationPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'gestion.staff_augmentation',
    fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <StaffAugmentationListView />
}

export default StaffAugmentationPage
