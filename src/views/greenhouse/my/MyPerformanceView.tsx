'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomIconButton from '@core/components/mui/IconButton'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import EmptyState from '@/components/greenhouse/EmptyState'
import NexaInsightsBlock from '@/components/greenhouse/NexaInsightsBlock'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import { MetricTrendCard, type MetricTrendPoint } from '@/components/greenhouse/primitives'
import {
  CSC_PHASE_ORDER,
  QUALITY_PENDING_METRIC_IDS,
  getZoneColor,
  isPendingClosures,
  normalizeForRadar,
  TREND_CONFIG
} from '@/lib/ico-engine/activity-presentation'
import { CSC_CHART_COLORS } from '@/components/greenhouse/charts/csc-chart-colors'
import {
  CSC_PHASE_LABELS,
  THRESHOLD_ZONE_COLOR,
  type ThresholdZone,
  getMetricById,
  getThresholdZone
} from '@/lib/ico-engine/metric-registry'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { getMicrocopy } from '@/lib/copy'
import { GH_MY_PERFORMANCE } from '@/lib/copy/my-performance'
import type { MyPerformanceMetric, MyPerformanceResponse } from '@/lib/my-performance/types'

const COPY = GH_MY_PERFORMANCE
const MONTHS_SHORT = ['', ...getMicrocopy().months.short]
const MONTHS_LONG = getMicrocopy().months.long

// ── Helpers ───────────────────────────────────────────────────────────

const findMetric = (metrics: MyPerformanceMetric[], id: string): MyPerformanceMetric | undefined =>
  metrics.find(m => m.metricId === id)

const metricValue = (metrics: MyPerformanceMetric[], id: string): number | null =>
  findMetric(metrics, id)?.value ?? null

const asZone = (zone: string | null): ThresholdZone | null =>
  zone === 'optimal' || zone === 'attention' || zone === 'critical' ? zone : null

type CoachingKey = 'optimal' | 'attention' | 'critical' | 'none'

const coachingKey = (value: number | null, zone: string | null): CoachingKey => {
  if (value === null) return 'none'
  const z = asZone(zone)

  return z ?? 'none'
}

const fmtPct = (v: number | null) => (v != null ? `${Math.round(v)}%` : null)
const fmtInt = (v: number | null) => (v != null ? String(Math.round(v)) : null)
const fmtDecimal = (v: number | null) => (v != null ? v.toFixed(2) : null)
const fmtDays = (v: number | null) => (v != null ? `${v.toFixed(1)}d` : null)

const statusChipColor = (status: MyPerformanceResponse['period']['status']) => {
  switch (status) {
    case 'current_partial':
      return 'info' as const
    case 'closed_snapshot':
      return 'success' as const
    case 'degraded':
      return 'warning' as const
    default:
      return 'secondary' as const
  }
}

// ── KPI config ────────────────────────────────────────────────────────

const KPI_CONFIG: Array<{
  id: string
  label: string
  icon: string
  helper: string
  format: (v: number | null) => string | null
}> = [
  { id: 'rpa', label: COPY.metrics.rpa, icon: 'tabler-eye-check', helper: COPY.kpiHelper.rpa, format: fmtDecimal },
  { id: 'otd_pct', label: COPY.metrics.otd, icon: 'tabler-clock-check', helper: COPY.kpiHelper.otd, format: fmtPct },
  { id: 'ftr_pct', label: COPY.metrics.ftr, icon: 'tabler-target', helper: COPY.kpiHelper.ftr, format: fmtPct },
  { id: 'throughput', label: COPY.metrics.throughput, icon: 'tabler-bolt', helper: COPY.kpiHelper.throughput, format: fmtInt },
  { id: 'cycle_time', label: COPY.metrics.cycleTime, icon: 'tabler-hourglass', helper: COPY.kpiHelper.cycleTime, format: fmtDays },
  { id: 'stuck_assets', label: COPY.metrics.stuckAssets, icon: 'tabler-alert-triangle', helper: COPY.kpiHelper.stuckAssets, format: fmtInt }
]

// ── Focus signals (first fold) ────────────────────────────────────────

const FOCUS_SIGNALS = [
  { id: 'otd_pct', label: COPY.focus.otd.label, icon: 'tabler-clock-check', coaching: COPY.coaching.otd, kind: 'pct' as const },
  { id: 'ftr_pct', label: COPY.focus.ftr.label, icon: 'tabler-rosette-discount-check', coaching: COPY.coaching.ftr, kind: 'pct' as const },
  { id: 'throughput', label: COPY.focus.flow.label, icon: 'tabler-bolt', coaching: COPY.coaching.flow, kind: 'flow' as const }
]

const RADAR_DIMS: Array<{ id: string; label: string }> = [
  { id: 'rpa', label: COPY.metrics.rpa },
  { id: 'otd_pct', label: COPY.metrics.otd },
  { id: 'ftr_pct', label: COPY.metrics.ftr },
  { id: 'throughput', label: COPY.metrics.throughput },
  { id: 'cycle_time', label: COPY.metrics.cycleTime },
  { id: 'pipeline_velocity', label: COPY.velocity }
]

interface Props {
  /** Inject a fixed payload for the mockup route — bypasses fetch. */
  mockData?: MyPerformanceResponse
}

const MyPerformanceView = ({ mockData }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode

  const isMock = Boolean(mockData)
  const [data, setData] = useState<MyPerformanceResponse | null>(mockData ?? null)

  const [period, setPeriod] = useState<{ year: number; month: number } | null>(
    mockData ? { year: mockData.period.year, month: mockData.period.month } : null
  )

  const [loading, setLoading] = useState(!isMock)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (target?: { year: number; month: number }, opts?: { refresh?: boolean }) => {
      if (isMock) return
      if (opts?.refresh) setRefreshing(true)
      else setLoading(true)

      try {
        const qs = target ? `?year=${target.year}&month=${target.month}` : ''
        const res = await fetch(`/api/my/performance${qs}`)

        if (res.ok) {
          const payload: MyPerformanceResponse = await res.json()

          setData(payload)
          setPeriod({ year: payload.period.year, month: payload.period.month })
        }
      } catch {
        /* honest degradation handled via payload.meta.degradedSources */
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [isMock]
  )

  useEffect(() => {
    if (!isMock) void load()
  }, [isMock, load])

  const handlePeriodChange = (next: { year?: number; month?: number }) => {
    if (!period) return
    const target = { year: next.year ?? period.year, month: next.month ?? period.month }

    setPeriod(target)
    void load(target)
  }

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Grid container spacing={6} aria-busy='true' aria-label={COPY.loadingLabel}>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rounded' height={88} />
        </Grid>
        {[0, 1, 2].map(i => (
          <Grid size={{ xs: 12, md: 4 }} key={i}>
            <Skeleton variant='rounded' height={120} />
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rounded' height={200} />
        </Grid>
      </Grid>
    )
  }

  const ico = data?.ico ?? null
  const metrics = ico?.metrics ?? []
  const context = ico?.context ?? null
  const trend = data?.trend ?? []
  const operational = data?.operational ?? null
  const nexa = data?.nexaInsights ?? null
  const periodStatus = data?.period.status ?? 'no_data'
  const isCurrent = data?.period.isCurrentPeriod ?? false
  const degraded = (data?.meta.degradedSources ?? []).length > 0
  const pendingClosures = context ? isPendingClosures(context.totalTasks, context.completedTasks) : false

  const hasIco = Boolean(ico?.hasData)
  const isEmpty = periodStatus === 'no_data' && !hasIco && !operational && (!nexa || nexa.totalAnalyzed === 0)

  // Year range for selector.
  const currentYear = period?.year ?? new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1].filter((y, i, a) => a.indexOf(y) === i)

  // ── Header ────────────────────────────────────────────────────────────
  const header = (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }} data-capture='my-performance-header'>
      <CardHeader
        title={COPY.title}
        subheader={COPY.subtitle}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-chart-bar' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
        action={
          <Stack direction='row' spacing={2} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <CustomChip
              round='true'
              variant='tonal'
              size='small'
              color={statusChipColor(periodStatus)}
              label={COPY.statusChip[periodStatus]}
            />
            {period && (
              <>
                <CustomTextField
                  select
                  size='small'
                  value={period.month}
                  onChange={e => handlePeriodChange({ month: Number(e.target.value) })}
                  sx={{ minWidth: 120 }}
                  aria-label={COPY.period}
                >
                  {MONTHS_LONG.map((m, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {m}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  size='small'
                  value={period.year}
                  onChange={e => handlePeriodChange({ year: Number(e.target.value) })}
                  sx={{ minWidth: 96 }}
                  aria-label={COPY.period}
                >
                  {years.map(y => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </>
            )}
            <Tooltip title={COPY.refresh}>
              <span>
                <CustomIconButton
                  size='small'
                  variant='tonal'
                  color='secondary'
                  disabled={refreshing || isMock}
                  onClick={() => period && load(period, { refresh: true })}
                  aria-label={COPY.refresh}
                >
                  <i className={`tabler-refresh ${refreshing ? 'animate-spin' : ''}`} />
                </CustomIconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      />
      {refreshing && (
        <Box sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }} aria-live='polite'>
          {COPY.aria.updating}
        </Box>
      )}
    </Card>
  )

  // ── Empty state ───────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>{header}</Grid>
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <EmptyState icon='tabler-chart-dots' title={COPY.emptyTitle} description={COPY.emptyDescription} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  // ── Focus signals ─────────────────────────────────────────────────────
  const focusCards = FOCUS_SIGNALS.map(sig => {
    const m = findMetric(metrics, sig.id)
    const value = m?.value ?? null
    const ck = coachingKey(value, m?.zone ?? null)

    const display =
      value === null
        ? COPY.noClosures
        : sig.kind === 'pct'
          ? `${Math.round(value)}%`
          : `${Math.round(value)} ${COPY.focus.flow.flowUnit}`

    const color = value === null ? 'secondary' : getZoneColor(asZone(m?.zone ?? null))

    return (
      <Grid size={{ xs: 12, md: 4 }} key={sig.id}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }} data-capture={`focus-${sig.id}`}>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='flex-start'>
              <CustomAvatar variant='rounded' skin='light' color={color} sx={{ width: 40, height: 40 }}>
                <i className={sig.icon} style={{ fontSize: 20 }} />
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {sig.label}
                </Typography>
                <Typography variant='h4' sx={{ lineHeight: 1.2, color: value === null ? 'text.disabled' : 'text.primary' }}>
                  {display}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {sig.coaching[ck]}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    )
  })

  // ── KPI grid ──────────────────────────────────────────────────────────
  const kpiCards = KPI_CONFIG.map(kpi => {
    const m = findMetric(metrics, kpi.id)
    const value = m?.value ?? null
    const showPending = value === null && pendingClosures && QUALITY_PENDING_METRIC_IDS.has(kpi.id)
    const stats = showPending ? COPY.noClosures : (kpi.format(value) ?? '—')
    const color = value === null ? 'secondary' : getZoneColor(asZone(m?.zone ?? null))

    return (
      <Grid size={{ xs: 6, md: 2 }} key={kpi.id}>
        <HorizontalWithSubtitle
          title={kpi.label}
          stats={stats}
          avatarIcon={kpi.icon}
          avatarColor={color}
          subtitle={kpi.helper}
        />
      </Grid>
    )
  })

  // ── Trend cards (closed-month doctrine: never headline the in-progress month) ──
  const sortedTrend = [...trend].sort((a, b) =>
    a.periodYear !== b.periodYear ? a.periodYear - b.periodYear : a.periodMonth - b.periodMonth
  )

  const now = new Date()
  const realYear = now.getFullYear()
  const realMonth = now.getMonth() + 1
  const closedTrend = sortedTrend.filter(p => !(p.periodYear === realYear && p.periodMonth === realMonth))
  const anchor = closedTrend[closedTrend.length - 1] ?? null
  const anchorLabel = anchor ? `${MONTHS_SHORT[anchor.periodMonth]} ${anchor.periodYear}` : ''
  const hasTrend = closedTrend.length > 0

  const buildSeries = (key: 'otdPct' | 'ftrPct'): MetricTrendPoint[] =>
    closedTrend.map(p => ({ label: `${MONTHS_SHORT[p.periodMonth]}`, value: p[key] }))

  const trendHero = (metricId: string, key: 'otdPct' | 'ftrPct') => {
    const value = anchor ? anchor[key] : null
    const def = getMetricById(metricId)
    const zone = def && value !== null ? getThresholdZone(def, value) : null

    return { value, zone }
  }

  // ── Radar ─────────────────────────────────────────────────────────────
  const radarSeries = hasIco ? RADAR_DIMS.map(d => normalizeForRadar(d.id, metricValue(metrics, d.id))) : []

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
          strokeColors: theme.palette.customColors.lightAlloy,
          connectorColors: theme.palette.customColors.lightAlloy,
          fill: { colors: [mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 'transparent'] }
        }
      }
    },
    xaxis: {
      categories: RADAR_DIMS.map(d => d.label),
      labels: { style: { fontSize: '12px', colors: Array(RADAR_DIMS.length).fill(theme.palette.text.secondary) } }
    },
    yaxis: { show: false, max: 100 },
    grid: { show: false, padding: { top: -10, bottom: -10 } },
    tooltip: { theme: mode, y: { formatter: (val: number) => `${val} / 100` } }
  }

  // ── CSC donut ─────────────────────────────────────────────────────────
  const cscEntries = hasIco
    ? CSC_PHASE_ORDER.map(phase => {
        const entry = ico?.cscDistribution.find(e => e.phase === phase)

        return { phase, label: CSC_PHASE_LABELS[phase], count: entry?.count ?? 0 }
      }).filter(e => e.count > 0)
    : []

  const cscTotal = cscEntries.reduce((sum, e) => sum + e.count, 0)
  const hasCsc = cscEntries.length > 0

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    stroke: { width: 2 },
    labels: cscEntries.map(e => e.label),
    colors: cscEntries.map(e => CSC_CHART_COLORS[e.phase]),
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
    legend: { fontSize: '13px', position: 'bottom', labels: { colors: theme.palette.text.secondary }, itemMargin: { horizontal: 8 } },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            name: { fontSize: '0.9rem', color: theme.palette.text.secondary },
            value: { fontSize: '1.5rem', fontWeight: 700, color: theme.palette.customColors.midnight },
            total: { show: true, fontSize: '0.85rem', label: COPY.cscCenterLabel, color: theme.palette.customColors.midnight, formatter: () => String(cscTotal) }
          }
        }
      }
    }
  }

  return (
    <Grid container spacing={6}>
      {/* 1 — Header */}
      <Grid size={{ xs: 12 }}>{header}</Grid>

      {/* Degraded / pending honest alerts */}
      {degraded && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning' variant='outlined'>
            {COPY.degradedAlert}
          </Alert>
        </Grid>
      )}
      {isCurrent && !degraded && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'>
            {COPY.partialAlert}
          </Alert>
        </Grid>
      )}

      {/* 2 — Focus summary */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='overline' sx={{ color: 'text.secondary' }}>
          {COPY.focusSummary}
        </Typography>
      </Grid>
      {focusCards}

      {/* 3 — Nexa Insights (safe mentions) */}
      {nexa && (
        <Grid size={{ xs: 12 }}>
          <NexaInsightsBlock
            insights={nexa.insights}
            totalAnalyzed={nexa.totalAnalyzed}
            lastAnalysis={nexa.lastAnalysis}
            runStatus={nexa.runStatus}
            defaultExpanded={nexa.totalAnalyzed > 0}
            timelineInsights={nexa.timeline ?? []}
            dataStatus={nexa.dataStatus}
            mentionSafeMode
          />
        </Grid>
      )}

      {/* 4 — ICO KPIs */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='overline' sx={{ color: 'text.secondary' }}>
          {COPY.icoMetrics}
        </Typography>
      </Grid>
      {kpiCards}

      {/* 5 — Trends */}
      {hasTrend && (
        <SectionErrorBoundary sectionName='my-performance-trends' description={COPY.trends}>
          {TREND_CONFIG.map(cfg => {
            const key = cfg.id === 'otd_pct' ? ('otdPct' as const) : ('ftrPct' as const)
            const hero = trendHero(cfg.id, key)

            return (
              <Grid size={{ xs: 12, sm: 6 }} key={cfg.id}>
                <MetricTrendCard
                  title={cfg.title}
                  metricName={cfg.metricName}
                  periodLabel={`Mensual · ${anchorLabel}`}
                  value={hero.value}
                  tone={hero.zone ? THRESHOLD_ZONE_COLOR[hero.zone] : undefined}
                  format='percentage'
                  deltaUnit='pts'
                  series={buildSeries(key)}
                  dataCapture={`my-trend-${cfg.id}`}
                />
              </Grid>
            )
          })}
        </SectionErrorBoundary>
      )}

      {/* 6 — Activity */}
      {context && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }} data-capture='my-activity'>
            <CardHeader title={COPY.activity} subheader={COPY.activitySubtitle} />
            <Divider />
            <CardContent>
              <Stack direction='row' spacing={4} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                {[
                  { label: COPY.activityLabels.total, value: context.totalTasks, color: 'text.primary' },
                  { label: COPY.activityLabels.completed, value: context.completedTasks, color: 'success.main' },
                  { label: COPY.activityLabels.active, value: context.activeTasks, color: 'text.primary' },
                  { label: COPY.activityLabels.carryOver, value: context.carryOverTasks, color: context.carryOverTasks > 0 ? 'warning.main' : 'text.primary' }
                ].map(chip => (
                  <Box key={chip.label}>
                    <Typography variant='h4' sx={{ color: chip.color }}>
                      {chip.value}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {chip.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              {pendingClosures && (
                <Alert severity='info' variant='outlined' sx={{ mt: 3 }}>
                  {COPY.pendingClosuresAlert}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 7 — Deep charts */}
      {hasIco && (
        <Grid size={{ xs: 12, md: hasCsc ? 7 : 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }} data-capture='my-radar'>
            <CardHeader title={COPY.operationalHealth} subheader={COPY.operationalHealthSubtitle} />
            <Divider />
            <CardContent>
              <figure role='img' aria-label={COPY.aria.radar} style={{ margin: 0 }}>
                <AppReactApexCharts type='radar' height={300} width='100%' series={[{ name: COPY.scoreValueLabel, data: radarSeries }]} options={radarOptions} />
              </figure>
              <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1, mt: 2, justifyContent: 'center' }}>
                {RADAR_DIMS.map((d, i) => (
                  <Box key={d.id} sx={{ textAlign: 'center', minWidth: 64 }}>
                    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                      {d.label}
                    </Typography>
                    <Typography variant='subtitle2'>{radarSeries[i] ?? 0}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}
      {hasCsc && (
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }} data-capture='my-csc'>
            <CardHeader title={COPY.cscDistribution} subheader={COPY.cscDistributionSubtitle} />
            <Divider />
            <CardContent>
              <figure role='img' aria-label={`${COPY.cscDistribution}: ${cscTotal} ${COPY.cscCenterLabel}`} style={{ margin: 0 }}>
                <AppReactApexCharts type='donut' height={300} width='100%' series={cscEntries.map(e => e.count)} options={donutOptions} />
              </figure>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Advisory note */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          {COPY.advisoryNote}
        </Typography>
      </Grid>
    </Grid>
  )
}

export default MyPerformanceView
