'use client'

import Box from '@mui/material/Box'
import { alpha, keyframes, type SxProps, type Theme } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

import { GREENHOUSE_NEXA_BRAND_COLORS } from './greenhouse-nexa-brand-controller'
import {
  GREENHOUSE_THINKING_BEAT_MOTION,
  type GreenhouseThinkingBeatKind,
  type GreenhouseThinkingBeatMotion,
  type GreenhouseThinkingBeatVariant,
  resolveGreenhouseThinkingBeatKind,
  resolveGreenhouseThinkingBeatVariant
} from './greenhouse-thinking-beat-controller'

export type GreenhouseThinkingBeatProps = {
  variant?: GreenhouseThinkingBeatVariant
  kind?: GreenhouseThinkingBeatKind
  active?: boolean
  decorative?: boolean
  ariaLabel?: string
  dataCapture?: string
  /** Override the variant's dot size (px). For pairing inline with larger text. */
  dotSize?: number
  /** Cantidad de dots (default 3). Para indicadores más vivos, 4-5. */
  dotCount?: number
  /** Tipo de movimiento (default 'bounce'). 'wave' = barrido suave scale+opacity. */
  motion?: GreenhouseThinkingBeatMotion
  sx?: SxProps<Theme>
}

// bounce (default histórico): pulse + translateY.
const thinkingBeatPulse = keyframes({
  '0%, 80%, 100%': { opacity: 0.35, transform: 'translateY(0)' },
  '40%': { opacity: 1, transform: 'translateY(-3px)' }
})

// wave: barrido de brillo/escala (sin translateY) — más suave y "componiendo".
const thinkingBeatWave = keyframes({
  '0%, 70%, 100%': { opacity: 0.28, transform: 'scale(0.7)' },
  '35%': { opacity: 1, transform: 'scale(1.12)' }
})

const toSxArray = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : sx ? [sx] : [])

const dotColors = (theme: Theme, kind: GreenhouseThinkingBeatKind) => {
  const config = resolveGreenhouseThinkingBeatKind(kind)

  if (config.colorMode === 'nexa') {
    return [
      GREENHOUSE_NEXA_BRAND_COLORS.electricTeal,
      GREENHOUSE_NEXA_BRAND_COLORS.coreBlue,
      GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy
    ]
  }

  if (config.colorMode === 'primary') {
    return [theme.palette.primary.main, theme.palette.info.main, theme.palette.primary.dark]
  }

  if (config.colorMode === 'info') {
    return [theme.palette.info.main, theme.palette.primary.main, theme.palette.info.dark]
  }

  return [theme.palette.text.secondary, theme.palette.text.disabled, theme.palette.text.primary]
}

const GreenhouseThinkingBeat = ({
  variant = 'inline',
  kind = 'neutral',
  active = true,
  decorative = false,
  ariaLabel,
  dataCapture,
  dotSize,
  dotCount = 3,
  motion = 'bounce',
  sx
}: GreenhouseThinkingBeatProps) => {
  const reduced = useReducedMotion()
  const variantConfig = resolveGreenhouseThinkingBeatVariant(variant)
  const kindConfig = resolveGreenhouseThinkingBeatKind(kind)
  const resolvedAriaLabel = ariaLabel ?? kindConfig.ariaLabel
  const resolvedDotSize = dotSize ?? variantConfig.dotSize
  const dots = Array.from({ length: Math.max(1, Math.round(dotCount)) }, (_, i) => i)
  const keyframe = motion === 'wave' ? thinkingBeatWave : thinkingBeatPulse

  const animationDurationMs =
    motion === 'wave' ? GREENHOUSE_THINKING_BEAT_MOTION.waveDurationMs : GREENHOUSE_THINKING_BEAT_MOTION.durationMs

  const animationStaggerMs =
    motion === 'wave' ? GREENHOUSE_THINKING_BEAT_MOTION.waveStaggerMs : GREENHOUSE_THINKING_BEAT_MOTION.staggerMs

  return (
    <Box
      component='span'
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : resolvedAriaLabel}
      aria-live={decorative ? undefined : 'polite'}
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={variant}
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: variantConfig.gap,
          p: variantConfig.surface ? variantConfig.paddingBlock : 0,
          px: variantConfig.surface ? variantConfig.paddingInline : 0,
          borderRadius: 9999,
          verticalAlign: 'middle',
          flexShrink: 0,
          color: 'text.secondary',
          backgroundColor: variantConfig.surface ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
          border: variantConfig.surface ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}` : 0
        }),
        ...toSxArray(sx)
      ]}
    >
      {dots.map(dot => (
        <Box
          key={dot}
          component='span'
          sx={theme => {
            const colors = dotColors(theme, kind)

            return {
              display: 'block',
              inlineSize: resolvedDotSize,
              blockSize: resolvedDotSize,
              borderRadius: '50%',
              backgroundColor: colors[dot % colors.length],
              opacity: active ? 0.45 : 0.28,
              animation:
                active && !reduced
                  ? `${keyframe} ${animationDurationMs}ms cubic-bezier(0.2, 0, 0, 1) ${
                      dot * animationStaggerMs
                    }ms infinite`
                  : 'none',
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none'
              }
            }
          }}
        />
      ))}
    </Box>
  )
}

export default GreenhouseThinkingBeat
