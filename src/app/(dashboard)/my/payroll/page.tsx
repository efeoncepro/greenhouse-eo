import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import MyPayrollView from '@/views/greenhouse/my/MyPayrollView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const metadata: Metadata = { title: 'Mi Nómina | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mi_nomina',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <MyPayrollView />
}

export default Page
