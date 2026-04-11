'use client'

import { useCallback, useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import CustomTextField from '@core/components/mui/TextField'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import EmptyState from '@/components/greenhouse/EmptyState'
import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import IcoGlobalKpis from '@/components/agency/IcoGlobalKpis'
import type { RpaTrendBySpace } from '@/components/agency/IcoCharts'
import SpaceIcoScorecard from '@/components/agency/SpaceIcoScorecard'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { SpaceMetricSnapshot, MetricValue } from '@/lib/ico-engine/read-metrics'
import { CSC_PHASE_LABELS, CSC_CHART_COLORS, type CscPhase } from '@/lib/ico-engine/metric-registry'

import type { OrganizationDetailData } from '../types'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ── Constants ─────────────────────────────────────────────────────────

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TREND_LINE_COLORS = Object.values(CSC_CHART_COLORS)

type IcoData = {
  periodYear: number
  periodMonth: number
  spaces: SpaceMetricSnapshot[]
  totalSpaces: number
}

// ── Metric Helpers ────────────────────────────────────────────────────

const getMetricValue = (spaces: SpaceMetricSnapshot[], metricId: string): number | null => {
  const values = spaces
    .map(s => s.metrics.find((m: MetricValue) => m.metricId === metricId)?.value ?? null)
    .filter((v): v is number => v !== null)

  if (values.length === 0) return null

  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Normalize a metric value to 0-100 for the radar chart.
 * Higher = better for all axes.
 */
const normalizeForRadar = (metricId: string, value: number | null): number => {
  if (value === null) return 0

  switch (metricId) {
    case 'rpa':
      // RPA: 1.0 = perfect (100), 3.0+ = bad (0). Inverted scale.
      return Math.max(0, Math.min(100, Math.round((1 - (value - 1) / 2) * 100)))
    case 'otd_pct':
      // OTD: 0-100%, direct mapping
      return Math.round(Math.min(100, value))
    case 'ftr_pct':
      // FTR: 0-100%, direct mapping
      return Math.round(Math.min(100, value))
    case 'cycle_time':
      // Cycle time: 3d = perfect (100), 21d+ = bad (0). Inverted.
      return Math.max(0, Math.min(100, Math.round((1 - (value - 3) / 18) * 100)))
    case 'throughput':
      // Throughput: 0-50+ scale, capped
      return Math.min(100, Math.round((value / 50) * 100))
    case 'pipeline_velocity':
      // 0-1.0 ratio, map to 0-100
      return Math.min(100, Math.round(value * 100))
    default:
      return 0
  }
}

// ── Component ─────────────────────────────────────────────────────────

type Props = {
  detail: OrganizationDetailData
}

const OrganizationIcoTab = ({ detail }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<IcoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rpaTrend, setRpaTrend] = useState<RpaTrendBySpace[] | undefined>(undefined)
  const [rpaTrendLoading, setRpaTrendLoading] = useState(false)

  // Fetch ICO metrics
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setRpaTrend(undefined) // reset trend on period change

      try {
        const res = await fetch(`/api/organizations/${detail.organizationId}/ico?year=${year}&month=${month}`)

        if (res.ok) setData(await res.json())
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [detail.organizationId, year, month])

  // Fetch RPA trend filtered to org's space(s)
  const fetchRpaTrend = useCallback(async () => {
    const activeSpaces = (detail.spaces ?? []).filter(s => s.status === 'active' && s.spaceId)

    if (activeSpaces.length === 0) {
      setRpaTrend([])

      return
    }

    setRpaTrendLoading(true)

    try {
      const results = await Promise.all(
        activeSpaces.map(async space => {
          const res = await fetch(`/api/ico-engine/trends/rpa?months=6&spaceId=${space.spaceId}`)

          if (res.ok) {
            const json = await res.json()

            return json.spaces ?? []
          }

          return []
        })
      )

      setRpaTrend(results.flat())
    } catch {
      setRpaTrend([])
    } finally {
      setRpaTrendLoading(false)
    }
  }, [detail.spaces])

  const hasData = data !== null && data.spaces.length > 0

  useEffect(() => {
    if (hasData && rpaTrend === undefined) fetchRpaTrend()
  }, [hasData, rpaTrend, fetchRpaTrend])

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  // ── Chart data computations ───────────────────────────────────────

  // CSC Donut — aggregate across all org spaces
  const aggregatedCsc = hasData
    ? (() => {
        const phaseMap = new Map<CscPhase, number>()

        for (const space of data.spaces) {
          for (const entry of space.cscDistribution) {
            phaseMap.set(entry.phase as CscPhase, (phaseMap.get(entry.phase as CscPhase) ?? 0) + entry.count)
          }
        }

        const phases: CscPhase[] = ['briefing', 'produccion', 'revision_interna', 'cambios_cliente', 'entrega']

        return phases
          .map(phase => ({ phase, label: CSC_PHASE_LABELS[phase], count: phaseMap.get(phase) ?? 0 }))
          .filter(e => e.count > 0)
      })()
    : []

  const cscTotal = aggregatedCsc.reduce((sum, e) => sum + e.count, 0)

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    stroke: { width: 2 },
    labels: aggregatedCsc.map(e => e.label),
    colors: aggregatedCsc.map(e => CSC_CHART_COLORS[e.phase]),
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    },
    legend: {
      fontSize: '13px',
      position: 'bottom',
      labels: { colors: GH_COLORS.neutral.textSecondary },
      itemMargin: { horizontal: 8 }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            name: { fontSize: '0.9rem', color: GH_COLORS.neutral.textSecondary },
            value: { fontSize: '1.5rem', fontWeight: 700, color: GH_COLORS.neutral.textPrimary },
            total: {
              show: true,
              fontSize: '0.85rem',
              label: 'Activos en CSC',
              color: GH_COLORS.neutral.textPrimary,
              formatter: () => String(cscTotal)
            }
          }
        }
      }
    },
    responsive: [
      { breakpoint: 576, options: { chart: { height: 300 }, plotOptions: { pie: { donut: { labels: { name: { fontSize: '0.8rem' }, value: { fontSize: '1.2rem' }, total: { fontSize: '0.75rem' } } } } } } }
    ]
  }

  // Radar — health overview
  const radarMetrics = hasData
    ? [
        { id: 'rpa', label: 'RpA' },
        { id: 'otd_pct', label: 'OTD%' },
        { id: 'ftr_pct', label: 'FTR%' },
        { id: 'pipeline_velocity', label: 'Velocidad' },
        { id: 'throughput', label: 'Throughput' },
        { id: 'cycle_time', label: 'Ciclo' }
      ].map(m => ({
        ...m,
        value: normalizeForRadar(m.id, getMetricValue(data.spaces, m.id))
      }))
    : []

  const radarOptions: ApexOptions = {
    chart: { type: 'radar', toolbar: { show: false }, background: 'transparent', dropShadow: { enabled: true, top: 1, blur: 4, left: 1, opacity: 0.15 } },
    theme: { mode },
    colors: [GH_COLORS.chart.primary, 'rgba(3,117,219,0.15)'],
    stroke: { width: 2, curve: 'smooth' },
    fill: { opacity: [0.35] },
    markers: { size: 4, strokeWidth: 0 },
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: GH_COLORS.neutral.border,
          connectorColors: GH_COLORS.neutral.border,
          fill: { colors: [mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'transparent'] }
        }
      }
    },
    xaxis: {
      categories: radarMetrics.map(m => m.label),
      labels: { style: { fontSize: '12px', colors: Array(6).fill(GH_COLORS.neutral.textSecondary) } }
    },
    yaxis: { show: false, max: 100 },
    grid: { show: false, padding: { top: -10, bottom: -10 } },
    tooltip: { theme: mode, y: { formatter: (val: number) => `${val} / 100` } }
  }

  // Pipeline velocity gauge
  const velocityValues = hasData
    ? data.spaces
        .map(s => s.metrics.find((m: MetricValue) => m.metricId === 'pipeline_velocity')?.value ?? null)
        .filter((v): v is number => v !== null)
    : []

  const avgVelocity = velocityValues.length > 0
    ? velocityValues.reduce((a, b) => a + b, 0) / velocityValues.length
    : 0

  const velocityPct = Math.min(100, Math.round(avgVelocity * 100))

  const velocityOptions: ApexOptions = {
    chart: { type: 'radialBar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '60%' },
        track: { background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', strokeWidth: '100%' },
        dataLabels: {
          name: { fontSize: '14px', color: GH_COLORS.neutral.textSecondary, offsetY: -10 },
          value: { fontSize: '28px', fontWeight: 700, offsetY: 5 }
        }
      }
    },
    colors: [GH_COLORS.semaphore.yellow.source],
    labels: ['Velocidad'],
    tooltip: { enabled: false }
  }

  // RPA Trend
  const trendSpaces = rpaTrend
    ? [...rpaTrend]
        .filter(s => s.periods.length >= 2)
        .sort((a, b) => {
          const aLast = a.periods[a.periods.length - 1]?.rpaAvg ?? 0
          const bLast = b.periods[b.periods.length - 1]?.rpaAvg ?? 0

          return bLast - aLast
        })
        .slice(0, 5)
    : []

  const allPeriods = new Set<string>()

  for (const space of trendSpaces) {
    for (const p of space.periods) {
      allPeriods.add(`${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`)
    }
  }

  const sortedPeriods = Array.from(allPeriods).sort()

  const trendCategories = sortedPeriods.map(p => {
    const [y, m] = p.split('-')

    return `${MONTH_SHORT[Number(m)]} ${y}`
  })

  const trendSeries = trendSpaces.map(space => {
    const label = space.clientName || space.spaceId

    return {
      name: label.length > 15 ? label.slice(0, 15) + '...' : label,
      data: sortedPeriods.map(period => {
        const [y, m] = period.split('-')
        const match = space.periods.find(p => p.periodYear === Number(y) && p.periodMonth === Number(m))

        return match?.rpaAvg ?? null
      })
    }
  })

  const trendOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, background: 'transparent', zoom: { enabled: false } },
    theme: { mode },
    colors: TREND_LINE_COLORS.slice(0, trendSeries.length),
    stroke: { curve: 'smooth', width: 2.5 },
    markers: { size: 4, strokeWidth: 0 },
    grid: { borderColor: GH_COLORS.neutral.border, strokeDashArray: 4 },
    xaxis: {
      categories: trendCategories,
      labels: { style: { colors: GH_COLORS.neutral.textSecondary, fontSize: '11px' } }
    },
    yaxis: {
      labels: { style: { colors: GH_COLORS.neutral.textSecondary } },
      title: { text: 'RpA' }
    },
    annotations: {
      yaxis: [{
        y: 1.5,
        borderColor: GH_COLORS.semaphore.green.source,
        strokeDashArray: 4,
        label: {
          text: 'Optimo <= 1.5',
          position: 'left',
          style: { color: GH_COLORS.semaphore.green.source, background: 'transparent', fontSize: '10px' }
        }
      }]
    },
    legend: { position: 'top', labels: { colors: GH_COLORS.neutral.textSecondary } },
    dataLabels: { enabled: false },
    tooltip: { theme: mode }
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <Grid container spacing={6}>
      {/* Period selectors */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <CustomTextField
            select
            size='small'
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {MONTH_SHORT.slice(1).map((label, i) => (
              <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ minWidth: 100 }}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </CustomTextField>
        </Box>
      </Grid>

      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : !hasData ? (
        <Grid size={{ xs: 12 }}>
          <EmptyState
            icon='tabler-cpu'
            title='Sin métricas ICO para este período'
            description={`No hay datos del ICO Engine para ${detail.organizationName} en ${MONTH_SHORT[month]} ${year}. Las métricas se calculan automáticamente cuando hay tareas sincronizadas desde Notion.`}
          />
        </Grid>
      ) : (
        <>
          {/* KPI Row */}
          <Grid size={{ xs: 12 }}>
            <SectionErrorBoundary sectionName='ico-kpis' description='No pudimos calcular los KPIs del ICO Engine.'>
              <IcoGlobalKpis spaces={data.spaces} />
            </SectionErrorBoundary>
          </Grid>

          {/* CSC Donut + Health Radar */}
          <Grid size={{ xs: 12, md: 5 }}>
            <SectionErrorBoundary sectionName='ico-csc-donut' description='No pudimos cargar la distribución CSC.'>
              <ExecutiveCardShell
                title='Distribución CSC'
                subtitle='Activos por fase de la Cadena de Suministro Creativo'
              >
                {aggregatedCsc.length === 0 ? (
                  <EmptyState
                    icon='tabler-chart-pie'
                    title='Sin datos de distribución'
                    description='Se necesitan activos activos para calcular la distribución CSC.'
                  />
                ) : (
                  <figure role='img' aria-label={`Distribución CSC: ${cscTotal} activos`} style={{ margin: 0 }}>
                    <AppReactApexCharts
                      type='donut'
                      height={380}
                      width='100%'
                      series={aggregatedCsc.map(e => e.count)}
                      options={donutOptions}
                    />
                  </figure>
                )}
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <SectionErrorBoundary sectionName='ico-radar' description='No pudimos cargar el radar de salud.'>
              <ExecutiveCardShell
                title='Salud operativa'
                subtitle='Dimensiones normalizadas (100 = óptimo)'
              >
                <figure role='img' aria-label='Radar de salud operativa' style={{ margin: 0 }}>
                  <AppReactApexCharts
                    type='radar'
                    height={340}
                    width='100%'
                    series={[{ name: detail.organizationName, data: radarMetrics.map(m => m.value) }]}
                    options={radarOptions}
                  />
                </figure>
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          {/* Pipeline Velocity Gauge */}
          <Grid size={{ xs: 12, md: 3 }}>
            <SectionErrorBoundary sectionName='ico-velocity' description='No pudimos cargar la velocidad del pipeline.'>
              <ExecutiveCardShell
                title='Velocidad pipeline'
                subtitle='Completados / activos'
              >
                {velocityValues.length === 0 ? (
                  <EmptyState
                    icon='tabler-bolt'
                    title='Sin datos'
                    description='Se necesitan activos completados.'
                  />
                ) : (
                  <figure role='img' aria-label={`Velocidad del pipeline: ${velocityPct}%`} style={{ margin: 0 }}>
                    <AppReactApexCharts
                      type='radialBar'
                      height={280}
                      width='100%'
                      series={[velocityPct]}
                      options={velocityOptions}
                    />
                  </figure>
                )}
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          {/* RPA Trend */}
          <Grid size={{ xs: 12 }}>
            <SectionErrorBoundary sectionName='ico-rpa-trend' description='No pudimos cargar la tendencia RpA.'>
              <ExecutiveCardShell
                title='Evolución RpA'
                subtitle='Promedio mensual de revisiones por activo'
              >
                {rpaTrendLoading ? (
                  <Skeleton variant='rounded' height={320} />
                ) : trendSpaces.length === 0 ? (
                  <EmptyState
                    icon='tabler-trending-up'
                    title='Aún no hay suficiente historial'
                    description='Se necesitan al menos 2 meses con datos para visualizar tendencias.'
                  />
                ) : (
                  <figure role='img' aria-label='Evolución mensual del RpA' style={{ margin: 0 }}>
                    <AppReactApexCharts
                      type='line'
                      height={320}
                      width='100%'
                      series={trendSeries as ApexAxisChartSeries}
                      options={trendOptions}
                    />
                  </figure>
                )}
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          {/* Scorecard (multi-space orgs) */}
          {data.spaces.length > 1 && (
            <Grid size={{ xs: 12 }}>
              <SectionErrorBoundary sectionName='ico-scorecard' description='No pudimos cargar el scorecard por Space.'>
                <SpaceIcoScorecard spaces={data.spaces} />
              </SectionErrorBoundary>
            </Grid>
          )}
        </>
      )}
    </Grid>
  )
}

export default OrganizationIcoTab
