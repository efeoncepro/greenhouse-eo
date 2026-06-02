import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import ContractorPaymentsWorkbenchView from '@views/greenhouse/finance/contractor-payments/ContractorPaymentsWorkbenchView'
import { hasRouteGroup, hasRoleCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pagos a contractors — Greenhouse'
}

const ContractorPaymentsPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess =
    hasRouteGroup(tenant, 'finance') ||
    hasRoleCode(tenant, ROLE_CODES.FINANCE_ADMIN) ||
    hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <ContractorPaymentsWorkbenchView />
}

export default ContractorPaymentsPage
