'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { AxisProgress, AxisStatus, type GreenhouseStepperProgressStep } from '@/components/greenhouse/primitives'

const steps: GreenhouseStepperProgressStep[] = [
  { id: 'brief', label: 'Brief', description: 'Context captured', state: 'complete', meta: 'Ready' },
  { id: 'direction', label: 'Direction', description: 'Review in progress', state: 'active', meta: 'Current' },
  { id: 'delivery', label: 'Delivery', description: 'Waiting for approval', state: 'blocked', meta: 'Blocked' }
]

/** Opt-in AXIS adapter fixture: the lab is evidence, not a product surface. */
const AxisAdaptersLabView = () => (
  <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 3, md: 6 } }}>
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant='overline'>AXIS adapter pilot · 0.1.4</Typography>
        <Typography variant='h3'>Shared contracts, native implementations</Typography>
        <Typography color='text.secondary'>Greenhouse consumes the AXIS registry and renders MUI/Vuexy primitives locally.</Typography>
      </Stack>
      <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
        <AxisStatus label='Neutral' state='neutral' />
        <AxisStatus label='Ready' state='success' />
        <AxisStatus label='Needs review' state='warning' />
        <AxisStatus label='Blocked' state='danger' hint='Requires an approval before continuing' />
      </Stack>
      <AxisProgress steps={steps} title='Delivery status' description='Keyboard and mobile fixture for efeonce.progress.' variant='horizontal' />
      <AxisProgress steps={steps} title='Vertical variant' variant='vertical' />
    </Stack>
  </Box>
)

export default AxisAdaptersLabView
