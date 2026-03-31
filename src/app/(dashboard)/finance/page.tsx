import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import FinanceDashboardView from '@views/greenhouse/finance/FinanceDashboardView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Finanzas — Greenhouse'
}

const FinanceDashboardPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.resumen',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <FinanceDashboardView />
}

export default FinanceDashboardPage
