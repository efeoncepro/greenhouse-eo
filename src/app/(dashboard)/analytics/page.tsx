import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import GreenhouseDeliveryAnalytics from '@/views/greenhouse/GreenhouseDeliveryAnalytics'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = {
  title: 'Analytics | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.analytics',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/auth/landing')
  }

  return <GreenhouseDeliveryAnalytics />
}

export default Page
