import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import MyAssignmentsView from '@/views/greenhouse/my/MyAssignmentsView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Mis Asignaciones | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mis_asignaciones',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <MyAssignmentsView />
}

export default Page
