'use client'

import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import CapacityOverview from '@/components/agency/CapacityOverview'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencyCapacityOverview } from '@/lib/agency/agency-queries'

type Props = {
  capacity: AgencyCapacityOverview | null
}

const AgencyCapacityView = ({ capacity }: Props) => (
  <Stack spacing={4}>
    {/* Header */}
    <Card
      elevation={0}
      sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
    >
      <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
        {GH_AGENCY.capacity_title}
      </Typography>
      <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
        {GH_AGENCY.capacity_subtitle}
      </Typography>
    </Card>

    <SectionErrorBoundary sectionName='agency-capacity' description='No pudimos cargar la capacidad del equipo.'>
      <CapacityOverview capacity={capacity} />
    </SectionErrorBoundary>
  </Stack>
)

export default AgencyCapacityView
