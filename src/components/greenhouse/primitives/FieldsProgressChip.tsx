'use client'

import { useMemo } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import useReducedMotion from '@/hooks/useReducedMotion'

// ApexCharts wrapper — dynamic import, no SSR (matches platform rule).
const Chart = dynamic(() => import('@/libs/ApexCharts'), { ssr: false })

export interface FieldsProgressChipProps {
  filled: number
  total: number

  /** Screen reader announcement. Shown via role='status' + aria-live='polite'. */
  srLabel: (filled: number, total: number) => string

  /** Visual suffix after the animated counter. Example: (total) => `de ${total} campos`. */
  suffix: (total: number) => string

  testId?: string
}

const resolveColor = (percent: number): 'success' | 'warning' | 'error' => {
  if (percent >= 80) return 'success'
  if (percent >= 50) return 'warning'

  return 'error'
}

/**
 * Compact completion counter.
 *
 * Renders a 20px radial (ApexCharts) + AnimatedCounter + "N de M campos" label,
 * and announces progress via an `role='status'` + `aria-live='polite'` region.
 * Color of the radial shifts from error (<50%) → warning (50-79%) → success (≥80%)
 * so the counter carries semantic signal on top of the numeric progress.
 */
const FieldsProgressChip = ({
  filled,
  total,
  srLabel,
  suffix,
  testId
}: FieldsProgressChipProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const colorKey = resolveColor(percent)
  const radialColor = theme.palette[colorKey].main
  const trackColor = alpha(theme.palette.text.primary, 0.08)

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: 'radialBar' as const,
        sparkline: { enabled: true },
        animations: { enabled: !prefersReduced }
      },
      colors: [radialColor],
      plotOptions: {
        radialBar: {
          hollow: { size: '54%' },
          track: { background: trackColor, strokeWidth: '100%' },
          dataLabels: { show: false }
        }
      },
      stroke: { lineCap: 'round' as const },
      states: { hover: { filter: { type: 'none' } } }
    }),
    [prefersReduced, radialColor, trackColor]
  )

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      role='status'
      aria-live='polite'
      aria-atomic='true'
      data-testid={testId}
      sx={{
        pl: 0.5,
        pr: 1,
        py: 0.25,
        color: 'text.secondary'
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Chart
          type='radialBar'
          series={[percent]}
          options={chartOptions}
          width={24}
          height={24}
        />
      </Box>
      <Typography variant='caption' sx={{ lineHeight: 1.2, color: 'text.secondary' }}>
        <Box component='span' sx={{ color: 'text.primary', fontWeight: 500, mr: 0.5 }}>
          <AnimatedCounter value={filled} format='integer' />
        </Box>
        {suffix(total)}
      </Typography>
      <Box component='span' aria-hidden='false' sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {srLabel(filled, total)}
      </Box>
    </Stack>
  )
}

export default FieldsProgressChip
