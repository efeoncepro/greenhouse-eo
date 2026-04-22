'use client'

import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

export interface FieldsProgressChipProps {
  filled: number
  total: number

  /** Screen reader announcement. Shown via role='status' + aria-live='polite'. */
  srLabel: (filled: number, total: number) => string

  /** Visual suffix after the animated counter. Example: (total) => `de ${total} campos`. */
  suffix: (total: number) => string

  testId?: string
}

const resolveColor = (percent: number): 'success' | 'warning' | 'error' => {
  if (percent >= 80) return 'success'
  if (percent >= 50) return 'warning'

  return 'error'
}

/**
 * Enterprise-grade form completion counter.
 *
 * Uses a short LinearProgress bar (60x3px) + AnimatedCounter + "N de M campos"
 * label in a single compact row. Replaces the earlier 24px ApexCharts radial
 * that was too small to carry visual signal cleanly. This is the pattern
 * shipped by Stripe / GitHub / Linear for inline progress indicators.
 *
 * Announces progress via `role='status'` + `aria-live='polite'` so screen
 * readers get the full context (`"Cotización completa en X%. Faltan Y campos."`).
 *
 * Color of the bar + counter text shifts from error (<50%) → warning (50-79%)
 * → success (≥80%) so the counter carries semantic signal in addition to the
 * numeric progress.
 */
const FieldsProgressChip = ({
  filled,
  total,
  srLabel,
  suffix,
  testId
}: FieldsProgressChipProps) => {
  const theme = useTheme()

  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const colorKey = resolveColor(percent)
  const progressColor = theme.palette[colorKey].main
  const trackColor = alpha(theme.palette.text.primary, 0.08)

  return (
    <Stack
      direction='row'
      spacing={1.25}
      alignItems='center'
      role='status'
      aria-live='polite'
      aria-atomic='true'
      data-testid={testId}
      sx={{
        px: 0.5,
        py: 0.25,
        color: 'text.secondary'
      }}
    >
      <LinearProgress
        aria-hidden='true'
        variant='determinate'
        value={percent}
        sx={{
          width: 56,
          height: 3,
          borderRadius: 999,
          backgroundColor: trackColor,
          '& .MuiLinearProgress-bar': {
            backgroundColor: progressColor,
            borderRadius: 999
          }
        }}
      />
      <Typography
        variant='caption'
        sx={{ lineHeight: 1.2, color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        <Box component='span' sx={{ color: 'text.primary', fontWeight: 500, mr: 0.5 }}>
          <AnimatedCounter value={filled} format='integer' />
        </Box>
        {suffix(total)}
      </Typography>
      <Box
        component='span'
        aria-hidden='false'
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap'
        }}
      >
        {srLabel(filled, total)}
      </Box>
    </Stack>
  )
}

export default FieldsProgressChip
