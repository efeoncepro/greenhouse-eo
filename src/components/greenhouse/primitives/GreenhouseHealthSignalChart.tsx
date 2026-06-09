'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { MOTION_DURATION_S, MOTION_EASE } from '@/components/theme/motion-tokens'

export type GreenhouseHealthSignalChartTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'
export type GreenhouseHealthSignalChartVariant = 'segmentedDonut'
export type GreenhouseHealthSignalChartKind = 'teamHealth' | 'talentHealth' | 'capacityHealth' | 'custom'

export type GreenhouseHealthSignalSegment = {
  id: string
  label: string
  value: number
  tone: GreenhouseHealthSignalChartTone
}

export type GreenhouseHealthSignalChartProps = {
  segments: GreenhouseHealthSignalSegment[]
  score?: number
  maxScore?: number
  size?: number
  showScore?: boolean
  animate?: boolean
  variant?: GreenhouseHealthSignalChartVariant
  kind?: GreenhouseHealthSignalChartKind
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

const CHART_CIRCUMFERENCE = 2 * Math.PI * 43
const ease = [...MOTION_EASE.emphasized.cubicBezier] as [number, number, number, number]

const toneColor = (tone: GreenhouseHealthSignalChartTone) => {
  if (tone === 'success') return GH_COLORS.chart.success
  if (tone === 'warning') return GH_COLORS.chart.warning
  if (tone === 'error') return GH_COLORS.chart.error
  if (tone === 'info') return GH_COLORS.chart.info
  if (tone === 'secondary') return GH_COLORS.chart.secondary

  return GH_COLORS.chart.primary
}

const normalizeSegments = (segments: GreenhouseHealthSignalSegment[]) => {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)

  if (total <= 100) return segments

  return segments.map(segment => ({
    ...segment,
    value: (Math.max(0, segment.value) / total) * 100
  }))
}

const HealthSignalIcon = ({ pulseColor }: { pulseColor: string }) => (
  <Box
    component='svg'
    viewBox='0 0 32 32'
    aria-hidden='true'
    focusable='false'
    sx={{ inlineSize: 28, blockSize: 28, display: 'block' }}
  >
    <path
      d='M16 28C9.3 23.2 4.5 18.7 4.5 12.6C4.5 8.9 7.1 6 10.8 6C13 6 14.9 7.1 16 8.9C17.1 7.1 19 6 21.2 6C24.9 6 27.5 8.9 27.5 12.6C27.5 18.7 22.7 23.2 16 28Z'
      fill='currentColor'
    />
    <path
      d='M7.8 16.1H11.6L13.4 12.7L16.2 20.1L18.5 15.1H24.2'
      fill='none'
      stroke={pulseColor}
      strokeWidth='2.6'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Box>
)

/**
 * GreenhouseHealthSignalChart
 *
 * Canonical segmented health donut for operational health/capacity signals.
 * Use it when the chart communicates health, coverage or continuity; do not use
 * it as decorative sentiment/like iconography.
 */
const GreenhouseHealthSignalChart = ({
  segments,
  score,
  maxScore = 100,
  size = 104,
  showScore = true,
  animate = true,
  variant = 'segmentedDonut',
  kind = 'teamHealth',
  ariaLabel,
  dataCapture,
  sx
}: GreenhouseHealthSignalChartProps) => {
  const resolvedSegments = normalizeSegments(segments)
  const scoreLabel = typeof score === 'number' ? `${Math.round(score)} de ${maxScore}` : undefined

  const resolvedAriaLabel =
    ariaLabel ??
    `${scoreLabel ? `Salud ${scoreLabel}. ` : ''}${resolvedSegments
      .map(segment => `${segment.label}: ${Math.round(segment.value)}%`)
      .join(', ')}`

  const transition = animate
    ? `stroke-dashoffset ${MOTION_DURATION_S.medium}s cubic-bezier(${ease.join(', ')})`
    : undefined

  let offset = 0

  return (
    <Box
      role='img'
      aria-label={resolvedAriaLabel}
      data-chart-variant={variant}
      data-chart-kind={kind}
      data-capture={dataCapture}
      sx={[
        {
          position: 'relative',
          inlineSize: size,
          blockSize: size,
          flexShrink: 0
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        component='svg'
        viewBox='0 0 112 112'
        aria-hidden='true'
        focusable='false'
        sx={theme => ({
          inlineSize: '100%',
          blockSize: '100%',
          display: 'block',
          overflow: 'visible',
          color: alpha(theme.palette.text.primary, 0.08)
        })}
      >
        <circle cx='56' cy='56' r='43' fill='none' stroke='currentColor' strokeWidth='10' />
        {resolvedSegments.map(segment => {
          const dashLength = (segment.value / 100) * CHART_CIRCUMFERENCE
          const dashOffset = offset

          offset += dashLength

          return (
            <circle
              key={segment.id}
              cx='56'
              cy='56'
              r='43'
              fill='none'
              stroke={toneColor(segment.tone)}
              strokeWidth='10'
              strokeDasharray={`${dashLength} ${CHART_CIRCUMFERENCE - dashLength}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap='butt'
              transform='rotate(-90 56 56)'
              pathLength={CHART_CIRCUMFERENCE}
              style={{ transition }}
            />
          )
        })}
      </Box>
      <Box
        aria-hidden='true'
        sx={theme => ({
          position: 'absolute',
          inset: '22%',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: `inset 0 0 0 6px ${alpha(theme.palette.primary.main, 0.055)}`
        })}
      >
        <Stack spacing={0.25} alignItems='center'>
          <Box sx={{ color: GH_COLORS.chart.success, lineHeight: 0 }}>
            <HealthSignalIcon pulseColor='var(--mui-palette-background-paper)' />
          </Box>
          {showScore && typeof score === 'number' ? (
            <Typography variant='caption' sx={{ color: 'text.primary', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {Math.round(score)}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Box>
  )
}

export default GreenhouseHealthSignalChart
