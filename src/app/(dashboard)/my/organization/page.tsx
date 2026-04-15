import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import MyOrganizationView from '@/views/greenhouse/my/MyOrganizationView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Mi Organización | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'mi_ficha.mi_organizacion',
    fallback: tenant.routeGroups.includes('my')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <MyOrganizationView />
}

export default Page
