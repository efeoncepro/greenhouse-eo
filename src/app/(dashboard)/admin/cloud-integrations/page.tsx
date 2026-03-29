import type { Metadata } from 'next'

import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import AdminCloudIntegrationsView from '@/views/greenhouse/admin/AdminCloudIntegrationsView'

export const metadata: Metadata = { title: 'Cloud & Integrations | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getOperationsOverview()

  return <AdminCloudIntegrationsView data={data} />
}
