'use client'

// TASK-945 — Severity sparkline canonical para Nexa Insights.
//
// Renderiza la evolución cronológica de severity de un signal del event log
// append-only (TASK-943). Stepped line porque severity es discreta (ok/warning/
// critical), NO continuous. Color del trazo y del último punto = severity
// actual del signal (semaphore canonical).
//
// Pattern fuente: `StatsWithAreaChart` Vuexy (Apex sparkline mode canonical).
//
// Triple-encoding canonical (skill greenhouse-ux + dataviz-design):
//   color (semaphore) + tooltip per-punto + aria-label resumen
//
// Reduced motion (`prefers-reduced-motion`): animations.enabled = false.
//
// Gate: NO renderiza si < 2 observations. Honest degradation natural (1 obs
// no es una trayectoria). Consumer UI invoca solo cuando hay data suficiente.


import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

import useReducedMotion from '@/hooks/useReducedMotion'
import type { NexaSignalObservation } from '@/lib/ico-engine/ai/llm-types'
import { GH_NEXA } from '@/lib/copy/nexa'


export type NexaSeveritySparklineProps = {
  observations: NexaSignalObservation[]
  /** compact = mobile sizing (60×24); default = desktop (120×40) */
  compact?: boolean
}

const SEVERITY_NUMERIC: Record<string, number> = {
  critical: 3,
  warning: 2,
  info: 1,
  ok: 1
}

const severityToNumeric = (severity: string | null): number => {
  if (!severity) return 0
  const normalized = severity.toLowerCase()

  return SEVERITY_NUMERIC[normalized] ?? 0
}

const severityToThemeColor = (severity: string | null): 'error' | 'warning' | 'success' | 'info' => {
  const normalized = (severity ?? '').toLowerCase()

  if (normalized === 'critical') return 'error'
  if (normalized === 'warning') return 'warning'
  if (normalized === 'info') return 'info'

  return 'success'
}

const NexaSeveritySparkline = ({ observations, compact = false }: NexaSeveritySparklineProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  // Gate canonical: trajectory needs >= 2 points.
  if (observations.length < 2) return null

  const lastObservation = observations[observations.length - 1]
  const themeColor = severityToThemeColor(lastObservation?.severity ?? null)
  const colorHex = theme.palette[themeColor].main

  const series: ApexOptions['series'] = [
    {
      name: GH_NEXA.lifecycle_sparkline_series_label,
      data: observations.map(obs => severityToNumeric(obs.severity))
    }
  ]

  const lastSeverityLabel = GH_NEXA.severity_label[(lastObservation?.severity ?? '').toLowerCase()] ?? GH_NEXA.severity_label_unknown

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: !prefersReduced }
    },
    tooltip: {
      enabled: true,
      x: { show: false },
      y: {
        formatter: (value: number) => {
          if (value === 3) return GH_NEXA.severity_label.critical
          if (value === 2) return GH_NEXA.severity_label.warning
          if (value === 1) return GH_NEXA.severity_label.info

          return GH_NEXA.severity_label_unknown
        },
        title: {
          formatter: () => ''
        }
      },
      marker: { show: false }
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 2,
      curve: 'stepline'
    },
    grid: { show: false },
    colors: [colorHex],
    markers: {
      size: 0,
      hover: { size: 3 },
      discrete: [
        {
          seriesIndex: 0,
          dataPointIndex: observations.length - 1,
          fillColor: colorHex,
          strokeColor: colorHex,
          size: 3
        }
      ]
    },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
      crosshairs: { show: false }
    },
    yaxis: {
      show: false,
      min: 0,
      max: 3
    }
  }

  const ariaLabel = GH_NEXA.lifecycle_sparkline_aria_label(observations.length, lastSeverityLabel)

  return (
    <Box
      role='img'
      aria-label={ariaLabel}
      sx={{
        width: compact ? 60 : 120,
        height: compact ? 24 : 40,
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0
      }}
    >
      <AppReactApexCharts
        type='line'
        height={compact ? 24 : 40}
        width={compact ? 60 : 120}
        options={options}
        series={series}
      />
    </Box>
  )
}

export default NexaSeveritySparkline
