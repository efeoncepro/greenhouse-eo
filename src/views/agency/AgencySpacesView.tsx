'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import SpaceCard from '@/components/agency/SpaceCard'
import SpaceFilters from '@/components/agency/SpaceFilters'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'

type Props = {
  spaces: AgencySpaceHealth[]
}

const AgencySpacesView = ({ spaces }: Props) => {
  const [filtered, setFiltered] = useState<AgencySpaceHealth[]>(spaces)

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Card
        elevation={0}
        sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
          {GH_AGENCY.spaces_title}
        </Typography>
        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
          {GH_AGENCY.spaces_subtitle}
        </Typography>
      </Card>

      <SectionErrorBoundary sectionName='agency-spaces-filters' description='No pudimos cargar los filtros.'>
        <SpaceFilters spaces={spaces} onChange={setFiltered} />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName='agency-spaces-grid' description='No pudimos cargar los Spaces.'>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <i className='tabler-search' style={{ fontSize: '2rem', color: GH_COLORS.neutral.border }} />
            <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary, mt: 2 }}>
              {GH_AGENCY.empty_spaces}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))'
              }
            }}
          >
            {filtered.map(space => (
              <SpaceCard key={space.clientId} space={space} />
            ))}
          </Box>
        )}
      </SectionErrorBoundary>
    </Stack>
  )
}

export default AgencySpacesView
