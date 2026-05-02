'use client'

import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import CapacityOverview from '@/components/agency/CapacityOverview'
import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type { CapacityBreakdownData } from '@/components/agency/CapacityOverview'

type Props = {
  capacity: CapacityBreakdownData | null
}

const AgencyCapacityView = ({ capacity }: Props) => (
  <Stack spacing={4}>
    {/* Header */}
    <Card
      elevation={0}
      sx={{ p: 3, border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`, borderRadius: 3, bgcolor: 'background.paper' }}
    >
      <Typography variant='h5' sx={{ fontWeight: 700, color: theme => theme.palette.customColors.midnight, mb: 0.5 }}>
        {GH_AGENCY.capacity_title}
      </Typography>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {GH_AGENCY.capacity_subtitle}
      </Typography>
    </Card>

    <SectionErrorBoundary sectionName='agency-capacity' description='No pudimos cargar la capacidad del equipo.'>
      <CapacityOverview capacity={capacity} />
    </SectionErrorBoundary>
  </Stack>
)

export default AgencyCapacityView
