'use client'

import Box from '@mui/material/Box'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type { AgencyPulseKpis } from '@/lib/agency/agency-queries'

type Props = {
  kpis: AgencyPulseKpis | null
}

const getRpaTone = (rpa: number | null): 'success' | 'warning' | 'error' => {
  if (rpa === null) return 'warning'
  if (rpa <= 1.5) return 'success'
  if (rpa <= 2.5) return 'warning'

  return 'error'
}

const getOtdTone = (pct: number | null): 'success' | 'warning' | 'error' => {
  if (pct === null) return 'warning'
  if (pct >= 90) return 'success'
  if (pct >= 70) return 'warning'

  return 'error'
}

const PulseGlobalKpis = ({ kpis }: Props) => {
  const rpa = kpis?.rpaGlobal ?? null
  const otd = kpis?.otdPctGlobal ?? null

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          xl: 'repeat(4, minmax(0, 1fr))'
        }
      }}
    >
      <HorizontalWithSubtitle
        title={GH_AGENCY.kpi_rpa}
        stats={rpa !== null ? rpa.toFixed(2) : '—'}
        avatarIcon='tabler-git-pull-request'
        avatarColor={getRpaTone(rpa)}
        subtitle={GH_AGENCY.rpa_semaphore(rpa)}
      />
      <HorizontalWithSubtitle
        title={GH_AGENCY.kpi_assets}
        stats={String(kpis?.assetsActivos ?? 0)}
        avatarIcon='tabler-layers-linked'
        avatarColor='primary'
        subtitle='Assets en movimiento'
      />
      <HorizontalWithSubtitle
        title={GH_AGENCY.kpi_otd}
        stats={otd !== null ? `${Math.round(otd)}%` : '—'}
        avatarIcon='tabler-clock-check'
        avatarColor={getOtdTone(otd)}
        subtitle={GH_AGENCY.otd_semaphore(otd)}
      />
      <HorizontalWithSubtitle
        title={GH_AGENCY.kpi_feedback}
        stats={String(kpis?.feedbackPendiente ?? 0)}
        avatarIcon='tabler-message-circle'
        avatarColor={(kpis?.feedbackPendiente ?? 0) > 0 ? 'warning' : 'secondary'}
        subtitle={(kpis?.feedbackPendiente ?? 0) > 0 ? 'Requiere atención' : 'Al día'}
      />
    </Box>
  )
}

export default PulseGlobalKpis
