'use client'

import Box from '@mui/material/Box'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type { AgencyPulseKpis } from '@/lib/agency/agency-queries'
import {
  getAgencyMetricFooterLabel,
  getAgencyMetricStatusColor,
  getAgencyMetricStatusLabel,
  getAgencyMetricSupportLabel,
  getAgencyMetricTone
} from './metric-trust'

type Props = {
  kpis: AgencyPulseKpis | null
}

const PulseGlobalKpis = ({ kpis }: Props) => {
  const rpa = kpis?.rpaGlobal ?? null
  const otd = kpis?.otdPctGlobal ?? null
  const rpaMetric = kpis?.rpaMetric ?? null
  const otdMetric = kpis?.otdMetric ?? null

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
        avatarColor={getAgencyMetricTone(rpaMetric)}
        subtitle={getAgencyMetricSupportLabel(rpaMetric)}
        statusLabel={getAgencyMetricStatusLabel(rpaMetric)}
        statusColor={getAgencyMetricStatusColor(rpaMetric)}
        footer={getAgencyMetricFooterLabel(rpaMetric)}
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
        avatarColor={getAgencyMetricTone(otdMetric)}
        subtitle={getAgencyMetricSupportLabel(otdMetric)}
        statusLabel={getAgencyMetricStatusLabel(otdMetric)}
        statusColor={getAgencyMetricStatusColor(otdMetric)}
        footer={getAgencyMetricFooterLabel(otdMetric)}
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
