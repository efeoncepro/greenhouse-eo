'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencyPulseKpis } from '@/lib/agency/agency-queries'

type Props = {
  kpis: AgencyPulseKpis | null
}

const formatSync = (iso: string | null) => {
  if (!iso) return 'Sincronizando…'

  try {
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const PulseGlobalHeader = ({ kpis }: Props) => (
  <Card
    elevation={0}
    sx={{
      p: 3,
      border: `1px solid ${GH_COLORS.neutral.border}`,
      borderRadius: 3,
      bgcolor: 'background.paper'
    }}
  >
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'flex-end' }} spacing={1}>
      <Box>
        <Typography
          variant='h5'
          sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}
        >
          {GH_AGENCY.pulse_title}
        </Typography>
        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
          {GH_AGENCY.pulse_subtitle}
        </Typography>
      </Box>
      {kpis ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap='wrap' useFlexGap>
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
            {GH_AGENCY.meta_spaces(kpis.totalSpaces)}
          </Typography>
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
            {GH_AGENCY.meta_projects(kpis.totalProjects)}
          </Typography>
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
            {GH_AGENCY.meta_sync(formatSync(kpis.lastSyncedAt))}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  </Card>
)

export default PulseGlobalHeader
