'use client'

// React Imports
import { useMemo } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'

// Core Imports
import OptionMenu from '@core/components/option-menu'
import type { OptionType } from '@core/components/option-menu/types'

// Greenhouse Imports
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import useReducedMotion from '@/hooks/useReducedMotion'
import { THRESHOLD_ZONE_COLOR } from '@/lib/ico-engine/metric-registry'
import type { ThresholdZone } from '@/lib/ico-engine/metric-registry'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ── Types ─────────────────────────────────────────────────────────────

export type MetricTrendPoint = {
  /** Short axis label, e.g. "Abr". */
  label: string
  /** Metric value for the period; `null` when the period has no data. */
  value: number | null
}

export type MetricTrendCardProps = {
  /** Metric name, rendered as the card title (e.g. "On time delivery"). */
  title: string
  /** Cadence label under the title (e.g. "Mensual"). */
  periodLabel: string
  /** Current period value driving the hero number; `null` renders an em dash. */
  value: number | null
  /** Ordered month-over-month series (oldest → newest). */
  series: MetricTrendPoint[]
  /** Threshold zone — drives the accent color of the area + marker. */
  zone?: ThresholdZone | null
  /** How the hero value (and tooltip) is formatted. */
  format?: 'percentage' | 'integer' | 'decimal'
  /** Suffix for the month-over-month delta chip, e.g. "pts". */
  deltaUnit?: string
  /** Optional 3-dot menu items. When omitted, the menu is not rendered. */
  menuOptions?: OptionType[]
  /** Tooltip for the 3-dot trigger. */
  menuTooltip?: string
  /** Optional `data-capture` hook for visual capture (GVC) targeting. */
  dataCapture?: string
}

// ── Helpers ───────────────────────────────────────────────────────────

const formatValue = (value: number, format: MetricTrendCardProps['format']): string => {
  switch (format) {
    case 'integer':
      return String(Math.round(value))
    case 'decimal':
      return value.toFixed(1)
    case 'percentage':
    default:
      return `${value.toFixed(1)}%`
  }
}

const valueFormatter =
  (format: MetricTrendCardProps['format']) =>
  (n: number): string =>
    formatValue(n, format)

// ── Component ─────────────────────────────────────────────────────────

/**
 * MetricTrendCard — KPI card with a month-over-month area sparkline.
 *
 * Canonical implementation of the Figma "OTD mensual" design
 * (Design System | Vuexy → AXIS, node 11853:17766). Typography follows the
 * runtime contract (TASK-566 / EPIC-004): Geist UI base, `kpiValue` variant
 * for the hero number with `tabular-nums`; Poppins is display-only (h1–h4)
 * and never applied here. The accent color is zone-driven, never color-only:
 * the value, the signed delta chip and its arrow icon carry the same signal.
 *
 * Microinteractions (all reduced-motion aware):
 * - hover lift + accent border (CSS, disabled under prefers-reduced-motion)
 * - area draw-in on mount (ApexCharts, disabled under prefers-reduced-motion)
 * - hero number count-up via AnimatedCounter
 * - per-period tooltip on chart hover
 */
const MetricTrendCard = ({
  title,
  periodLabel,
  value,
  series,
  zone = null,
  format = 'percentage',
  deltaUnit,
  menuOptions,
  menuTooltip,
  dataCapture
}: MetricTrendCardProps) => {
  const theme = useTheme()
  const mode = theme.palette.mode
  const prefersReduced = useReducedMotion()

  const color = (zone ? THRESHOLD_ZONE_COLOR[zone] : 'success') as 'success' | 'warning' | 'error'
  const accent = theme.palette[color].main

  const points = useMemo(() => series.filter(p => p.value !== null) as Array<{ label: string; value: number }>, [series])
  const chartData = useMemo(() => series.map(p => p.value), [series])
  const lastIndex = series.length - 1
  const hasSeries = points.length > 0

  // Month-over-month delta (last two real points).
  const delta = useMemo(() => {
    if (points.length < 2) return null
    const diff = points[points.length - 1].value - points[points.length - 2].value

    if (Math.abs(diff) < 0.05) return null

    return diff
  }, [points])

  const axisLabels = useMemo(() => {
    if (series.length === 0) return null
    if (series.length === 1) return { first: series[0].label, last: null }

    return { first: series[0].label, last: series[lastIndex].label }
  }, [series, lastIndex])

  const ariaSummary = `${title}, ${periodLabel.toLowerCase()}: ${
    value !== null ? formatValue(value, format) : 'sin dato'
  }${delta !== null ? `, ${delta > 0 ? 'sube' : 'baja'} ${Math.abs(delta).toFixed(1)} ${deltaUnit ?? ''}`.trimEnd() : ''}`

  const chartOptions: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: !prefersReduced,
        easing: 'easeout',
        speed: 800,
        animateGradually: { enabled: false }
      },
      background: 'transparent'
    },
    theme: { mode },
    dataLabels: { enabled: false },
    stroke: { width: 2.5, curve: 'smooth', lineCap: 'round', colors: [accent] },
    grid: { show: false, padding: { top: 6, bottom: 6, left: 0, right: 0 } },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.42,
        opacityTo: 0,
        stops: [0, 100],
        colorStops: [
          [
            { offset: 0, opacity: 0.42, color: accent },
            { offset: 100, opacity: 0, color: 'var(--mui-palette-background-paper)' }
          ]
        ]
      }
    },
    colors: [accent],
    markers: {
      size: 0,
      strokeWidth: 2.5,
      strokeColors: 'var(--mui-palette-background-paper)',
      hover: { size: 5 },
      discrete:
        lastIndex >= 0 && series[lastIndex]?.value !== null
          ? [
              {
                seriesIndex: 0,
                dataPointIndex: lastIndex,
                size: 5,
                fillColor: accent,
                strokeColor: 'var(--mui-palette-background-paper)'
              }
            ]
          : []
    },
    xaxis: {
      categories: series.map(p => p.label),
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
      crosshairs: { show: true, stroke: { color: alpha(accent, 0.4), width: 1, dashArray: 3 } }
    },
    yaxis: { show: false },
    tooltip: {
      enabled: true,
      theme: mode,
      x: { show: true },
      y: { formatter: (v: number) => (v === null ? '—' : formatValue(v, format)), title: { formatter: () => '' } },
      marker: { show: true }
    }
  }

  return (
    <Card
      component='article'
      aria-label={ariaSummary}
      data-capture={dataCapture}
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: t => `1px solid ${t.palette.divider}`,
        borderRadius: t => `${t.shape.customBorderRadius.md}px`,
        overflow: 'hidden',
        transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
          duration: theme.transitions.duration.shorter,
          easing: theme.transitions.easing.easeOut
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: alpha(accent, 0.5)
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' }
        }
      }}
    >
      {/* Title row */}
      <Stack
        direction='row'
        alignItems='flex-start'
        justifyContent='space-between'
        spacing={2}
        sx={{ pt: 6, px: 6 }}
      >
        <Typography variant='h5' sx={{ minWidth: 0 }}>
          {title}
        </Typography>
        {menuOptions && menuOptions.length > 0 ? (
          <Box sx={{ mt: -1, mr: -1 }}>
            <OptionMenu
              icon='tabler-dots-vertical'
              iconClassName='text-textDisabled'
              tooltipProps={menuTooltip ? { title: menuTooltip } : undefined}
              options={menuOptions}
            />
          </Box>
        ) : null}
      </Stack>

      {/* Value block */}
      <Stack spacing={0.5} sx={{ px: 6, pt: 3, pb: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          {periodLabel}
        </Typography>
        <Stack direction='row' alignItems='baseline' spacing={2} flexWrap='wrap'>
          <Typography variant='kpiValue' color='text.primary' component='span'>
            {value !== null ? (
              <AnimatedCounter value={value} formatter={valueFormatter(format)} duration={0.9} />
            ) : (
              '—'
            )}
          </Typography>
          {delta !== null ? (
            <Stack
              direction='row'
              alignItems='center'
              spacing={0.5}
              sx={{ color: delta > 0 ? 'success.main' : 'error.main' }}
            >
              <i
                className={delta > 0 ? 'tabler-trending-up' : 'tabler-trending-down'}
                style={{ fontSize: '1rem' }}
                aria-hidden='true'
              />
              <Typography variant='caption' component='span' sx={{ fontWeight: 600, color: 'inherit' }}>
                {`${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}${deltaUnit ? ` ${deltaUnit}` : ''}`}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </Stack>

      {/* Trend area */}
      <Box sx={{ mt: 'auto', pb: 6 }}>
        {hasSeries ? (
          <>
            <Box sx={{ height: 88 }} role='img' aria-label={ariaSummary}>
              <AppReactApexCharts
                type='area'
                height={88}
                width='100%'
                series={[{ name: title, data: chartData }]}
                options={chartOptions}
              />
            </Box>
            {axisLabels ? (
              <Stack direction='row' justifyContent='space-between' sx={{ px: 6, pt: 1 }}>
                <Typography variant='caption' color='text.disabled'>
                  {axisLabels.first}
                </Typography>
                {axisLabels.last ? (
                  <Typography variant='caption' color='text.disabled'>
                    {axisLabels.last}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
          </>
        ) : (
          <Box sx={{ px: 6, py: 4 }}>
            <Typography variant='caption' color='text.disabled'>
              Sin histórico para graficar la tendencia.
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  )
}

export default MetricTrendCard
