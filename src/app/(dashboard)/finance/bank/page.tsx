import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import BankView from '@views/greenhouse/finance/BankView'
import { canAccessBankTreasury, hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Banco — Greenhouse'
}

const BankPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.banco',
    fallback: canAccessBankTreasury(tenant)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <BankView />
}

export default BankPage
