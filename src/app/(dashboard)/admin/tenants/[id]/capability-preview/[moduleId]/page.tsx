import { notFound } from 'next/navigation'

import GreenhouseAdminTenantCapabilityPreview from '@views/greenhouse/GreenhouseAdminTenantCapabilityPreview'

import { getAdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import { getCapabilityModuleData } from '@/lib/capabilities/get-capability-module-data'

export default async function Page({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const { id, moduleId } = await params
  const tenant = await getAdminTenantDetail(id)

  if (!tenant) {
    notFound()
  }

  const data = await getCapabilityModuleData({
    moduleId,
    tenant: {
      clientId: tenant.clientId,
      clientName: tenant.clientName,
      projectIds: tenant.projects.map(project => project.projectId),
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules
    },
    allowRegistryFallback: true
  })

  if (!data) {
    notFound()
  }

  return <GreenhouseAdminTenantCapabilityPreview clientId={tenant.clientId} clientName={tenant.clientName} data={data} />
}
