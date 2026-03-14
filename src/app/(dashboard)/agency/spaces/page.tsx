import { Suspense } from 'react'

import { getAgencySpacesHealth } from '@/lib/agency/agency-queries'
import AgencySpacesView from '@/views/agency/AgencySpacesView'

export const dynamic = 'force-dynamic'

export default async function AgencySpacesPage() {
  const spaces = await getAgencySpacesHealth().catch(() => [])

  return (
    <Suspense>
      <AgencySpacesView spaces={spaces} />
    </Suspense>
  )
}
