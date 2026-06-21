'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

export interface FieldsProgressChipProps {
  filled: number
  total: number
  variant?: 'chip' | 'rail'

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
 * In-progress state stays neutral/primary; only the complete state turns
 * success. This avoids yelling error/warning while the user is simply early in
 * the flow.
 */
const FieldsProgressChip = ({
  filled,
  total,
  variant = 'chip',
  srLabel,
  suffix,
  readyLabel,
  nextStepHint,
  testId
}: FieldsProgressChipProps) => {
  const theme = useTheme()

  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const isReady = total > 0 && filled >= total
  const progressColor = isReady ? theme.palette.success.main : theme.palette.primary.main
  const trackColor = alpha(theme.palette.text.primary, 0.09)
  const showReady = isReady && readyLabel
  const isRail = variant === 'rail'

  return (
    <Stack
      spacing={isRail ? 0.75 : 0.6}
      role='status'
      aria-live='polite'
      aria-atomic='true'
      data-testid={testId}
      sx={theme => ({
        minWidth: isRail ? 0 : { xs: 0, sm: isReady ? 360 : 340 },
        maxWidth: isRail ? 560 : isReady ? 480 : 460,
        width: '100%',
        px: isRail ? 0 : 1.25,
        py: isRail ? 0 : 0.75,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: isRail
          ? 0
          : `1px solid ${isReady ? alpha(theme.palette.success.main, 0.32) : alpha(theme.palette.primary.main, 0.16)}`,
        backgroundColor: isRail
          ? 'transparent'
          : isReady
            ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.14 : 0.065)
            : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.035),
        color: 'text.secondary',
        overflow: 'hidden'
      })}
    >
      <Stack direction='row' spacing={1.25} alignItems='center' justifyContent='space-between' sx={{ minWidth: 0 }}>
        <Typography
          variant='body2'
          sx={{
            lineHeight: 1.35,
            color: showReady ? 'success.main' : 'text.primary',
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
              <Box component='span' sx={{ color: 'text.primary', fontWeight: 600, mr: 0.5 }}>
                <AnimatedCounter value={filled} format='integer' />
              </Box>
              <Box component='span' sx={{ color: 'text.secondary' }}>
                {suffix(total)}
              </Box>
            </>
          )}
        </Typography>
        {!showReady ? (
          <Box
            component='span'
            sx={theme => ({
              width: isRail ? 42 : 34,
              height: isRail ? 24 : 20,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: theme.palette.primary.main,
              backgroundColor: isRail ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.08),
              fontVariantNumeric: 'tabular-nums'
            })}
          >
            <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 600, lineHeight: 1 }}>
              {percent}%
            </Typography>
          </Box>
        ) : null}
      </Stack>

      <Box
        aria-hidden='true'
        sx={{
          position: 'relative',
          height: isRail ? 8 : 5,
          borderRadius: 999,
          backgroundColor: trackColor,
          overflow: 'hidden',
          boxShadow: isRail ? `inset 0 0 0 1px ${alpha(theme.palette.text.primary, 0.025)}` : 'none'
        }}
      >
        <Box
          sx={theme => ({
            width: `${Math.max(0, Math.min(100, percent))}%`,
            height: '100%',
            borderRadius: 999,
            backgroundImage: isRail
              ? `linear-gradient(90deg, ${progressColor}, ${alpha(progressColor, 0.72)})`
              : undefined,
            backgroundColor: isRail ? undefined : progressColor,
            boxShadow: isRail ? `0 0 0 1px ${alpha(progressColor, 0.08)}, 0 8px 18px -12px ${alpha(progressColor, 0.65)}` : 'none',
            transition: theme.transitions.create('width', {
              duration: theme.transitions.duration.short,
              easing: theme.transitions.easing.easeOut
            }),
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none'
            }
          })}
        />
      </Box>

      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        {nextStepHint && !showReady ? (
          <Typography
            variant='caption'
            sx={{
              lineHeight: 1.2,
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 400
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
