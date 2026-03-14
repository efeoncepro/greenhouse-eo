import { Suspense } from 'react'

import { getAgencyCapacity } from '@/lib/agency/agency-queries'
import AgencyCapacityView from '@/views/agency/AgencyCapacityView'

export const dynamic = 'force-dynamic'

export default async function AgencyCapacityPage() {
  const capacity = await getAgencyCapacity().catch(() => null)

  return (
    <Suspense>
      <AgencyCapacityView capacity={capacity} />
    </Suspense>
  )
}
