'use client'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { typographyScale } from '@/components/theme/typography-tokens'

/**
 * GreenhouseStatusDot — the canonical inline status dot (TASK-1053 Fase B Slice B2).
 *
 * A small colored dot + label for status in dense lists/timelines (● Activo,
 * ● Bloqueado) — lighter than a chip. Standardizes a pattern repeated ~15× inline
 * (lifecycle timelines, onboarding inbox, reliability ribbon, dashboards).
 *
 * - **Color never alone (WCAG 1.4.1):** the dot color is NEVER the only signal —
 *   a visible `label` OR an `ariaLabel` is REQUIRED (TS union enforces it). For a
 *   dot with no visible text, pass `ariaLabel` so screen readers announce state.
 * - **Tone = semantic role** (`success`/`warning`/`error`/`info`) or `neutral`.
 *   The dot fill is the role `main` (a saturated indicator reads as status); the
 *   label is `text.primary`. Non-text graphic ≥3:1 vs surface by construction.
 * - **`pulse`** adds a soft live-pulse ring (respects `prefers-reduced-motion`).
 */
export type GreenhouseStatusDotTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
export type GreenhouseStatusDotSize = 'sm' | 'md'

interface BaseProps {
  tone?: GreenhouseStatusDotTone
  size?: GreenhouseStatusDotSize
  /** Soft live-pulse ring (active/online). Honors reduced-motion. */
  pulse?: boolean
  /** Static soft halo ring around the dot (a more polished resting indicator). */
  halo?: boolean
  sx?: SxProps<Theme>
  dataCapture?: string
}

// Color-never-alone: require a visible label OR an aria-label.
export type GreenhouseStatusDotProps = BaseProps &
  ({ label: string; ariaLabel?: string } | { label?: undefined; ariaLabel: string })

const DOT_SIZE = { sm: 8, md: 10 } as const

const dotColor = (tone: GreenhouseStatusDotTone) =>
  tone === 'neutral' ? 'var(--mui-palette-text-disabled)' : `var(--mui-palette-${tone}-main)`

const GreenhouseStatusDot = ({
  tone = 'neutral',
  size = 'sm',
  pulse = false,
  halo = false,
  label,
  ariaLabel,
  sx,
  dataCapture
}: GreenhouseStatusDotProps) => {
  const dot = DOT_SIZE[size]
  const color = dotColor(tone)
  const labelTypography = size === 'sm' ? typographyScale.labelSm : typographyScale.labelMd

  return (
    <Box
      component='span'
      data-capture={dataCapture}
      data-tone={tone}
      aria-label={label ? undefined : ariaLabel}
      role={label ? undefined : 'img'}
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          ...(label ? labelTypography : {}),
          color: 'var(--mui-palette-text-primary)'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        component='span'
        aria-hidden
        sx={{
          position: 'relative',
          flexShrink: 0,
          inlineSize: dot,
          blockSize: dot,
          borderRadius: '50%',
          backgroundColor: color,
          ...(halo && {
            boxShadow: `0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)`
          }),
          ...(pulse && {
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.35,
              animation: 'gh-status-dot-pulse 2.4s cubic-bezier(0.2, 0, 0, 1) infinite'
            },
            '@keyframes gh-status-dot-pulse': {
              '0%': { transform: 'scale(1)', opacity: 0.35 },
              '70%': { transform: 'scale(2.2)', opacity: 0 },
              '100%': { transform: 'scale(2.2)', opacity: 0 }
            },
            '@media (prefers-reduced-motion: reduce)': {
              '&::after': { animation: 'none' }
            }
          })
        }}
      />
      {label}
    </Box>
  )
}

export default GreenhouseStatusDot
