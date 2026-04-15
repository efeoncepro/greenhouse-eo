import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import GreenhouseClientTeam from '@/views/greenhouse/GreenhouseClientTeam'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = {
  title: 'Mi Equipo | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.equipo',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  return <GreenhouseClientTeam />
}

export default Page
