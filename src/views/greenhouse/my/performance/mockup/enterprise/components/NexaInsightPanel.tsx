'use client'

// TASK-1075 — the coaching module: real Nexa mark + 2nd-person narrative + the action.
// Collaborator coaching voice (NOT commercial). Pairs beside the causal chain.
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import GreenhouseNexaAnimatedMark from '@/components/greenhouse/primitives/GreenhouseNexaAnimatedMark'

import PerfPanel from './PerfPanel'
import type { editorialBrief } from '../data'

const NexaInsightPanel = ({ nexa }: { nexa: typeof editorialBrief.nexa }) => {
  const theme = useTheme()

  return (
    <PerfPanel>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <GreenhouseNexaAnimatedMark kind='badgeIcon' tone='fullColor' size='medium' decorative dataCapture='brief-nexa-mark' />
          <Box>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Nexa
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.disabled' }}>
              análisis {nexa.lastAnalysis}
            </Typography>
          </Box>
        </Stack>
        <Typography variant='body1' sx={{ color: 'text.primary', flex: 1 }}>
          {nexa.narrative}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            px: 2,
            py: 1.25,
            borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          <i className='tabler-arrow-guide' style={{ fontSize: 16, marginTop: 2, color: theme.palette.primary.main }} aria-hidden='true' />
          <Typography variant='body2' sx={{ color: 'primary.main', fontWeight: 600 }}>
            {nexa.action}
          </Typography>
        </Box>
      </Stack>
    </PerfPanel>
  )
}

export default NexaInsightPanel
