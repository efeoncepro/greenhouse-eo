import type { Metadata } from 'next'

import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import AdminOpsHealthView from '@/views/greenhouse/admin/AdminOpsHealthView'

export const metadata: Metadata = { title: 'Ops Health | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getOperationsOverview()

  return <AdminOpsHealthView data={data} />
}
