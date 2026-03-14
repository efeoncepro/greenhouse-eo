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
    getAgencyPulseKpis().catch(err => { console.error('[AgencyPulse] KPI fetch error:', err); return null }),
    getAgencySpacesHealth().catch(err => { console.error('[AgencyPulse] Spaces fetch error:', err); return [] }),
    getAgencyStatusMix().catch(err => { console.error('[AgencyPulse] StatusMix fetch error:', err); return [] }),
    getAgencyWeeklyActivity().catch(err => { console.error('[AgencyPulse] Weekly fetch error:', err); return [] })
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
