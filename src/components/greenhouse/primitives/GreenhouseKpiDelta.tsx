'use client'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { typographyScale } from '@/components/theme/typography-tokens'

/**
 * GreenhouseKpiDelta — the canonical inline KPI delta (TASK-1053 Fase B Slice B2).
 *
 * The "+12.4% ▲" / "−5.0% ▼" that sits next to a big KPI number. Standardizes a
 * pattern repeated ~15× inline (Home, Organization tabs, Finance, People) so the
 * color + sign + icon are consistent and accessible.
 *
 * - **Color never alone (WCAG 1.4.1):** always renders a sign (`+`/`−`) AND a
 *   direction arrow, so the up/down meaning survives without color.
 * - **AA color:** consumes the curated tonal ink from `theme.greenhouseSemantic`
 *   (success/error) — AA on paper in light AND dark (the ink/darkFg) — NOT
 *   `palette.<role>.main`. Neutral (sub-threshold) → `text.secondary`.
 * - **Semantics, not chart directional:** this is UI feedback (good/bad), so it
 *   uses the semantic roles, not `GH_COLORS.chart.directional` (that is for chart
 *   series). `invert` flips good/bad when up is bad (churn, latency, burn).
 * - **tabular-nums** so deltas align in columns.
 *
 * Two variants: `text` (plain colored inline — the restrained 2026 default,
 * Linear/Stripe) and `tonal` (soft pill using the tonal surface + ink).
 */
export type GreenhouseKpiDeltaVariant = 'text' | 'tonal'
export type GreenhouseKpiDeltaSize = 'sm' | 'md'

export interface GreenhouseKpiDeltaProps {
  /** The delta value, e.g. `12.4` or `-5`. */
  value: number
  /** `percent` appends `%`; `number` uses `unit`. Default `percent`. */
  format?: 'percent' | 'number'
  /** Suffix when `format='number'` (e.g. `'pts'`). Ignored for percent. */
  unit?: string
  /** When up is bad (churn/latency/burn): positive value → negative color. */
  invert?: boolean
  /** `|value|` below this renders neutral (no good/bad color). Default `0`. */
  neutralThreshold?: number
  /** Fraction digits. Default `1`. */
  fractionDigits?: number
  variant?: GreenhouseKpiDeltaVariant
  size?: GreenhouseKpiDeltaSize
  /** Hide the direction arrow (sign still present). Default `false`. */
  hideIcon?: boolean
  /** Override the screen-reader label. Default derives from value + direction. */
  ariaLabel?: string
  sx?: SxProps<Theme>
  dataCapture?: string
}

export type GreenhouseKpiDeltaDirection = 'positive' | 'negative' | 'neutral'

type Direction = GreenhouseKpiDeltaDirection

/** Pure good/bad resolver — exported for tests. Up is good unless `invert`. */
export const resolveKpiDeltaDirection = (value: number, neutralThreshold: number, invert: boolean): Direction => {
  if (Math.abs(value) < neutralThreshold) return 'neutral'
  const isUp = value > 0

  if (value === 0) return 'neutral'

  // good/bad: up is good unless inverted.
  return (isUp ? !invert : invert) ? 'positive' : 'negative'
}

const ICON_BY_TREND = {
  up: 'tabler-arrow-up-right',
  down: 'tabler-arrow-down-right',
  flat: 'tabler-minus'
} as const

const GreenhouseKpiDelta = ({
  value,
  format = 'percent',
  unit,
  invert = false,
  neutralThreshold = 0,
  fractionDigits = 1,
  variant = 'text',
  size = 'sm',
  hideIcon = false,
  ariaLabel,
  sx,
  dataCapture
}: GreenhouseKpiDeltaProps) => {
  const direction = resolveKpiDeltaDirection(value, neutralThreshold, invert)
  const isUp = value > 0
  const trend = value === 0 ? 'flat' : isUp ? 'up' : 'down'

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const magnitude = Math.abs(value).toFixed(fractionDigits)
  const suffix = format === 'percent' ? '%' : unit ? ` ${unit}` : ''
  const text = `${sign}${magnitude}${suffix}`

  const labelTypography = size === 'sm' ? typographyScale.labelSm : typographyScale.labelMd
  const iconSize = size === 'sm' ? 13 : 15

  const computedAria =
    ariaLabel ??
    `${sign === '−' ? 'baja' : sign === '+' ? 'sube' : 'sin cambio'} ${magnitude}${format === 'percent' ? ' por ciento' : unit ? ` ${unit}` : ''}`

  return (
    <Box
      component='span'
      data-capture={dataCapture}
      data-direction={direction}
      aria-label={computedAria}
      sx={theme => {
        // role: positive→success, negative→error, neutral→text.secondary.
        // AA ink from greenhouseSemantic (mode-aware) — never palette.<role>.main.
        const role = direction === 'positive' ? 'success' : direction === 'negative' ? 'error' : null
        const ink = role ? theme.greenhouseSemantic[role].tonalText : 'var(--mui-palette-text-secondary)'
        const surface = role ? theme.greenhouseSemantic[role].tonalSurface : 'var(--mui-palette-action-hover)'

        return {
          ...labelTypography,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          color: ink,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          ...(variant === 'tonal' && {
            backgroundColor: surface,
            borderRadius: 1,
            paddingInline: size === 'sm' ? 1 : 1.5,
            paddingBlock: 0.25
          }),
          ...(Array.isArray(sx) ? Object.assign({}, ...sx) : sx)
        }
      }}
    >
      {!hideIcon && <i aria-hidden className={ICON_BY_TREND[trend]} style={{ fontSize: iconSize }} />}
      {text}
    </Box>
  )
}

export default GreenhouseKpiDelta
