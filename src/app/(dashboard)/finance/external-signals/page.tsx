import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { listSignals } from '@/lib/finance/external-cash-signals'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import ExternalSignalsView from '@/views/greenhouse/finance/ExternalSignalsView'

export const metadata: Metadata = {
  title: 'Señales externas de caja | Finance | Greenhouse'
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finance.workspace',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes('efeonce_admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const initial = await listSignals({ status: 'unresolved', limit: 50 })

  return <ExternalSignalsView initial={initial} />
}
