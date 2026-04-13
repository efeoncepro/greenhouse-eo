import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { readReactiveProjectionBreakdown } from '@/lib/operations/get-reactive-projection-breakdown'
import AdminOpsHealthView from '@/views/greenhouse/admin/AdminOpsHealthView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const metadata: Metadata = { title: 'Ops Health | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.ops_health',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const [data, reactiveBreakdown] = await Promise.all([
    getOperationsOverview(),
    readReactiveProjectionBreakdown().catch(() => null)
  ])

  return <AdminOpsHealthView data={data} reactiveBreakdown={reactiveBreakdown} />
}
