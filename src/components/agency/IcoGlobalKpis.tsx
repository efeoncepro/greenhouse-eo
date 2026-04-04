'use client'

import Grid from '@mui/material/Grid'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import type { SpaceMetricSnapshot, MetricValue } from '@/lib/ico-engine/read-metrics'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone } from '@/lib/ico-engine/metric-registry'
import { getAgencyMetricTone, getAgencyMetricUiState } from './metric-trust'

type Props = {
  spaces: SpaceMetricSnapshot[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const getMetricValue = (snapshot: SpaceMetricSnapshot, metricId: string): number | null => {
  const m = snapshot.metrics.find((mv: MetricValue) => mv.metricId === metricId)

  return m?.value ?? null
}

export const getMetric = (snapshot: SpaceMetricSnapshot, metricId: string): MetricValue | undefined =>
  snapshot.metrics.find(metric => metric.metricId === metricId)

export const weightedAvg = (spaces: SpaceMetricSnapshot[], metricId: string): number | null => {
  const values = spaces
    .map(s => getMetricValue(s, metricId))
    .filter((v): v is number => v !== null)

  if (values.length === 0) return null

  return values.reduce((a, b) => a + b, 0) / values.length
}

export const totalMetric = (spaces: SpaceMetricSnapshot[], metricId: string): number =>
  spaces.reduce((sum, s) => sum + (getMetricValue(s, metricId) ?? 0), 0)

export const getRepresentativeMetric = (spaces: SpaceMetricSnapshot[], metricId: string): MetricValue | null => {
  const metrics = spaces
    .map(snapshot => getMetric(snapshot, metricId))
    .filter((metric): metric is MetricValue => Boolean(metric))

  return metrics.find(metric => getAgencyMetricUiState(metric) === 'unavailable')
    ?? metrics.find(metric => getAgencyMetricUiState(metric) === 'degraded')
    ?? metrics.find(metric => getAgencyMetricUiState(metric) === 'valid')
    ?? null
}

export const summarizeMetricCoverage = (spaces: SpaceMetricSnapshot[], metricId: string) => {
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

export const getRpaZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v <= 1.5) return 'optimal'
  if (v <= 2.5) return 'attention'

  return 'critical'
}

export const getOtdZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v >= 90) return 'optimal'
  if (v >= 70) return 'attention'

  return 'critical'
}

export const getFtrZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v >= 80) return 'optimal'
  if (v >= 60) return 'attention'

  return 'critical'
}

export const getThroughputZone = (v: number): ThresholdZone => {
  if (v >= 20) return 'optimal'
  if (v >= 10) return 'attention'

  return 'critical'
}

export const getCycleZone = (v: number | null): ThresholdZone | null => {
  if (v === null) return null
  if (v <= 7) return 'optimal'
  if (v <= 14) return 'attention'

  return 'critical'
}

export const getStuckZone = (v: number): ThresholdZone => {
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
  const rpaCoverage = summarizeMetricCoverage(spaces, 'rpa')
  const otdCoverage = summarizeMetricCoverage(spaces, 'otd_pct')
  const ftrCoverage = summarizeMetricCoverage(spaces, 'ftr_pct')
  const throughputCoverage = summarizeMetricCoverage(spaces, 'throughput')
  const rpaMetric = getRepresentativeMetric(spaces, 'rpa')
  const otdMetric = getRepresentativeMetric(spaces, 'otd_pct')
  const ftrMetric = getRepresentativeMetric(spaces, 'ftr_pct')
  const throughputMetric = getRepresentativeMetric(spaces, 'throughput')

  const kpis = [
    {
      title: 'RpA Promedio',
      stats: rpa !== null ? <AnimatedCounter value={rpa} formatter={v => v.toFixed(1)} /> : '—',
      subtitle: 'Revisiones por activo',
      avatarIcon: 'tabler-chart-dots-3',
      avatarColor: getAgencyMetricTone(rpaMetric) || getZoneColor(getRpaZone(rpa)),
      titleTooltip: rpaCoverage.footer
    },
    {
      title: 'OTD%',
      stats: otd !== null ? <AnimatedCounter value={otd} format='percentage' /> : '—',
      subtitle: 'Entrega a tiempo',
      avatarIcon: 'tabler-clock-check',
      avatarColor: getAgencyMetricTone(otdMetric) || getZoneColor(getOtdZone(otd)),
      titleTooltip: otdCoverage.footer
    },
    {
      title: 'FTR%',
      stats: ftr !== null ? <AnimatedCounter value={ftr} format='percentage' /> : '—',
      subtitle: 'Primera entrega correcta',
      avatarIcon: 'tabler-target-arrow',
      avatarColor: getAgencyMetricTone(ftrMetric) || getZoneColor(getFtrZone(ftr)),
      titleTooltip: ftrCoverage.footer
    },
    {
      title: 'Throughput',
      stats: throughput !== null ? <AnimatedCounter value={throughput} format='integer' /> : '—',
      subtitle: 'Activos completados',
      avatarIcon: 'tabler-rocket',
      avatarColor: getAgencyMetricTone(throughputMetric) || getZoneColor(getThroughputZone(throughput)),
      titleTooltip: throughputCoverage.footer
    }
  ]

  return (
    <Grid container spacing={6}>
      {kpis.map((kpi, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle {...kpi} />
        </Grid>
      ))}
    </Grid>
  )
}

export default IcoGlobalKpis
