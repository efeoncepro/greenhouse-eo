'use client'

import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import NexaInsightsBlock from '@/components/greenhouse/NexaInsightsBlock'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import EmptyState from '@/components/greenhouse/EmptyState'
import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone, CSC_PHASE_LABELS, CSC_CHART_COLORS, type CscPhase } from '@/lib/ico-engine/metric-registry'
import type { MemberNexaInsightsPayload } from '@/lib/ico-engine/ai/llm-types'
import type { IcoMetricSnapshot, MetricValue, CscDistributionEntry } from '@/lib/ico-engine/read-metrics'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ── Constants ─────────────────────────────────────────────────────────

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']


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

const QUALITY_PENDING_METRIC_IDS = new Set(['rpa', 'otd_pct', 'ftr_pct', 'cycle_time'])

const shouldShowPendingClosures = (snapshot: IcoMetricSnapshot | null) =>
  Boolean(snapshot && snapshot.context.totalTasks > 0 && snapshot.context.completedTasks === 0)

const EMPTY_NEXA_INSIGHTS: MemberNexaInsightsPayload = {
  summarySource: 'empty',
  activeAnalyzed: 0,
  historicalAnalyzed: 0,
  totalAnalyzed: 0,
  lastAnalysis: null,
  runStatus: null,
  insights: [],
  activePreview: [],
  historicalPreview: [],
  timeline: []
}

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

type PersonActivityIntelligenceResponse = {
  nexaInsights: MemberNexaInsightsPayload | null
}

const PersonActivityTab = ({ memberId }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<IcoMetricSnapshot | null>(null)
  const [nexaInsights, setNexaInsights] = useState<MemberNexaInsightsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)

      try {
        const [activityRes, intelligenceRes] = await Promise.allSettled([
          fetch(`/api/ico-engine/context?dimension=member&value=${memberId}&year=${year}&month=${month}`),
          fetch(`/api/people/${memberId}/intelligence?trend=6`)
        ])

        if (!active) return

        if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
          setData(await activityRes.value.json())
        } else {
          setData(null)
        }

        if (intelligenceRes.status === 'fulfilled' && intelligenceRes.value.ok) {
          const intelligence = await intelligenceRes.value.json() as PersonActivityIntelligenceResponse

          setNexaInsights(intelligence.nexaInsights ?? EMPTY_NEXA_INSIGHTS)
        } else {
          setNexaInsights(EMPTY_NEXA_INSIGHTS)
        }
      } catch {
        if (!active) return

        setData(null)
        setNexaInsights(EMPTY_NEXA_INSIGHTS)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [memberId, year, month])

  const hasData = data !== null
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)
  const showPendingClosuresState = shouldShowPendingClosures(data)

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
  const hasCsc = cscEntries.length > 0

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    stroke: { width: 2 },
    labels: cscEntries.map(e => e.label),
    colors: cscEntries.map(e => CSC_CHART_COLORS[e.phase]),
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    },
    legend: {
      fontSize: '13px',
      position: 'bottom',
      labels: { colors: theme.palette.text.secondary },
      itemMargin: { horizontal: 8 }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            name: { fontSize: '0.9rem', color: theme.palette.text.secondary },
            value: { fontSize: '1.5rem', fontWeight: 700, color: theme.palette.customColors.midnight },
            total: {
              show: true,
              fontSize: '0.85rem',
              label: 'Activos asignados',
              color: theme.palette.customColors.midnight,
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
          strokeColors: theme.palette.customColors.lightAlloy,
          connectorColors: theme.palette.customColors.lightAlloy,
          fill: {
            colors: [mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'transparent']
          }
        }
      }
    },
    xaxis: {
      categories: radarMetrics.map(m => m.label),
      labels: { style: { fontSize: '12px', colors: Array(6).fill(theme.palette.text.secondary) } }
    },
    yaxis: { show: false, max: 100 },
    grid: { show: false, padding: { top: -10, bottom: -10 } },
    tooltip: { theme: mode, y: { formatter: (val: number) => `${val} / 100` } }
  }

  // ── Velocity Gauge ──────────────────────────────────────────────────

  const velocity = hasData ? getMetricValue(data, 'pipeline_velocity') : null
  const velocityPct = velocity !== null ? Math.min(100, Math.round(velocity * 100)) : 0
  const hasVelocity = velocity !== null

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
          name: { fontSize: '14px', color: theme.palette.text.secondary, offsetY: -10 },
          value: { fontSize: '28px', fontWeight: 700, offsetY: 5 }
        }
      }
    },
    colors: [GH_COLORS.semaphore.yellow.source],
    labels: ['Velocidad'],
    tooltip: { enabled: false }
  }

  const velocityInlineOptions: ApexOptions = {
    chart: { type: 'radialBar', toolbar: { show: false }, background: 'transparent', sparkline: { enabled: true } },
    theme: { mode },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '55%' },
        track: {
          background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          strokeWidth: '100%'
        },
        dataLabels: {
          name: { show: false },
          value: { fontSize: '16px', fontWeight: 700, offsetY: 4 }
        }
      }
    },
    colors: [GH_COLORS.semaphore.yellow.source],
    labels: ['Velocidad'],
    tooltip: { enabled: false }
  }

  // ── Decide chart layout ────────────────────────────────────────────
  // If both CSC + velocity exist: radar (md=7) + CSC (md=5), velocity inline in summary
  // If only CSC: radar (md=7) + CSC (md=5)
  // If only velocity: radar (md=7) + velocity (md=5)
  // If neither: radar only (md=12)

  const showCscChart = hasCsc
  const showVelocityStandalone = hasVelocity && !hasCsc
  const showVelocityInline = hasVelocity && hasCsc
  const hasSecondaryChart = showCscChart || showVelocityStandalone

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <Grid container spacing={6}>
      {nexaInsights && (
        <Grid size={{ xs: 12 }}>
          <NexaInsightsBlock
            insights={nexaInsights.insights}
            totalAnalyzed={nexaInsights.totalAnalyzed}
            lastAnalysis={nexaInsights.lastAnalysis}
            runStatus={nexaInsights.runStatus}
            defaultExpanded={nexaInsights.totalAnalyzed > 0}
            timelineInsights={nexaInsights.timeline ?? []}
          />
        </Grid>
      )}

      {/* Period header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Actividad del período'
            subheader='Métricas ICO de rendimiento y producción'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-chart-dots' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomTextField
                  select
                  size='small'
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  sx={{ minWidth: 100 }}
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
                  sx={{ minWidth: 90 }}
                >
                  {years.map(y => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Stack>
            }
          />
        </Card>
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
          {/* KPI Grid — 3 per row on desktop, 2 on mobile */}
          <SectionErrorBoundary sectionName='person-activity-kpis' description='No pudimos calcular los KPIs de actividad.'>
            {KPI_CONFIG.map(kpi => {
              const metric = getMetric(data, kpi.id)
              const value = metric?.value ?? null
              const zoneColor = getZoneColor(metric?.zone ?? null)

              const stats =
                value === null && showPendingClosuresState && QUALITY_PENDING_METRIC_IDS.has(kpi.id)
                  ? 'Sin cierres'
                  : kpi.format(value)

              return (
                <Grid size={{ xs: 6, sm: 4, md: 4 }} key={kpi.id}>
                  <HorizontalWithSubtitle
                    title={kpi.label}
                    stats={stats}
                    avatarIcon={kpi.icon}
                    avatarColor={zoneColor}
                    subtitle={`${MONTH_SHORT[month]} ${year}`}
                  />
                </Grid>
              )
            })}
          </SectionErrorBoundary>

          {/* Task summary chips + inline velocity */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, px: 4, py: 3 }}>
              <Stack spacing={3}>
                <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2}>
                  <Stack direction='row' spacing={2} flexWrap='wrap'>
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color='secondary'
                      icon={<i className='tabler-subtask' />}
                      label={`${data.context.totalTasks} tareas`}
                    />
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color='success'
                      icon={<i className='tabler-check' />}
                      label={`${data.context.completedTasks} completadas`}
                    />
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color='info'
                      icon={<i className='tabler-progress' />}
                      label={`${data.context.activeTasks} activas`}
                    />
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color='warning'
                      icon={<i className='tabler-history' />}
                      label={`${data.context.carryOverTasks} carry-over`}
                    />
                  </Stack>

                  {showVelocityInline && (
                    <Stack direction='row' alignItems='center' spacing={1}>
                      <Box sx={{ width: 64, height: 64 }}>
                        <AppReactApexCharts
                          type='radialBar'
                          height={64}
                          width={64}
                          series={[velocityPct]}
                          options={velocityInlineOptions}
                        />
                      </Box>
                      <Box>
                        <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.2 }}>Pipeline</Box>
                        <Box sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{velocityPct}%</Box>
                      </Box>
                    </Stack>
                  )}
                </Stack>

                {showPendingClosuresState && (
                  <Alert severity='info' variant='outlined'>
                    Este período tiene trabajo comprometido, pero todavía no hay tareas completadas. Las métricas de calidad se irán poblando a medida que entren cierres.
                  </Alert>
                )}
              </Stack>
            </Card>
          </Grid>

          {/* Charts: Radar (primary) + CSC or Velocity (secondary) */}
          <Grid size={{ xs: 12, md: hasSecondaryChart ? 7 : 12 }}>
            <SectionErrorBoundary
              sectionName='person-activity-radar'
              description='No pudimos cargar el radar de salud.'
            >
              <ExecutiveCardShell title='Salud operativa' subtitle='Dimensiones normalizadas (100 = óptimo)'>
                <figure role='img' aria-label='Radar de salud operativa personal' style={{ margin: 0 }}>
                  <AppReactApexCharts
                    type='radar'
                    height={380}
                    width='100%'
                    series={[{ name: 'Métricas', data: radarMetrics.map(m => m.value) }]}
                    options={radarOptions}
                  />
                </figure>
              </ExecutiveCardShell>
            </SectionErrorBoundary>
          </Grid>

          {showCscChart && (
            <Grid size={{ xs: 12, md: 5 }}>
              <SectionErrorBoundary sectionName='person-activity-csc' description='No pudimos cargar la distribución CSC.'>
                <ExecutiveCardShell title='Distribución CSC' subtitle='Activos asignados por fase'>
                  <figure role='img' aria-label={`Distribución CSC: ${cscTotal} activos`} style={{ margin: 0 }}>
                    <AppReactApexCharts
                      type='donut'
                      height={380}
                      width='100%'
                      series={cscEntries.map(e => e.count)}
                      options={donutOptions}
                    />
                  </figure>
                </ExecutiveCardShell>
              </SectionErrorBoundary>
            </Grid>
          )}

          {showVelocityStandalone && (
            <Grid size={{ xs: 12, md: 5 }}>
              <SectionErrorBoundary
                sectionName='person-activity-velocity'
                description='No pudimos cargar la velocidad del pipeline.'
              >
                <ExecutiveCardShell title='Velocidad pipeline' subtitle='Completados / activos'>
                  <figure
                    role='img'
                    aria-label={`Velocidad del pipeline: ${velocityPct}%`}
                    style={{ margin: 0 }}
                  >
                    <AppReactApexCharts
                      type='radialBar'
                      height={320}
                      width='100%'
                      series={[velocityPct]}
                      options={velocityOptions}
                    />
                  </figure>
                </ExecutiveCardShell>
              </SectionErrorBoundary>
            </Grid>
          )}
        </>
      )}
    </Grid>
  )
}

export default PersonActivityTab
