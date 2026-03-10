import { notFound } from 'next/navigation'

import GreenhouseAdminTenantDashboardPreview from '@views/greenhouse/GreenhouseAdminTenantDashboardPreview'

import { getAdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenant = await getAdminTenantDetail(id)

  if (!tenant) {
    notFound()
  }

  const data = await getDashboardOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projects.map(project => project.projectId),
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  return <GreenhouseAdminTenantDashboardPreview clientId={tenant.clientId} clientName={tenant.clientName} data={data} />
}
