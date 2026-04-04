'use client'

import Grid from '@mui/material/Grid'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import type { SpaceMetricSnapshot, MetricValue } from '@/lib/ico-engine/read-metrics'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone } from '@/lib/ico-engine/metric-registry'
import { getAgencyMetricTone, getAgencyMetricUiState } from './metric-trust'

type Props = {
  spaces: SpaceMetricSnapshot[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getMetricValue = (snapshot: SpaceMetricSnapshot, metricId: string): number | null => {
  const m = snapshot.metrics.find((mv: MetricValue) => mv.metricId === metricId)

  return m?.value ?? null
}

const getMetric = (snapshot: SpaceMetricSnapshot, metricId: string): MetricValue | undefined =>
  snapshot.metrics.find(metric => metric.metricId === metricId)

const weightedAvg = (spaces: SpaceMetricSnapshot[], metricId: string): number | null => {
  const values = spaces
    .map(s => getMetricValue(s, metricId))
    .filter((v): v is number => v !== null)

  if (values.length === 0) return null

  return values.reduce((a, b) => a + b, 0) / values.length
}

const totalMetric = (spaces: SpaceMetricSnapshot[], metricId: string): number =>
  spaces.reduce((sum, s) => sum + (getMetricValue(s, metricId) ?? 0), 0)

const getRepresentativeMetric = (spaces: SpaceMetricSnapshot[], metricId: string): MetricValue | null => {
  const metrics = spaces
    .map(snapshot => getMetric(snapshot, metricId))
    .filter((metric): metric is MetricValue => Boolean(metric))

  return metrics.find(metric => getAgencyMetricUiState(metric) === 'unavailable')
    ?? metrics.find(metric => getAgencyMetricUiState(metric) === 'degraded')
    ?? metrics.find(metric => getAgencyMetricUiState(metric) === 'valid')
    ?? null
}

const summarizeMetricCoverage = (spaces: SpaceMetricSnapshot[], metricId: string) => {
  const states = spaces.map(snapshot => getAgencyMetricUiState(getMetric(snapshot, metricId)))
  const valid = states.filter(state => state === 'valid').length
  const degraded = states.filter(state => state === 'degraded').length
  const unavailable = states.filter(state => state === 'unavailable').length

  if (unavailable === spaces.length) {
    return {
      statusLabel: 'Sin base confiable',
      statusColor: 'secondary' as const,
      footer: 'Ningún space tiene muestra suficiente'
    }
  }

  if (degraded > 0 || unavailable > 0) {
    return {
      statusLabel: 'Cobertura parcial',
      statusColor: 'warning' as const,
      footer: `${valid} confiables · ${degraded} degradados · ${unavailable} sin base`
    }
  }

  return {
    statusLabel: 'Confiable',
    statusColor: 'success' as const,
    footer: `${valid}/${spaces.length} spaces con base confiable`
  }
}

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
  const rpaCoverage = summarizeMetricCoverage(spaces, 'rpa')
  const otdCoverage = summarizeMetricCoverage(spaces, 'otd_pct')
  const ftrCoverage = summarizeMetricCoverage(spaces, 'ftr_pct')
  const throughputCoverage = summarizeMetricCoverage(spaces, 'throughput')
  const cycleCoverage = summarizeMetricCoverage(spaces, 'cycle_time')
  const stuckCoverage = summarizeMetricCoverage(spaces, 'stuck_assets')
  const rpaMetric = getRepresentativeMetric(spaces, 'rpa')
  const otdMetric = getRepresentativeMetric(spaces, 'otd_pct')
  const ftrMetric = getRepresentativeMetric(spaces, 'ftr_pct')
  const throughputMetric = getRepresentativeMetric(spaces, 'throughput')
  const cycleMetric = getRepresentativeMetric(spaces, 'cycle_time')
  const stuckMetric = getRepresentativeMetric(spaces, 'stuck_assets')

  const kpis = [
    {
      title: 'RpA Promedio',
      stats: rpa !== null ? rpa.toFixed(2) : '—',
      subtitle: 'Revisiones por activo',
      avatarIcon: 'tabler-chart-dots-3',
      avatarColor: getAgencyMetricTone(rpaMetric) || getZoneColor(getRpaZone(rpa)),
      statusLabel: rpaCoverage.statusLabel,
      statusColor: rpaCoverage.statusColor,
      footer: rpaCoverage.footer
    },
    {
      title: 'OTD%',
      stats: otd !== null ? `${Math.round(otd)}%` : '—',
      subtitle: 'Entrega a tiempo',
      avatarIcon: 'tabler-clock-check',
      avatarColor: getAgencyMetricTone(otdMetric) || getZoneColor(getOtdZone(otd)),
      statusLabel: otdCoverage.statusLabel,
      statusColor: otdCoverage.statusColor,
      footer: otdCoverage.footer
    },
    {
      title: 'FTR%',
      stats: ftr !== null ? `${Math.round(ftr)}%` : '—',
      subtitle: 'Primera entrega correcta',
      avatarIcon: 'tabler-target-arrow',
      avatarColor: getAgencyMetricTone(ftrMetric) || getZoneColor(getFtrZone(ftr)),
      statusLabel: ftrCoverage.statusLabel,
      statusColor: ftrCoverage.statusColor,
      footer: ftrCoverage.footer
    },
    {
      title: 'Throughput',
      stats: String(throughput),
      subtitle: 'Activos completados',
      avatarIcon: 'tabler-rocket',
      avatarColor: getAgencyMetricTone(throughputMetric) || getZoneColor(getThroughputZone(throughput)),
      statusLabel: throughputCoverage.statusLabel,
      statusColor: throughputCoverage.statusColor,
      footer: throughputCoverage.footer
    },
    {
      title: 'Ciclo promedio',
      stats: cycle !== null ? `${cycle.toFixed(1)}d` : '—',
      subtitle: 'Días de producción',
      avatarIcon: 'tabler-hourglass',
      avatarColor: getAgencyMetricTone(cycleMetric) || getZoneColor(getCycleZone(cycle)),
      statusLabel: cycleCoverage.statusLabel,
      statusColor: cycleCoverage.statusColor,
      footer: cycleCoverage.footer
    },
    {
      title: 'Estancados',
      stats: String(stuck),
      subtitle: 'Sin movimiento 72h+',
      avatarIcon: 'tabler-alert-triangle',
      avatarColor: getAgencyMetricTone(stuckMetric) || getZoneColor(getStuckZone(stuck)),
      statusLabel: stuckCoverage.statusLabel,
      statusColor: stuckCoverage.statusColor,
      footer: stuckCoverage.footer
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
