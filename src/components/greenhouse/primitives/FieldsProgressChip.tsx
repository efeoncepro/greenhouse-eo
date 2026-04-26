'use client'

import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

export interface FieldsProgressChipProps {
  filled: number
  total: number

  /** Screen reader announcement. Shown via role='status' + aria-live='polite'. */
  srLabel: (filled: number, total: number) => string

  /** Visual suffix after the animated counter. Example: (total) => `de ${total} campos`. */
  suffix: (total: number) => string

  /**
   * TASK-615: when filled === total, the chip swaps the counter for this label
   * so the strip stops shouting "X de N campos" and starts confirming the
   * next allowed action ("Lista para emitir").
   */
  readyLabel?: string

  /**
   * TASK-615: optional caption rendered under the counter as the next-step
   * hint. Carries semantic guidance instead of pure tally — exactly what the
   * spec asks for ("orientación contextual, no solo conteo").
   */
  nextStepHint?: string

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
  readyLabel,
  nextStepHint,
  testId
}: FieldsProgressChipProps) => {
  const theme = useTheme()

  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const isReady = total > 0 && filled >= total
  const colorKey = resolveColor(percent)
  const progressColor = isReady ? theme.palette.success.main : theme.palette[colorKey].main
  const trackColor = alpha(theme.palette.text.primary, 0.08)
  const showReady = isReady && readyLabel

  return (
    <Stack
      direction='row'
      spacing={1.25}
      alignItems={nextStepHint ? 'flex-start' : 'center'}
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
          mt: nextStepHint ? 0.75 : 0,
          borderRadius: 999,
          backgroundColor: trackColor,
          '& .MuiLinearProgress-bar': {
            backgroundColor: progressColor,
            borderRadius: 999
          }
        }}
      />
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography
          variant='caption'
          sx={{
            lineHeight: 1.2,
            color: showReady ? 'success.main' : 'text.secondary',
            whiteSpace: 'nowrap',
            fontWeight: showReady ? 600 : 400
          }}
        >
          {showReady ? (
            <Stack direction='row' spacing={0.5} alignItems='center'>
              <Box
                component='i'
                className='tabler-circle-check'
                aria-hidden='true'
                sx={{ fontSize: 14 }}
              />
              <Box component='span'>{readyLabel}</Box>
            </Stack>
          ) : (
            <>
              <Box component='span' sx={{ color: 'text.primary', fontWeight: 500, mr: 0.5 }}>
                <AnimatedCounter value={filled} format='integer' />
              </Box>
              {suffix(total)}
            </>
          )}
        </Typography>
        {nextStepHint && !showReady ? (
          <Typography
            variant='caption'
            sx={{
              lineHeight: 1.2,
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              fontStyle: 'italic'
            }}
          >
            {nextStepHint}
          </Typography>
        ) : null}
      </Stack>
      <Box component='span' sx={visuallyHidden}>
        {srLabel(filled, total)}
      </Box>
    </Stack>
  )
}

export default FieldsProgressChip
