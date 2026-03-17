'use client'

import Grid from '@mui/material/Grid'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import type { SpaceMetricSnapshot, MetricValue } from '@/lib/ico-engine/read-metrics'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone } from '@/lib/ico-engine/metric-registry'

type Props = {
  spaces: SpaceMetricSnapshot[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getMetricValue = (snapshot: SpaceMetricSnapshot, metricId: string): number | null => {
  const m = snapshot.metrics.find((mv: MetricValue) => mv.metricId === metricId)

  return m?.value ?? null
}

const weightedAvg = (spaces: SpaceMetricSnapshot[], metricId: string): number | null => {
  const values = spaces
    .map(s => getMetricValue(s, metricId))
    .filter((v): v is number => v !== null)

  if (values.length === 0) return null

  return values.reduce((a, b) => a + b, 0) / values.length
}

const totalMetric = (spaces: SpaceMetricSnapshot[], metricId: string): number =>
  spaces.reduce((sum, s) => sum + (getMetricValue(s, metricId) ?? 0), 0)

const getZoneColor = (zone: ThresholdZone | null) =>
  zone ? THRESHOLD_ZONE_COLOR[zone] : ('secondary' as const)

const getRpaZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v <= 1.5) return 'optimal'
  if (v <= 2.5) return 'attention'

  return 'critical'
}

const getOtdZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v >= 90) return 'optimal'
  if (v >= 70) return 'attention'

  return 'critical'
}

const getFtrZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v >= 80) return 'optimal'
  if (v >= 60) return 'attention'

  return 'critical'
}

const getThroughputZone = (v: number): ThresholdZone => {
  if (v >= 20) return 'optimal'
  if (v >= 10) return 'attention'

  return 'critical'
}

const getCycleZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v <= 7) return 'optimal'
  if (v <= 14) return 'attention'

  return 'critical'
}

const getStuckZone = (v: number): ThresholdZone => {
  if (v <= 2) return 'optimal'
  if (v <= 5) return 'attention'

  return 'critical'
}

// ─── Component ──────────────────────────────────────────────────────────────

const IcoGlobalKpis = ({ spaces }: Props) => {
  const rpa = weightedAvg(spaces, 'rpa')
  const otd = weightedAvg(spaces, 'otd_pct')
  const ftr = weightedAvg(spaces, 'ftr_pct')
  const throughput = totalMetric(spaces, 'throughput')
  const cycle = weightedAvg(spaces, 'cycle_time')
  const stuck = totalMetric(spaces, 'stuck_assets')

  const kpis = [
    {
      title: 'RpA Promedio',
      stats: rpa !== null ? rpa.toFixed(2) : '—',
      subtitle: 'Revisiones por activo',
      avatarIcon: 'tabler-chart-dots-3',
      avatarColor: getZoneColor(getRpaZone(rpa))
    },
    {
      title: 'OTD%',
      stats: otd !== null ? `${Math.round(otd)}%` : '—',
      subtitle: 'Entrega a tiempo',
      avatarIcon: 'tabler-clock-check',
      avatarColor: getZoneColor(getOtdZone(otd))
    },
    {
      title: 'FTR%',
      stats: ftr !== null ? `${Math.round(ftr)}%` : '—',
      subtitle: 'Primera entrega correcta',
      avatarIcon: 'tabler-target-arrow',
      avatarColor: getZoneColor(getFtrZone(ftr))
    },
    {
      title: 'Throughput',
      stats: String(throughput),
      subtitle: 'Activos completados',
      avatarIcon: 'tabler-rocket',
      avatarColor: getZoneColor(getThroughputZone(throughput))
    },
    {
      title: 'Ciclo promedio',
      stats: cycle !== null ? `${cycle.toFixed(1)}d` : '—',
      subtitle: 'Días de producción',
      avatarIcon: 'tabler-hourglass',
      avatarColor: getZoneColor(getCycleZone(cycle))
    },
    {
      title: 'Estancados',
      stats: String(stuck),
      subtitle: 'Sin movimiento 72h+',
      avatarIcon: 'tabler-alert-triangle',
      avatarColor: getZoneColor(getStuckZone(stuck))
    }
  ] as const

  return (
    <Grid container spacing={6}>
      {kpis.map((kpi, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <HorizontalWithSubtitle {...kpi} />
        </Grid>
      ))}
    </Grid>
  )
}

export default IcoGlobalKpis
