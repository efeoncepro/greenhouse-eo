import type { Metadata } from 'next'

import CommercialPartiesAdminView from '@/views/greenhouse/admin/commercial-parties/CommercialPartiesAdminView'
import { getCommercialPartiesDashboardData } from '@/views/greenhouse/admin/commercial-parties/data'

export const metadata: Metadata = { title: 'Commercial Parties | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getCommercialPartiesDashboardData()

  return <CommercialPartiesAdminView data={data} />
}
