import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getServiceList } from '@/lib/services/service-store'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import ServiceSlaGovernanceView from '@/views/greenhouse/admin/ServiceSlaGovernanceView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Service SLA | Admin Center | Greenhouse'
}

export default async function AdminServiceSlasPage() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.admin_center',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const services = await getServiceList({
    pageSize: 200,
    activeOnly: true
  })

  return <ServiceSlaGovernanceView services={services.items} />
}
