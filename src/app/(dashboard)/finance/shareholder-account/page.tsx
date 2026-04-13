import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import ShareholderAccountView from '@views/greenhouse/finance/shareholder-account/ShareholderAccountView'
import { canAccessBankTreasury, hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cuenta corriente accionista — Greenhouse'
}

const ShareholderAccountPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.cuenta_corriente_accionista',
    fallback: canAccessBankTreasury(tenant)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <ShareholderAccountView />
}

export default ShareholderAccountPage
