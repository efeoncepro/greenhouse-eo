import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import CreatePlacementPageView from '@/views/greenhouse/agency/staff-augmentation/CreatePlacementPageView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Crear Placement | Staff Augmentation | Greenhouse' }
export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<{
    assignmentId?: string
  }>
}

const StaffAugmentationCreatePage = async ({ searchParams }: Props) => {
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

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return <CreatePlacementPageView initialAssignmentId={resolvedSearchParams?.assignmentId} />
}

export default StaffAugmentationCreatePage
