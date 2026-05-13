import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import GreenhouseDeliveryAnalytics from '@/views/greenhouse/GreenhouseDeliveryAnalytics'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
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

  // TASK-827 Slice 4 — Page guard canonical resolver-based.
  await requireViewCodeAccess('cliente.analytics')

  return <GreenhouseDeliveryAnalytics />
}

export default Page
