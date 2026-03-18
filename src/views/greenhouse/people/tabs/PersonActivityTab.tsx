'use client'

import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import CustomTextField from '@core/components/mui/TextField'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import EmptyState from '@/components/greenhouse/EmptyState'
import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone } from '@/lib/ico-engine/metric-registry'
import { CSC_PHASE_LABELS, type CscPhase } from '@/lib/ico-engine/metric-registry'
import type { IcoMetricSnapshot, MetricValue, CscDistributionEntry } from '@/lib/ico-engine/read-metrics'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ── Constants ─────────────────────────────────────────────────────────

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const CSC_COLORS: Record<CscPhase, string> = {
  briefing: '#7367F0',
  produccion: '#00BAD1',
  revision_interna: '#ff6500',
  cambios_cliente: '#bb1954',
  entrega: '#6ec207'
}

// ── Helpers ───────────────────────────────────────────────────────────

const getMetric = (snapshot: IcoMetricSnapshot, metricId: string): MetricValue | undefined =>
  snapshot.metrics.find(m => m.metricId === metricId)

const getMetricValue = (snapshot: IcoMetricSnapshot, metricId: string): number | null =>
  getMetric(snapshot, metricId)?.value ?? null

const normalizeForRadar = (metricId: string, value: number | null): number => {
  if (value === null) return 0

  switch (metricId) {
    case 'rpa':
      return Math.max(0, Math.min(100, Math.round((1 - (value - 1) / 2) * 100)))
    case 'otd_pct':
    case 'ftr_pct':
      return Math.round(Math.min(100, value))
    case 'cycle_time':
      return Math.max(0, Math.min(100, Math.round((1 - (value - 3) / 18) * 100)))
    case 'throughput':
      return Math.min(100, Math.round((value / 50) * 100))
    case 'pipeline_velocity':
      return Math.min(100, Math.round(value * 100))
    default:
      return 0
  }
}

const getZoneColor = (zone: ThresholdZone | null) =>
  zone ? THRESHOLD_ZONE_COLOR[zone] : ('secondary' as const)

// ── KPI Config ────────────────────────────────────────────────────────

const KPI_CONFIG: Array<{ id: string; label: string; icon: string; format: (v: number | null) => string }> = [
  { id: 'rpa', label: 'RpA promedio', icon: 'tabler-eye-check', format: v => (v !== null ? v.toFixed(2) : '—') },
  { id: 'otd_pct', label: 'OTD%', icon: 'tabler-clock-check', format: v => (v !== null ? `${Math.round(v)}%` : '—') },
  { id: 'ftr_pct', label: 'FTR%', icon: 'tabler-thumb-up', format: v => (v !== null ? `${Math.round(v)}%` : '—') },
  { id: 'throughput', label: 'Throughput', icon: 'tabler-bolt', format: v => (v !== null ? String(Math.round(v)) : '—') },
  { id: 'cycle_time', label: 'Ciclo promedio', icon: 'tabler-hourglass', format: v => (v !== null ? `${v.toFixed(1)}d` : '—') },
  { id: 'stuck_assets', label: 'Stuck assets', icon: 'tabler-alert-triangle', format: v => (v !== null ? String(Math.round(v)) : '—') }
]

// ── Component ─────────────────────────────────────────────────────────

type Props = {
  memberId: string
}

const PersonActivityTab = ({ memberId }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<IcoMetricSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const res = await fetch(`/api/ico-engine/context?dimension=member&value=${memberId}&year=${year}&month=${month}`)

        if (res.ok) setData(await res.json())
        else setData(null)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [memberId, year, month])

  const hasData = data !== null
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  // ── CSC Donut ───────────────────────────────────────────────────────

  const cscEntries = hasData
    ? (['briefing', 'produccion', 'revision_interna', 'cambios_cliente', 'entrega'] as CscPhase[])
        .map(phase => {
          const entry = data.cscDistribution.find((e: CscDistributionEntry) => e.phase === phase)

          return { phase, label: CSC_PHASE_LABELS[phase], count: entry?.count ?? 0 }
        })
        .filter(e => e.count > 0)
    : []

  const cscTotal = cscEntries.reduce((sum, e) => sum + e.count, 0)

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    stroke: { width: 2 },
    labels: cscEntries.map(e => e.label),
    colors: cscEntries.map(e => CSC_COLORS[e.phase]),
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
              label: 'Activos asignados',
              color: GH_COLORS.neutral.textPrimary,
              formatter: () => String(cscTotal)
            }
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 576,
        options: {
          chart: { height: 300 },
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  name: { fontSize: '0.8rem' },
                  value: { fontSize: '1.2rem' },
                  total: { fontSize: '0.75rem' }
                }
              }
            }
          }
        }
      }
    ]
  }

  // ── Radar ───────────────────────────────────────────────────────────

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
        value: normalizeForRadar(m.id, getMetricValue(data, m.id))
      }))
    : []

  const radarOptions: ApexOptions = {
    chart: {
      type: 'radar',
      toolbar: { show: false },
      background: 'transparent',
      dropShadow: { enabled: true, top: 1, blur: 4, left: 1, opacity: 0.15 }
    },
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
          fill: {
            colors: [mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'transparent']
          }
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

  // ── Velocity Gauge ──────────────────────────────────────────────────

  const velocity = hasData ? getMetricValue(data, 'pipeline_velocity') : null
  const velocityPct = velocity !== null ? Math.min(100, Math.round(velocity * 100)) : 0

  const velocityOptions: ApexOptions = {
    chart: { type: 'radialBar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '60%' },
        track: {
          background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          strokeWidth: '100%'
        },
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

  // ── Render ──────────────────────────────────────────────────────────

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
              <MenuItem key={i + 1} value={i + 1}>
                {label}
              </MenuItem>
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
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
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
            icon='tabler-chart-bar'
            title='Sin métricas de actividad para este período'
            description={`No hay datos del ICO Engine para este colaborador en ${MONTH_SHORT[month]} ${year}. Las métricas se calculan a partir de las tareas asignadas en los espacios de Notion.`}
          />
        </Grid>
      ) : (
        <>
          {/* KPI Row */}
          <Grid size={{ xs: 12 }}>
            <SectionErrorBoundary sectionName='person-activity-kpis' description='No pudimos calcular los KPIs de actividad.'>
              <Grid container spacing={6}>
                {KPI_CONFIG.map(kpi => {
                  const metric = getMetric(data, kpi.id)
                  const value = metric?.value ?? null
                  const zoneColor = getZoneColor(metric?.zone ?? null)

                  return (
                    <Grid key={kpi.id} size={{ xs: 6, sm: 4, md: 2 }}>
                      <HorizontalWithSubtitle
                        title={kpi.label}
                        stats={kpi.format(value)}
                        avatarIcon={kpi.icon}
                        avatarColor={zoneColor}
                        subtitle={`${MONTH_SHORT[month]} ${year}`}
                      />
                    </Grid>
                  )
                })}
              </Grid>
            </SectionErrorBoundary>
          </Grid>

          {/* Context summary */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant='body2' color='text.secondary'>
                Total tareas: <strong>{data.context.totalTasks}</strong>
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Completadas: <strong>{data.context.completedTasks}</strong>
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Activas: <strong>{data.context.activeTasks}</strong>
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Fuente: <strong>{data.source === 'materialized' ? 'Cache' : 'Tiempo real'}</strong>
              </Typography>
            </Box>
          </Grid>

          {/* CSC Donut + Health Radar + Velocity Gauge */}
          <Grid size={{ xs: 12, md: 5 }}>
            <SectionErrorBoundary sectionName='person-activity-csc' description='No pudimos cargar la distribución CSC.'>
              <ExecutiveCardShell title='Distribución CSC' subtitle='Activos asignados por fase'>
                {cscEntries.length === 0 ? (
                  <EmptyState
                    icon='tabler-chart-pie'
                    title='Sin datos de distribución'
                    description='Se necesitan activos activos asignados para calcular la distribución CSC.'
                  />
                ) : (
                  <figure role='img' aria-label={`Distribución CSC: ${cscTotal} activos`} style={{ margin: 0 }}>
                    <AppReactApexCharts
                      type='donut'
                      height={380}
                      width='100%'
                      series={cscEntries.map(e => e.count)}
                      options={donutOptions}
                    />
                  </figure>
                )}
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <SectionErrorBoundary
              sectionName='person-activity-radar'
              description='No pudimos cargar el radar de salud.'
            >
              <ExecutiveCardShell title='Salud operativa' subtitle='Dimensiones normalizadas (100 = óptimo)'>
                <figure role='img' aria-label='Radar de salud operativa personal' style={{ margin: 0 }}>
                  <AppReactApexCharts
                    type='radar'
                    height={340}
                    width='100%'
                    series={[{ name: 'Métricas', data: radarMetrics.map(m => m.value) }]}
                    options={radarOptions}
                  />
                </figure>
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <SectionErrorBoundary
              sectionName='person-activity-velocity'
              description='No pudimos cargar la velocidad del pipeline.'
            >
              <ExecutiveCardShell title='Velocidad pipeline' subtitle='Completados / activos'>
                {velocity === null ? (
                  <EmptyState icon='tabler-bolt' title='Sin datos' description='Se necesitan activos completados.' />
                ) : (
                  <figure
                    role='img'
                    aria-label={`Velocidad del pipeline: ${velocityPct}%`}
                    style={{ margin: 0 }}
                  >
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
        </>
      )}
    </Grid>
  )
}

export default PersonActivityTab
