'use client'

import dynamic from 'next/dynamic'

import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'
import { getSpaceHealth, HEALTH_ZONE_LABEL, type SpaceHealthZone } from './space-health'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  spaces: AgencySpaceHealth[]
}

// ─── Chart Builders (outside component for perf) ────────────────────────────

const buildRpaBarOptions = (
  categories: string[],
  colors: string[],
  borderColor: string,
  textSecondary: string,
  mode: 'light' | 'dark'
): ApexOptions => ({
  chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
  theme: { mode },
  plotOptions: {
    bar: { horizontal: true, borderRadius: 4, distributed: true, dataLabels: { position: 'top' } }
  },
  colors,
  legend: { show: false },
  grid: { borderColor, strokeDashArray: 4 },
  xaxis: {
    categories,
    labels: { style: { colors: textSecondary, fontSize: '12px' } }
  },
  yaxis: {
    labels: {
      style: { colors: textSecondary, fontSize: '12px' },
      maxWidth: 120
    }
  },
  annotations: {
    xaxis: [{
      x: 1.5,
      borderColor: GH_COLORS.semaphore.yellow.source,
      strokeDashArray: 4,
      label: {
        text: 'Óptimo ≤ 1.5',
        position: 'front',
        style: { color: GH_COLORS.semaphore.yellow.source, background: 'transparent', fontSize: '10px' }
      }
    }]
  },
  dataLabels: { enabled: true, style: { fontSize: '11px', colors: [GH_COLORS.neutral.textPrimary] }, offsetX: 30 },
  tooltip: { theme: mode }
})

const buildHealthDonutOptions = (
  labels: string[],
  colors: string[],
  borderColor: string,
  textSecondary: string,
  mode: 'light' | 'dark',
  total: number
): ApexOptions => ({
  chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
  theme: { mode },
  labels,
  colors,
  legend: { position: 'bottom', labels: { colors: textSecondary } },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          name: { show: true, fontSize: '14px', color: textSecondary },
          value: { show: true, fontSize: '22px', fontWeight: 700 },
          total: {
            show: true,
            label: 'Total',
            fontSize: '14px',
            color: textSecondary,
            formatter: () => String(total)
          }
        }
      }
    }
  },
  dataLabels: { enabled: false },
  tooltip: { theme: mode }
})

// ─── Component ──────────────────────────────────────────────────────────────

const SpacesCharts = ({ spaces }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode

  // ── RpA Bar Chart ─────────────────────────────────────────────────────────
  const spacesWithRpa = [...spaces]
    .filter(s => s.rpaAvg !== null)
    .sort((a, b) => (b.rpaAvg ?? 0) - (a.rpaAvg ?? 0))
    .slice(0, 12)

  const rpaCategories = spacesWithRpa.map(s =>
    s.clientName.length > 15 ? s.clientName.slice(0, 15) + '…' : s.clientName
  )

  const rpaColors = spacesWithRpa.map(s =>
    (s.rpaAvg ?? 0) <= 1.5
      ? GH_COLORS.semaphore.green.source
      : (s.rpaAvg ?? 0) <= 2.5
        ? GH_COLORS.semaphore.yellow.source
        : GH_COLORS.semaphore.red.source
  )

  const rpaBarOpts = buildRpaBarOptions(
    rpaCategories,
    rpaColors,
    GH_COLORS.neutral.border,
    GH_COLORS.neutral.textSecondary,
    mode
  )

  // ── Health Donut ──────────────────────────────────────────────────────────
  const healthCounts: Record<SpaceHealthZone, number> = { optimal: 0, attention: 0, critical: 0 }

  for (const space of spaces) {
    healthCounts[getSpaceHealth(space)]++
  }

  const donutLabels = [
    HEALTH_ZONE_LABEL.optimal,
    HEALTH_ZONE_LABEL.attention,
    HEALTH_ZONE_LABEL.critical
  ]

  const donutColors = [
    GH_COLORS.semaphore.green.source,
    GH_COLORS.semaphore.yellow.source,
    GH_COLORS.semaphore.red.source
  ]

  const donutSeries = [healthCounts.optimal, healthCounts.attention, healthCounts.critical]

  const donutOpts = buildHealthDonutOptions(
    donutLabels,
    donutColors,
    GH_COLORS.neutral.border,
    GH_COLORS.neutral.textSecondary,
    mode,
    spaces.length
  )

  return (
    <Grid container spacing={6}>
      {/* RpA por Space */}
      <Grid size={{ xs: 12, md: 8 }}>
        <ExecutiveCardShell
          title={GH_AGENCY.spaces_chart_rpa_title}
          subtitle={GH_AGENCY.spaces_chart_rpa_subtitle}
        >
          {spacesWithRpa.length === 0 ? (
            <EmptyState
              icon='tabler-chart-bar'
              title='Sin datos de RpA'
              description='Los Spaces aún no tienen datos de revisiones por activo.'
            />
          ) : (
            <figure
              role='img'
              aria-label={`Gráfico de barras: revisiones por activo para ${spacesWithRpa.length} Spaces`}
              style={{ margin: 0 }}
            >
              <AppReactApexCharts
                type='bar'
                height={Math.max(180, spacesWithRpa.length * 36)}
                width='100%'
                series={[{ name: 'RpA', data: spacesWithRpa.map(s => Number((s.rpaAvg ?? 0).toFixed(2))) }]}
                options={rpaBarOpts}
              />
            </figure>
          )}
        </ExecutiveCardShell>
      </Grid>

      {/* Health donut */}
      <Grid size={{ xs: 12, md: 4 }}>
        <ExecutiveCardShell
          title={GH_AGENCY.spaces_chart_health_title}
          subtitle={GH_AGENCY.spaces_chart_health_subtitle}
        >
          {spaces.length === 0 ? (
            <EmptyState
              icon='tabler-chart-donut-3'
              title='Sin datos'
              description='No hay Spaces para clasificar.'
            />
          ) : (
            <figure
              role='img'
              aria-label={`Distribución de salud: ${healthCounts.optimal} óptimos, ${healthCounts.attention} en atención, ${healthCounts.critical} críticos`}
              style={{ margin: 0 }}
            >
              <AppReactApexCharts
                type='donut'
                height={300}
                width='100%'
                series={donutSeries}
                options={donutOpts}
              />
            </figure>
          )}
        </ExecutiveCardShell>
      </Grid>
    </Grid>
  )
}

export default SpacesCharts
