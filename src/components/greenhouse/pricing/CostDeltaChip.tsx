'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { OverrideDeltaDirection } from '@/lib/finance/pricing/override-delta'

export interface CostDeltaChipProps {
  deltaPct: number | null | undefined
  direction: OverrideDeltaDirection | null | undefined
  size?: 'sm' | 'md'
  emphasizeDirectionColor?: boolean
}

const META: Record<OverrideDeltaDirection, { color: 'warning' | 'success' | 'info'; icon: string }> = {
  above: { color: 'warning', icon: 'tabler-trending-up' },
  below: { color: 'success', icon: 'tabler-trending-down' },
  equal: { color: 'info', icon: 'tabler-equal' }
}

const formatPct = (pct: number | null | undefined): string => {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return '—'
  const rounded = Math.round(pct * 100) / 100
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * CostDeltaChip — visualiza la variación porcentual entre costo sugerido y
 * costo override. Usado en `CostOverrideDialog` como preview live del delta
 * mientras el usuario edita el input, y en el cost stack post-override si
 * queremos dejar visible el gap aplicado.
 *
 * Semántica de color:
 *   above → warning (override mayor que sugerido reduce margen)
 *   below → success (override menor aumenta margen)
 *   equal → info
 *
 * El color puede suprimirse con `emphasizeDirectionColor=false` cuando
 * vivimos dentro de un impact panel que ya tiene jerarquía propia.
 */
const CostDeltaChip = ({
  deltaPct,
  direction,
  size = 'md',
  emphasizeDirectionColor = true
}: CostDeltaChipProps) => {
  if (!direction) {
    return (
      <Typography variant='caption' color='text.secondary'>
        {GH_PRICING.costOverride.deltaNoBaseline}
      </Typography>
    )
  }

  const meta = META[direction]
  const pctLabel = formatPct(deltaPct !== null && deltaPct !== undefined ? Math.abs(deltaPct) : deltaPct)
  const label =
    direction === 'equal'
      ? GH_PRICING.costOverride.deltaEqual
      : direction === 'above'
        ? GH_PRICING.costOverride.deltaAbove(Number(pctLabel))
        : GH_PRICING.costOverride.deltaBelow(Number(pctLabel))
  const ariaLabel = `${GH_PRICING.costOverride.deltaLabel}: ${label}`

  return (
    <Box
      aria-label={ariaLabel}
      role='status'
      sx={theme => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: size === 'sm' ? 0.75 : 1,
        py: size === 'sm' ? 0.25 : 0.5,
        borderRadius: `${theme.shape.customBorderRadius.xs}px`,
        backgroundColor: emphasizeDirectionColor
          ? alpha(theme.palette[meta.color].main, 0.12)
          : 'transparent',
        color: emphasizeDirectionColor ? theme.palette[meta.color].main : theme.palette.text.primary,
        border: emphasizeDirectionColor
          ? `1px solid ${alpha(theme.palette[meta.color].main, 0.28)}`
          : `1px solid ${theme.palette.divider}`
      })}
    >
      <i
        className={meta.icon}
        aria-hidden='true'
        style={{ fontSize: size === 'sm' ? 12 : 14 }}
      />
      <Typography
        variant='caption'
        sx={{ fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </Typography>
    </Box>
  )
}

export default CostDeltaChip
