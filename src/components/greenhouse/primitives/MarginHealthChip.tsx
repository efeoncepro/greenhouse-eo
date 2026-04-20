'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

export type MarginClassification = 'healthy' | 'warning' | 'critical'

export interface MarginTierRange {
  min: number
  opt: number
  max: number
  tierLabel?: string
}

export interface MarginHealthChipProps {
  classification: MarginClassification
  marginPct: number
  tierRange?: MarginTierRange | null
}

const META: Record<
  MarginClassification,
  { label: string; statusLabel: string; color: 'success' | 'warning' | 'error'; icon: string }
> = {
  healthy: { label: 'Margen', statusLabel: 'Óptimo', color: 'success', icon: 'tabler-circle-check' },
  warning: { label: 'Margen', statusLabel: 'Atención', color: 'warning', icon: 'tabler-alert-circle' },
  critical: { label: 'Margen', statusLabel: 'Crítico', color: 'error', icon: 'tabler-alert-triangle' }
}

const formatPct = (value: number) => `${(value * 100).toFixed(1).replace('.', ',')}%`

/**
 * MarginHealthChip — primitive de status chip para márgenes/health KPIs con
 * 3 niveles (healthy / warning / critical). Pattern enterprise (Stripe,
 * Ramp): color semántico + ícono + label textual + % + status word. Evita
 * color-only-state y lee completo por screen reader en un solo phrase.
 *
 * Tooltip en hover muestra el tier range (min/opt/max) cuando está disponible.
 * Bordes y fondo usan tonal semantic a través de alpha del palette color.
 *
 * Consumers: QuoteSummaryDock v2 (TASK-505). Reusable para cualquier KPI con
 * health classification (contract profitability, pipeline margin, etc.).
 */
const MarginHealthChip = ({ classification, marginPct, tierRange }: MarginHealthChipProps) => {
  const meta = META[classification]

  const tooltipTitle = tierRange
    ? `${meta.label} ${meta.statusLabel.toLowerCase()} · ${formatPct(marginPct)}. Rango tier ${formatPct(tierRange.min)}–${formatPct(tierRange.max)}${tierRange.tierLabel ? ` (${tierRange.tierLabel})` : ''}.`
    : `${meta.label} ${meta.statusLabel.toLowerCase()}: ${formatPct(marginPct)}`

  return (
    <Tooltip title={tooltipTitle} arrow placement='top' disableInteractive>
      <Box
        aria-label={tooltipTitle}
        sx={theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          backgroundColor: alpha(theme.palette[meta.color].main, 0.12),
          color: theme.palette[meta.color].main,
          border: `1px solid ${alpha(theme.palette[meta.color].main, 0.28)}`,
          cursor: 'help',
          transition: theme.transitions.create(['background-color', 'border-color', 'color'], {
            duration: 150,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        })}
      >
        <i className={meta.icon} aria-hidden='true' style={{ fontSize: 14 }} />
        <Typography variant='caption' sx={{ fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {meta.label} · {formatPct(marginPct)} · {meta.statusLabel}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default MarginHealthChip
