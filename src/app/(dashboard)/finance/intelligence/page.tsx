import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import ClientEconomicsView from '@views/greenhouse/finance/ClientEconomicsView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Inteligencia financiera — Greenhouse'
}

const IntelligencePage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.inteligencia',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes('efeonce_admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <ClientEconomicsView />
}

export default IntelligencePage
