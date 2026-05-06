'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type { AgencyPulseKpis } from '@/lib/agency/agency-queries'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

type Props = {
  kpis: AgencyPulseKpis | null
}

const formatSync = (iso: string | null) => {
  if (!iso) return 'Sincronizando…'

  try {
    return formatGreenhouseDateTime(new Date(iso), {
  dateStyle: 'medium',
  timeStyle: 'short'
}, 'es-MX')
  } catch {
    return iso
  }
}

const PulseGlobalHeader = ({ kpis }: Props) => (
  <Card
    elevation={0}
    sx={{
      p: 3,
      border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
      borderRadius: 3,
      bgcolor: 'background.paper'
    }}
  >
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'flex-end' }} spacing={1}>
      <Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: theme => theme.palette.customColors.midnight, mb: 0.5 }}
        >
          {GH_AGENCY.pulse_title}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {GH_AGENCY.pulse_subtitle}
        </Typography>
      </Box>
      {kpis ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap='wrap' useFlexGap>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {GH_AGENCY.meta_spaces(kpis.totalSpaces)}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {GH_AGENCY.meta_projects(kpis.totalProjects)}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {GH_AGENCY.meta_sync(formatSync(kpis.lastSyncedAt))}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  </Card>
)

export default PulseGlobalHeader
