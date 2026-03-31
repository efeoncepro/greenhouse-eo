import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import FinanceIntelligenceView from '@views/greenhouse/finance/FinanceIntelligenceView'
import { canCloseCostIntelligencePeriod, canReopenCostIntelligencePeriod, hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Economía operativa — Greenhouse'
}

const IntelligencePage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.inteligencia',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return (
    <FinanceIntelligenceView
      canManageClosure={canCloseCostIntelligencePeriod(tenant)}
      canReopen={canReopenCostIntelligencePeriod(tenant)}
    />
  )
}

export default IntelligencePage
