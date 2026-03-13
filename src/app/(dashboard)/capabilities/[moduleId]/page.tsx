import { notFound } from 'next/navigation'

import GreenhouseCapabilityModule from '@views/greenhouse/GreenhouseCapabilityModule'

import { getCapabilityModuleData } from '@/lib/capabilities/get-capability-module-data'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Page({ params }: { params: Promise<{ moduleId: string }> }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    notFound()
  }

  const { moduleId } = await params

  const data = await getCapabilityModuleData({
    moduleId,
    tenant
  })

  if (!data) {
    notFound()
  }

  return <GreenhouseCapabilityModule clientName={tenant.clientName} data={data} />
}
