import { Suspense } from 'react'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  getAgencyPulseKpis,
  getAgencySpacesHealth,
  getAgencyStatusMix,
  getAgencyWeeklyActivity
} from '@/lib/agency/agency-queries'
import AgencyPulseView from '@/views/agency/AgencyPulseView'

export const dynamic = 'force-dynamic'

export default async function AgencyPulsePage() {
  const tenant = await getTenantContext()

  const [kpis, spaces, statusMix, weeklyActivity] = await Promise.all([
    getAgencyPulseKpis().catch(() => null),
    getAgencySpacesHealth().catch(() => []),
    getAgencyStatusMix().catch(() => []),
    getAgencyWeeklyActivity().catch(() => [])
  ])

  return (
    <Suspense>
      <AgencyPulseView
        kpis={kpis}
        spaces={spaces}
        statusMix={statusMix}
        weeklyActivity={weeklyActivity}
        tenantName={tenant?.clientName ?? 'Efeonce'}
      />
    </Suspense>
  )
}
