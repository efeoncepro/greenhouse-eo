import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import CostAllocationsView from '@/views/greenhouse/finance/CostAllocationsView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = {
  title: 'Asignaciones de costos | Finance | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.asignaciones_costos',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes('efeonce_admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <CostAllocationsView />
}

export default Page
