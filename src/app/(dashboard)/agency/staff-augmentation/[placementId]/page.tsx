import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import PlacementDetailView from '@/views/greenhouse/agency/staff-augmentation/PlacementDetailView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Placement 360 | Staff Augmentation | Greenhouse' }
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ placementId: string }>
}

const StaffAugmentationPlacementPage = async ({ params }: Props) => {
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
    redirect(tenant.portalHomePath)
  }

  const { placementId } = await params

  return <PlacementDetailView placementId={placementId} />
}

export default StaffAugmentationPlacementPage
