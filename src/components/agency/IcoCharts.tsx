'use client'

import dynamic from 'next/dynamic'

import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { SpaceMetricSnapshot, CscDistributionEntry, MetricValue } from '@/lib/ico-engine/read-metrics'
import { CSC_PHASE_LABELS, type CscPhase } from '@/lib/ico-engine/metric-registry'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ─── Trend Types ────────────────────────────────────────────────────────────

export interface RpaTrendBySpace {
  spaceId: string
  periods: Array<{
    periodYear: number
    periodMonth: number
    rpaAvg: number | null
    rpaMedian: number | null
    tasksCompleted: number
  }>
}

type Props = {
  spaces: SpaceMetricSnapshot[]
  rpaTrend?: RpaTrendBySpace[]
}

const CSC_COLORS: Record<CscPhase, string> = {
  briefing: '#7367F0',
  produccion: '#00BAD1',
  revision_interna: '#ff6500',
  cambios_cliente: '#bb1954',
  entrega: '#6ec207'
}

const TREND_LINE_COLORS = ['#7367F0', '#00BAD1', '#ff6500', '#bb1954', '#6ec207']

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ─── Chart Builders ─────────────────────────────────────────────────────────

const buildCscBarOptions = (
  categories: string[],
  mode: 'light' | 'dark',
  borderColor: string,
  textSecondary: string
): ApexOptions => ({
  chart: { type: 'bar', stacked: true, toolbar: { show: false }, background: 'transparent' },
  theme: { mode },
  plotOptions: { bar: { horizontal: false, borderRadius: 3, columnWidth: '60%' } },
  colors: Object.values(CSC_COLORS),
  grid: { borderColor, strokeDashArray: 4 },
  xaxis: {
    categories,
    labels: {
      style: { colors: textSecondary, fontSize: '11px' },
      maxHeight: 60,
      rotate: -45,
      trim: true
    }
  },
  yaxis: { labels: { style: { colors: textSecondary } }, title: { text: 'Activos' } },
  legend: {
    position: 'top',
    labels: { colors: textSecondary }
  },
  dataLabels: { enabled: false },
  tooltip: { theme: mode }
})

const buildVelocityGaugeOptions = (
  mode: 'light' | 'dark',
  textSecondary: string
): ApexOptions => ({
  chart: { type: 'radialBar', toolbar: { show: false }, background: 'transparent' },
  theme: { mode },
  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 135,
      hollow: { size: '60%' },
      track: { background: 'var(--mui-palette-action-selected)' },
      dataLabels: {
        name: { fontSize: '14px', color: textSecondary, offsetY: -10 },
        value: { fontSize: '28px', fontWeight: 700, offsetY: 5 }
      }
    }
  },
  colors: [GH_COLORS.semaphore.yellow.source],
  labels: ['Velocidad'],
  tooltip: { enabled: false }
})

const buildRpaTrendOptions = (
  categories: string[],
  seriesCount: number,
  mode: 'light' | 'dark',
  borderColor: string,
  textSecondary: string
): ApexOptions => ({
  chart: { type: 'line', toolbar: { show: false }, background: 'transparent', zoom: { enabled: false } },
  theme: { mode },
  colors: TREND_LINE_COLORS.slice(0, seriesCount),
  stroke: { curve: 'smooth', width: 2.5 },
  markers: { size: 4, strokeWidth: 0 },
  grid: { borderColor, strokeDashArray: 4 },
  xaxis: {
    categories,
    labels: { style: { colors: textSecondary, fontSize: '11px' } }
  },
  yaxis: {
    labels: { style: { colors: textSecondary } },
    title: { text: 'RpA' }
  },
  annotations: {
    yaxis: [{
      y: 1.5,
      borderColor: GH_COLORS.semaphore.green.source,
      strokeDashArray: 4,
      label: {
        text: 'Óptimo ≤ 1.5',
        position: 'left',
        style: { color: GH_COLORS.semaphore.green.source, background: 'transparent', fontSize: '10px' }
      }
    }]
  },
  legend: {
    position: 'top',
    labels: { colors: textSecondary }
  },
  dataLabels: { enabled: false },
  tooltip: { theme: mode }
})

// ─── Component ──────────────────────────────────────────────────────────────

const IcoCharts = ({ spaces, rpaTrend }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode

  // ── CSC Distribution ──────────────────────────────────────────────────────
  // Take top 8 spaces with CSC data
  const spacesWithCsc = spaces
    .filter(s => s.cscDistribution.length > 0)
    .slice(0, 8)

  const cscCategories = spacesWithCsc.map(s =>
    s.spaceId.length > 12 ? s.spaceId.slice(0, 12) + '…' : s.spaceId
  )

  const cscPhases: CscPhase[] = ['briefing', 'produccion', 'revision_interna', 'cambios_cliente', 'entrega']

  const cscSeries = cscPhases.map(phase => ({
    name: CSC_PHASE_LABELS[phase],
    data: spacesWithCsc.map(space => {
      const entry = space.cscDistribution.find((d: CscDistributionEntry) => d.phase === phase)

      return entry?.count ?? 0
    })
  }))

  const cscOpts = buildCscBarOptions(
    cscCategories,
    mode,
    GH_COLORS.neutral.border,
    GH_COLORS.neutral.textSecondary
  )

  // ── Pipeline Velocity ─────────────────────────────────────────────────────
  const velocityValues = spaces
    .map(s => {
      const m = s.metrics.find((mv: MetricValue) => mv.metricId === 'pipeline_velocity')

      return m?.value ?? null
    })
    .filter((v): v is number => v !== null)

  const avgVelocity = velocityValues.length > 0
    ? velocityValues.reduce((a, b) => a + b, 0) / velocityValues.length
    : 0

  // Convert ratio to percentage for radialBar (capped at 100)
  const velocityPct = Math.min(100, Math.round(avgVelocity * 100))

  const velocityOpts = buildVelocityGaugeOptions(mode, GH_COLORS.neutral.textSecondary)

  // ── RPA Trend ─────────────────────────────────────────────────────────────
  // Take top 5 spaces sorted by most recent RPA (highest first)
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

  // Build unified month categories from all trend spaces
  const allPeriods = new Set<string>()

  for (const space of trendSpaces) {
    for (const p of space.periods) {
      allPeriods.add(`${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`)
    }
  }

  const sortedPeriods = Array.from(allPeriods).sort()
  const trendCategories = sortedPeriods.map(p => {
    const [y, m] = p.split('-')

    return `${MONTH_SHORT[Number(m) - 1]} ${y}`
  })

  const trendSeries = trendSpaces.map(space => ({
    name: space.spaceId.length > 15 ? space.spaceId.slice(0, 15) + '…' : space.spaceId,
    data: sortedPeriods.map(period => {
      const [y, m] = period.split('-')
      const match = space.periods.find(p => p.periodYear === Number(y) && p.periodMonth === Number(m))

      return match?.rpaAvg ?? null
    })
  }))

  const trendOpts = buildRpaTrendOptions(
    trendCategories,
    trendSeries.length,
    mode,
    GH_COLORS.neutral.border,
    GH_COLORS.neutral.textSecondary
  )

  return (
    <Grid container spacing={6}>
      {/* CSC Distribution */}
      <Grid size={{ xs: 12, md: 8 }}>
        <ExecutiveCardShell
          title='Distribución CSC'
          subtitle='Activos activos por fase de la Cadena de Suministro Creativo'
        >
          {spacesWithCsc.length === 0 ? (
            <EmptyState
              icon='tabler-chart-pie'
              title='Sin datos de distribución'
              description='Las métricas CSC se calculan cuando hay activos activos en los Spaces.'
            />
          ) : (
            <figure
              role='img'
              aria-label={`Distribución CSC para ${spacesWithCsc.length} Spaces`}
              style={{ margin: 0 }}
            >
              <AppReactApexCharts
                type='bar'
                height={320}
                width='100%'
                series={cscSeries}
                options={cscOpts}
              />
            </figure>
          )}
        </ExecutiveCardShell>
      </Grid>

      {/* Pipeline Velocity */}
      <Grid size={{ xs: 12, md: 4 }}>
        <ExecutiveCardShell
          title='Velocidad pipeline'
          subtitle='Ratio de completados sobre activos activos'
        >
          {velocityValues.length === 0 ? (
            <EmptyState
              icon='tabler-bolt'
              title='Sin datos'
              description='Se necesitan activos completados para calcular la velocidad.'
            />
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
                options={velocityOpts}
              />
            </figure>
          )}
        </ExecutiveCardShell>
      </Grid>

      {/* RPA Trend */}
      {rpaTrend !== undefined && (
        <Grid size={{ xs: 12 }}>
          <ExecutiveCardShell
            title={GH_AGENCY.ico_rpa_trend_title}
            subtitle={GH_AGENCY.ico_rpa_trend_subtitle}
          >
            {trendSpaces.length === 0 ? (
              <EmptyState
                icon='tabler-trending-up'
                title={GH_AGENCY.ico_rpa_trend_empty}
                description='Se necesitan al menos 2 meses con datos para visualizar tendencias.'
              />
            ) : (
              <figure
                role='img'
                aria-label={`Evolución mensual del RpA para ${trendSpaces.length} Spaces`}
                style={{ margin: 0 }}
              >
                <AppReactApexCharts
                  type='line'
                  height={320}
                  width='100%'
                  series={trendSeries as ApexAxisChartSeries}
                  options={trendOpts}
                />
              </figure>
            )}
          </ExecutiveCardShell>
        </Grid>
      )}
    </Grid>
  )
}

export default IcoCharts
