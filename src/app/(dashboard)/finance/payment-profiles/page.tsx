import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import PaymentProfilesView from '@views/greenhouse/finance/payment-profiles/PaymentProfilesView'
import { hasRouteGroup, hasRoleCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Perfiles de pago — Greenhouse'
}

const PaymentProfilesPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasRouteGroup(tenant, 'finance') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <PaymentProfilesView />
}

export default PaymentProfilesPage
