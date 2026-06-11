'use client'

import Box from '@mui/material/Box'
import { alpha, keyframes, type SxProps, type Theme } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

import { GREENHOUSE_NEXA_BRAND_COLORS } from './greenhouse-nexa-brand-controller'
import {
  GREENHOUSE_THINKING_BEAT_MOTION,
  type GreenhouseThinkingBeatKind,
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
  sx?: SxProps<Theme>
}

const thinkingBeatPulse = keyframes({
  '0%, 80%, 100%': { opacity: 0.35, transform: 'translateY(0)' },
  '40%': { opacity: 1, transform: 'translateY(-3px)' }
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
  sx
}: GreenhouseThinkingBeatProps) => {
  const reduced = useReducedMotion()
  const variantConfig = resolveGreenhouseThinkingBeatVariant(variant)
  const kindConfig = resolveGreenhouseThinkingBeatKind(kind)
  const resolvedAriaLabel = ariaLabel ?? kindConfig.ariaLabel
  const resolvedDotSize = dotSize ?? variantConfig.dotSize

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
      {[0, 1, 2].map(dot => (
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
              backgroundColor: colors[dot],
              opacity: active ? 0.45 : 0.28,
              animation:
                active && !reduced
                  ? `${thinkingBeatPulse} ${GREENHOUSE_THINKING_BEAT_MOTION.durationMs}ms cubic-bezier(0.2, 0, 0, 1) ${
                      dot * GREENHOUSE_THINKING_BEAT_MOTION.staggerMs
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
