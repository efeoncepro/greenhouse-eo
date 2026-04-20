'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export interface CostFreshnessBadgeProps {
  snapshotDate: string | Date | null | undefined
  compact?: boolean
}

type FreshnessTier = 'fresh' | 'stale' | 'very_stale' | 'unknown'

const META: Record<FreshnessTier, { color: 'success' | 'warning' | 'error' | 'default'; icon: string }> = {
  fresh: { color: 'success', icon: 'tabler-clock-check' },
  stale: { color: 'warning', icon: 'tabler-clock-exclamation' },
  very_stale: { color: 'error', icon: 'tabler-clock-x' },
  unknown: { color: 'default', icon: 'tabler-clock-question' }
}

const resolveTierLabel = (tier: FreshnessTier): string => {
  switch (tier) {
    case 'fresh':
      return GH_PRICING.costProvenance.freshnessLabelFresh
    case 'stale':
      return GH_PRICING.costProvenance.freshnessLabelStale
    case 'very_stale':
      return GH_PRICING.costProvenance.freshnessLabelVeryStale
    case 'unknown':
    default:
      return GH_PRICING.costProvenance.freshnessLabelUnknown
  }
}

const computeDaysSince = (raw: string | Date | null | undefined): number | null => {
  if (!raw) return null
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 0
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const resolveTier = (days: number | null): FreshnessTier => {
  if (days === null) return 'unknown'
  if (days < 30) return 'fresh'
  if (days < 60) return 'stale'
  return 'very_stale'
}

/**
 * CostFreshnessBadge — color-tiered badge mostrando cuán reciente es el
 * snapshot del costo basis que alimenta la sugerencia.
 *
 *   < 30d  → success (Reciente)
 *   30–59d → warning (Desactualizado)
 *   ≥ 60d  → error   (Muy desactualizado)
 *   null   → default (Sin fecha)
 *
 * Pattern inspirado en SaveStateIndicator (TASK-505) pero ajustado a
 * visualizar edad del dato en vez de estado del save. Uses
 * `GH_PRICING.costProvenance.freshnessValueFormatter` para el texto
 * relativo ("hoy" / "hace 3 días" / "hace más de un mes" / …).
 */
const CostFreshnessBadge = ({ snapshotDate, compact }: CostFreshnessBadgeProps) => {
  const days = computeDaysSince(snapshotDate)
  const tier = resolveTier(days)
  const tierLabel = resolveTierLabel(tier)
  const relative = GH_PRICING.costProvenance.freshnessValueFormatter(days)
  const tooltipTitle = `${GH_PRICING.costProvenance.freshnessLabel}: ${tierLabel} (${relative}).`
  const meta = META[tier]

  const colorKey = meta.color === 'default' ? 'text.secondary' : `${meta.color}.main`
  const borderRgbaOpacity = 0.24
  const backgroundOpacity = 0.1

  return (
    <Tooltip title={tooltipTitle} arrow placement='top' disableInteractive>
      <Box
        aria-label={tooltipTitle}
        sx={theme => {
          const paletteMain =
            meta.color === 'default' ? theme.palette.text.secondary : theme.palette[meta.color].main

          return {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: compact ? 0.75 : 1.25,
            py: compact ? 0.25 : 0.5,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            backgroundColor: alpha(paletteMain, backgroundOpacity),
            color: meta.color === 'default' ? theme.palette.text.primary : paletteMain,
            border: `1px solid ${alpha(paletteMain, borderRgbaOpacity)}`,
            cursor: 'help'
          }
        }}
      >
        <i className={meta.icon} aria-hidden='true' style={{ fontSize: compact ? 12 : 14 }} />
        <Typography
          variant='caption'
          sx={theme => ({
            fontWeight: 600,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: meta.color === 'default' ? theme.palette.text.secondary : 'inherit'
          })}
        >
          {relative}
        </Typography>
      </Box>
    </Tooltip>
  )
  // colorKey reserved if consumers end up needing the raw palette key
  void colorKey
}

export default CostFreshnessBadge
