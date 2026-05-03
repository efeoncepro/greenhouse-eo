import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import PaymentOrdersView from '@views/greenhouse/finance/payment-orders/PaymentOrdersView'
import { hasRouteGroup, hasRoleCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ordenes de pago — Greenhouse'
}

const PaymentOrdersPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasRouteGroup(tenant, 'finance') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <PaymentOrdersView />
}

export default PaymentOrdersPage
