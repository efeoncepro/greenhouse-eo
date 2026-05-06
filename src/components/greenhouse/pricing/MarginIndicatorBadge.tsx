'use client'

import Chip from '@mui/material/Chip'
import { alpha, useTheme } from '@mui/material/styles'

import { GH_COLORS, GH_PRICING } from '@/config/greenhouse-nomenclature'
import { formatPercent } from '@/lib/format'

export type MarginStatus = 'critical' | 'attention' | 'optimal' | 'overshoot'

export interface MarginIndicatorBadgeProps {

  /** Margen como fracción decimal. Ej: 0.32 = 32% */
  marginPct: number

  /** Meta de margen para el tier evaluado (todas en fracción decimal) */
  target: { min: number; opt: number; max: number }

  /** Tamaño del chip */
  size?: 'sm' | 'md'

  /** Si true (default), muestra el label de estado después del %. Si false, solo el %. */
  showLabel?: boolean
}

const classifyMargin = (marginPct: number, target: MarginIndicatorBadgeProps['target']): MarginStatus => {
  if (marginPct < target.min) return 'critical'
  if (marginPct < target.opt) return 'attention'
  if (marginPct <= target.max) return 'optimal'

  return 'overshoot'
}

const STATUS_META: Record<MarginStatus, { icon: string; tone: 'error' | 'warning' | 'success' | 'info' }> = {
  critical: { icon: 'tabler-alert-triangle', tone: 'error' },
  attention: { icon: 'tabler-alert-circle', tone: 'warning' },
  optimal: { icon: 'tabler-circle-check', tone: 'success' },
  overshoot: { icon: 'tabler-info-circle', tone: 'info' }
}

const formatPct = (value: number) =>
  formatPercent(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const MarginIndicatorBadge = ({
  marginPct,
  target,
  size = 'md',
  showLabel = true
}: MarginIndicatorBadgeProps) => {
  const theme = useTheme()
  const status = classifyMargin(marginPct, target)
  const meta = STATUS_META[status]
  const statusLabel = GH_PRICING.marginLabels[status]

  const palette =
    meta.tone === 'success'
      ? GH_COLORS.semaphore.green
      : meta.tone === 'warning'
        ? GH_COLORS.semaphore.yellow
        : meta.tone === 'error'
          ? GH_COLORS.semaphore.red
          : {
              source: theme.palette.info.main,
              bg: theme.palette.info.lighterOpacity ?? alpha(theme.palette.info.main, 0.12),
              text: theme.palette.info.main
            }

  const pctText = formatPct(marginPct)
  const label = showLabel ? `${pctText} · ${statusLabel}` : pctText
  const ariaLabel = `Margen ${pctText} — ${statusLabel}`

  return (
    <Chip
      size={size === 'sm' ? 'small' : 'medium'}
      aria-label={ariaLabel}
      label={label}
      icon={<i className={`${meta.icon} text-[14px]`} aria-hidden='true' />}
      sx={{
        bgcolor: palette.bg,
        color: palette.text,
        border: `1px solid ${alpha(palette.source, 0.24)}`,
        fontWeight: 500,
        '& .MuiChip-icon': {
          color: palette.text,
          marginLeft: size === 'sm' ? '6px' : '8px'
        }
      }}
    />
  )
}

export default MarginIndicatorBadge
