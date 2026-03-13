'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import { GH_CLIENT_NAV, GH_MESSAGES } from '@/config/greenhouse-nomenclature'

const GreenhouseUpdates = () => {
  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>{GH_CLIENT_NAV.updates.label}</Typography>
        <Typography color='text.secondary'>{GH_MESSAGES.subtitle_updates}</Typography>
      </Box>

      <ExecutiveCardShell title={GH_MESSAGES.updates_title} subtitle={GH_MESSAGES.updates_subtitle}>
        <EmptyState
          icon='tabler-bell'
          title={GH_MESSAGES.updates_empty_title}
          description={GH_MESSAGES.empty_updates}
          minHeight={280}
        />
      </ExecutiveCardShell>
    </Stack>
  )
}

export default GreenhouseUpdates
