import { redirect } from 'next/navigation'

import { getAgencySpace360 } from '@/lib/agency/space-360'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import Space360View from '@/views/greenhouse/agency/space-360/Space360View'

export const dynamic = 'force-dynamic'

export default async function AgencySpaceDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'gestion.spaces',
    fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const { id } = await params
  const detail = await getAgencySpace360(id)

  return <Space360View detail={detail} requestedId={id} />
}
