import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import MyPaymentProfileView from '@/views/greenhouse/my/MyPaymentProfileView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const metadata: Metadata = { title: 'Mi cuenta de pago | Greenhouse' }
export const dynamic = 'force-dynamic'

/**
 * TASK-753 — Self-service del propio perfil de pago.
 * ViewCode `mi_ficha.mi_cuenta_pago` registrado en view-access-catalog.
 */
const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mi_cuenta_pago',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <MyPaymentProfileView />
}

export default Page
