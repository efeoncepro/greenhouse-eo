import { Suspense } from 'react'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  getAgencyPulseKpis,
  getAgencySpacesHealth,
  getAgencyStatusMix,
  getAgencyWeeklyActivity
} from '@/lib/agency/agency-queries'
import type { AgencyPulseKpis, AgencySpaceHealth } from '@/lib/agency/agency-queries'
import AgencyPulseView from '@/views/agency/AgencyPulseView'

export const dynamic = 'force-dynamic'

const deriveKpisFromSpaces = (spaces: AgencySpaceHealth[]): AgencyPulseKpis => {
  const withRpa = spaces.filter(s => s.rpaAvg !== null)
  const withOtd = spaces.filter(s => s.otdPct !== null)

  return {
    rpaGlobal: withRpa.length > 0
      ? withRpa.reduce((sum, s) => sum + (s.rpaAvg ?? 0), 0) / withRpa.length
      : null,
    assetsActivos: spaces.reduce((sum, s) => sum + s.assetsActivos, 0),
    otdPctGlobal: withOtd.length > 0
      ? withOtd.reduce((sum, s) => sum + (s.otdPct ?? 0), 0) / withOtd.length
      : null,
    feedbackPendiente: spaces.reduce((sum, s) => sum + s.feedbackPendiente, 0),
    totalSpaces: spaces.length,
    totalProjects: spaces.reduce((sum, s) => sum + s.projectCount, 0),
    lastSyncedAt: null
  }
}

export default async function AgencyPulsePage() {
  const tenant = await getTenantContext()

  const [kpisResult, spaces, statusMix, weeklyActivity] = await Promise.all([
    getAgencyPulseKpis().catch(err => { console.error('[AgencyPulse] KPI query error:', err); return null }),
    getAgencySpacesHealth().catch(err => { console.error('[AgencyPulse] Spaces fetch error:', err); return [] }),
    getAgencyStatusMix().catch(err => { console.error('[AgencyPulse] StatusMix fetch error:', err); return [] }),
    getAgencyWeeklyActivity().catch(err => { console.error('[AgencyPulse] Weekly fetch error:', err); return [] })
  ])

  const kpis = kpisResult ?? (spaces.length > 0 ? deriveKpisFromSpaces(spaces) : null)

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
