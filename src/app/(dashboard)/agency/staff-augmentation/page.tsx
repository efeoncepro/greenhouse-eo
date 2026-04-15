import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import StaffAugmentationListView from '@/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Staff Augmentation | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<{
    create?: string
    assignmentId?: string
  }>
}

const StaffAugmentationPage = async ({ searchParams }: Props) => {
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

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <StaffAugmentationListView
      initialCreateOpen={resolvedSearchParams?.create === '1'}
      initialAssignmentId={resolvedSearchParams?.assignmentId}
    />
  )
}

export default StaffAugmentationPage
