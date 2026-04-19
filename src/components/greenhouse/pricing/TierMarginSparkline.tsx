'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

export interface TierMarginSparklineProps {
  actualPct: number
  minPct: number
  optPct: number
  maxPct: number
  status: 'below_min' | 'in_range' | 'at_optimum' | 'above_max' | 'unknown'
  size?: 'sm' | 'md'
}

/**
 * Sparkline horizontal compact que visualiza la posición del margen actual
 * dentro del rango del tier (min → opt → max). Pattern Linear/Ramp para
 * communicate tier compliance at a glance.
 */
const TierMarginSparkline = ({
  actualPct,
  minPct,
  optPct,
  maxPct,
  status,
  size = 'sm'
}: TierMarginSparklineProps) => {
  const trackHeight = size === 'sm' ? 4 : 6

  // Normalizar: extender el eje para que los 3 hitos min/opt/max estén visibles
  // y el actual se pueda salir del rango (below_min o above_max).
  const displayRange = Math.max(maxPct - minPct, 0.01)
  const leftPad = Math.max(displayRange * 0.15, minPct - displayRange * 0.1 > 0 ? 0 : 0.05)
  const rightPad = Math.max(displayRange * 0.15, 0.05)
  const axisMin = Math.max(0, minPct - leftPad)
  const axisMax = maxPct + rightPad

  const toPos = (pct: number) => {
    const clamped = Math.max(axisMin, Math.min(axisMax, pct))

    return ((clamped - axisMin) / (axisMax - axisMin)) * 100
  }

  const statusColor: 'success' | 'warning' | 'error' | 'info' =
    status === 'at_optimum' || status === 'in_range'
      ? 'success'
      : status === 'below_min'
        ? 'error'
        : status === 'above_max'
          ? 'warning'
          : 'info'

  return (
    <Box sx={{ width: '100%', minWidth: 120 }} role='img' aria-label={`Margen ${(actualPct * 100).toFixed(1)}% dentro del rango del tier`}>
      <Box sx={{ position: 'relative', height: trackHeight * 3, width: '100%' }}>
        {/* Track base */}
        <Box
          sx={theme => ({
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: trackHeight,
            marginTop: `-${trackHeight / 2}px`,
            backgroundColor: alpha(theme.palette.text.primary, 0.08),
            borderRadius: 999
          })}
        />
        {/* In-range fill */}
        <Box
          sx={theme => ({
            position: 'absolute',
            top: '50%',
            left: `${toPos(minPct)}%`,
            right: `${100 - toPos(maxPct)}%`,
            height: trackHeight,
            marginTop: `-${trackHeight / 2}px`,
            backgroundColor: alpha(theme.palette.success.main, 0.2),
            borderRadius: 999
          })}
        />
        {/* Opt marker */}
        <Box
          sx={theme => ({
            position: 'absolute',
            top: '50%',
            left: `calc(${toPos(optPct)}% - 1px)`,
            height: trackHeight * 2.5,
            marginTop: `-${trackHeight * 1.25}px`,
            width: 2,
            backgroundColor: alpha(theme.palette.success.dark, 0.5),
            borderRadius: 1
          })}
        />
        {/* Actual position dot */}
        <Box
          sx={theme => ({
            position: 'absolute',
            top: '50%',
            left: `calc(${toPos(actualPct)}% - ${trackHeight}px)`,
            width: trackHeight * 2,
            height: trackHeight * 2,
            marginTop: `-${trackHeight}px`,
            backgroundColor: theme.palette[statusColor].main,
            borderRadius: '50%',
            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`
          })}
        />
      </Box>
      {size === 'md' ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {(minPct * 100).toFixed(0)}%
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {(maxPct * 100).toFixed(0)}%
          </Typography>
        </Box>
      ) : null}
    </Box>
  )
}

export default TierMarginSparkline
