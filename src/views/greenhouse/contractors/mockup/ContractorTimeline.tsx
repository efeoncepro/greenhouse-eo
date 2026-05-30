'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { ContractorTimelineStep } from './types'

const getStepMeta = (status: ContractorTimelineStep['status']) => {
  switch (status) {
    case 'done':
      return { icon: 'tabler-check', color: 'success.main', bgcolor: 'success.main', label: 'Completado' }
    case 'current':
      return { icon: 'tabler-circle-dot', color: 'primary.main', bgcolor: 'primary.main', label: 'Actual' }
    case 'blocked':
      return { icon: 'tabler-alert-triangle', color: 'error.main', bgcolor: 'error.main', label: 'Bloqueado' }
    default:
      return { icon: 'tabler-circle', color: 'text.disabled', bgcolor: 'text.disabled', label: 'Pendiente' }
  }
}

const ContractorTimeline = ({ steps }: { steps: ContractorTimelineStep[] }) => {
  const theme = useTheme()

  return (
    <Stack spacing={0}>
      {steps.map((step, index) => {
        const meta = getStepMeta(step.status)
        const isLast = index === steps.length - 1

        return (
          <Stack key={step.id} direction='row' spacing={3} alignItems='stretch'>
            <Stack alignItems='center' sx={{ pt: 0.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: meta.color,
                  bgcolor: alpha(meta.bgcolor === 'text.disabled' ? theme.palette.text.disabled : theme.palette[meta.bgcolor.split('.')[0] as 'success' | 'primary' | 'error'].main, 0.12)
                }}
                aria-label={meta.label}
              >
                <i className={meta.icon} aria-hidden='true' />
              </Box>
              {!isLast ? <Box sx={{ width: '2px', flex: 1, minHeight: 28, bgcolor: 'divider', my: 1 }} /> : null}
            </Stack>
            <Box sx={{ pb: isLast ? 0 : 4, minWidth: 0 }}>
              <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap'>
                <Typography variant='subtitle2'>{step.label}</Typography>
                {step.timestamp ? (
                  <Typography variant='caption' color='text.secondary'>
                    {step.timestamp}
                  </Typography>
                ) : null}
              </Stack>
              <Typography variant='body2' color='text.secondary'>
                {step.detail}
              </Typography>
            </Box>
          </Stack>
        )
      })}
    </Stack>
  )
}

export default ContractorTimeline
