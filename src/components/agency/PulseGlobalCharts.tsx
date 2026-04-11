'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencyChartStatusItem, AgencyChartWeeklyPoint, AgencySpaceHealth } from '@/lib/agency/agency-queries'
import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import EmptyState from '@/components/greenhouse/EmptyState'

type Props = {
  spaces: AgencySpaceHealth[]
  statusMix: AgencyChartStatusItem[]
  weeklyActivity: AgencyChartWeeklyPoint[]
}

const STATUS_COLORS = [
  GH_COLORS.chart.primary,
  GH_COLORS.semaphore.yellow.source,
  GH_COLORS.semaphore.red.source,
  GH_COLORS.semaphore.green.source
]

const PulseGlobalCharts = ({ spaces, statusMix, weeklyActivity }: Props) => {
  const theme = useTheme()

  const baseApexOptions = {
    chart: { toolbar: { show: false }, zoom: { enabled: false }, background: 'transparent' },
    theme: { mode: theme.palette.mode },
    grid: { borderColor: theme.palette.customColors.lightAlloy, strokeDashArray: 4 },
    tooltip: { theme: theme.palette.mode }
  }

  // ── RpA por Space ─────────────────────────────────────────────────────────
  const spacesWithRpa = [...spaces].filter(s => s.rpaAvg !== null).sort((a, b) => (b.rpaAvg ?? 0) - (a.rpaAvg ?? 0))

  const rpaBarOptions = {
    ...baseApexOptions,
    chart: { ...baseApexOptions.chart, type: 'bar' as const },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
    colors: spacesWithRpa.map(s =>
      (s.rpaAvg ?? 0) <= 1.5
        ? GH_COLORS.semaphore.green.source
        : (s.rpaAvg ?? 0) <= 2.5
          ? GH_COLORS.semaphore.yellow.source
          : GH_COLORS.semaphore.red.source
    ),
    xaxis: {
      categories: spacesWithRpa.map(s => s.clientName),
      labels: { style: { colors: theme.palette.text.secondary, fontSize: '12px' } }
    },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary, fontSize: '12px' } } },
    annotations: {
      xaxis: [{ x: 2.0, borderColor: GH_COLORS.semaphore.yellow.source, strokeDashArray: 4, label: { text: 'Límite ICO', style: { color: GH_COLORS.semaphore.yellow.source } } }]
    },
    dataLabels: { enabled: true, style: { fontSize: '11px', colors: [theme.palette.customColors.midnight] } }
  }

  // ── Status mix (donut) ────────────────────────────────────────────────────
  const donutOptions = {
    ...baseApexOptions,
    chart: { ...baseApexOptions.chart, type: 'donut' as const },
    labels: statusMix.map(s => s.label),
    colors: STATUS_COLORS.slice(0, statusMix.length),
    legend: { position: 'bottom' as const, labels: { colors: theme.palette.text.secondary } },
    dataLabels: { enabled: true, style: { fontSize: '12px' } }
  }

  // ── Activity timeline ─────────────────────────────────────────────────────
  const timelineOptions = {
    ...baseApexOptions,
    chart: { ...baseApexOptions.chart, type: 'line' as const },
    stroke: { curve: 'smooth' as const, width: 3 },
    colors: [GH_COLORS.chart.primary],
    xaxis: {
      categories: weeklyActivity.map(w => {
        try { return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric' }).format(new Date(w.weekStart)) }
        catch { return w.weekStart }
      }),
      labels: { style: { colors: theme.palette.text.secondary, fontSize: '11px' } },
      tickAmount: 8
    },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
    markers: { size: 4, colors: [GH_COLORS.chart.primary], strokeColors: '#fff', strokeWidth: 2 }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}>
      {/* RpA por Space */}
      <ExecutiveCardShell title='RpA por Space' subtitle='Mayor a menor — peor rendimiento arriba'>
        {spacesWithRpa.length === 0 ? (
          <EmptyState icon='tabler-chart-bar' title='Sin data' description={GH_AGENCY.empty_pulse} />
        ) : (
          <AppReactApexCharts
            type='bar'
            height={Math.max(180, spacesWithRpa.length * 40)}
            width='100%'
            series={[{ name: 'RpA', data: spacesWithRpa.map(s => Number((s.rpaAvg ?? 0).toFixed(2))) }]}
            options={rpaBarOptions}
          />
        )}
      </ExecutiveCardShell>

      {/* Status global */}
      <ExecutiveCardShell title='Status global' subtitle='Distribución de assets por estado, todos los Spaces'>
        {statusMix.length === 0 || statusMix.reduce((s, i) => s + i.value, 0) === 0 ? (
          <EmptyState icon='tabler-chart-donut-3' title='Sin data' description={GH_AGENCY.empty_pulse} />
        ) : (
          <AppReactApexCharts
            type='donut'
            height={320}
            width='100%'
            series={statusMix.map(s => s.value)}
            options={donutOptions}
          />
        )}
      </ExecutiveCardShell>

      {/* Activity timeline */}
      <ExecutiveCardShell title='Activity timeline' subtitle='Assets completados por semana — últimas 12 semanas'>
        {weeklyActivity.filter(w => w.completed > 0).length < 2 ? (
          <EmptyState icon='tabler-chart-line' title='Sin data' description={GH_AGENCY.empty_pulse} />
        ) : (
          <AppReactApexCharts
            type='line'
            height={260}
            width='100%'
            series={[{ name: 'Completados', data: weeklyActivity.map(w => w.completed) }]}
            options={timelineOptions}
          />
        )}
      </ExecutiveCardShell>

      {/* Placeholder cuadrante 4 */}
      <ExecutiveCardShell title='Volumen por Space' subtitle='Próximamente disponible'>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
          <Typography variant='body2' sx={{ color: theme.palette.text.secondary }}>
            Disponible cuando haya 2+ semanas de data por Space.
          </Typography>
        </Box>
      </ExecutiveCardShell>
    </Box>
  )
}

export default PulseGlobalCharts
