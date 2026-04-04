'use client'

import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

type TrustColor = 'success' | 'warning' | 'error' | 'secondary'
export type AgencyMetricUiState = 'valid' | 'degraded' | 'unavailable'

export type TrustMetricLike = {
  value: number | null
  benchmarkType?: 'external' | 'analog' | 'adapted' | 'internal'
  qualityGateStatus?: 'healthy' | 'degraded' | 'broken'
  qualityGateReasons?: string[]
  dataStatus?: 'valid' | 'low_confidence' | 'suppressed' | 'unavailable'
  confidenceLevel?: 'high' | 'medium' | 'low' | 'none'
  trustEvidence?: {
    sampleSize: number | null
  }
}

type TrustSummary = {
  statusLabel: string
  statusColor: TrustColor
  footer: string
  tooltip: string
  benchmarkLabel: string | null
  confidenceLabel: string | null
}

const BENCHMARK_LABEL: Record<NonNullable<TrustMetricLike['benchmarkType']>, string> = {
  external: 'Benchmark externo',
  analog: 'Benchmark análogo',
  adapted: 'Benchmark adaptado',
  internal: 'Policy interna'
}

const CONFIDENCE_LABEL: Record<NonNullable<TrustMetricLike['confidenceLevel']>, string> = {
  high: 'Confianza alta',
  medium: 'Confianza media',
  low: 'Confianza baja',
  none: 'Sin confianza'
}

const QUALITY_REASON_LABEL: Record<string, string> = {
  limited_sample_size: 'muestra limitada',
  no_classified_delivery_tasks: 'sin tareas clasificadas',
  no_completed_tasks: 'sin tareas completadas',
  no_active_tasks: 'sin tareas activas',
  no_tasks_in_period: 'sin tareas en el período',
  rpa_policy_unavailable: 'policy RpA no disponible',
  missing_metric_value: 'sin valor disponible',
  low_throughput_sample: 'throughput insuficiente',
  no_top_performer_sample: 'sin muestra elegible',
  no_positive_rpa_values: 'sin activos elegibles para RpA',
  no_rpa_eligible_tasks: 'sin muestra elegible para RpA'
}

const normalizeReasons = (metric: TrustMetricLike): string[] => {
  const reasons = [...(metric.qualityGateReasons ?? [])]

  if (metric.dataStatus === 'suppressed') {
    reasons.push('no_positive_rpa_values')
  }

  if (metric.dataStatus === 'unavailable') {
    reasons.push('no_rpa_eligible_tasks')
  }

  return Array.from(new Set(reasons)).map(reason => QUALITY_REASON_LABEL[reason] ?? reason)
}

export const getAgencyMetricUiState = (metric: TrustMetricLike | null | undefined): AgencyMetricUiState => {
  if (!metric) return 'unavailable'

  if (
    metric.value === null ||
    metric.dataStatus === 'suppressed' ||
    metric.dataStatus === 'unavailable' ||
    metric.qualityGateStatus === 'broken'
  ) {
    return 'unavailable'
  }

  if (metric.dataStatus === 'low_confidence' || metric.qualityGateStatus === 'degraded') {
    return 'degraded'
  }

  return 'valid'
}

export const getAgencyMetricTrustSummary = (metric: TrustMetricLike | null | undefined): TrustSummary => {
  if (!metric) {
    return {
      statusLabel: 'Sin dato confiable',
      statusColor: 'secondary',
      footer: 'Sin metadata de confianza',
      tooltip: 'No hay metadata de confianza disponible para esta métrica.',
      benchmarkLabel: null,
      confidenceLabel: null
    }
  }

  const benchmarkLabel = metric.benchmarkType ? BENCHMARK_LABEL[metric.benchmarkType] : null
  const confidenceLabel = metric.confidenceLevel ? CONFIDENCE_LABEL[metric.confidenceLevel] : null
  const sampleLabel = metric.trustEvidence?.sampleSize != null ? `Muestra ${metric.trustEvidence.sampleSize}` : null
  const reasons = normalizeReasons(metric)

  const footerParts = [benchmarkLabel, confidenceLabel, sampleLabel].filter(Boolean)
  const footer = footerParts.join(' · ') || 'Sin metadata de confianza'

  if (metric.value === null || metric.dataStatus === 'suppressed' || metric.dataStatus === 'unavailable' || metric.qualityGateStatus === 'broken') {
    return {
      statusLabel: 'Sin dato confiable',
      statusColor: 'error',
      footer,
      tooltip: reasons.length > 0 ? `No confiable: ${reasons.join(', ')}.` : 'El valor no es confiable para mostrarse como señal operativa.',
      benchmarkLabel,
      confidenceLabel
    }
  }

  if (metric.dataStatus === 'low_confidence' || metric.qualityGateStatus === 'degraded') {
    return {
      statusLabel: 'Dato degradado',
      statusColor: 'warning',
      footer,
      tooltip: reasons.length > 0 ? `Dato degradado por ${reasons.join(', ')}.` : 'El valor existe, pero debe leerse con cautela.',
      benchmarkLabel,
      confidenceLabel
    }
  }

  return {
    statusLabel: 'Dato confiable',
    statusColor: 'success',
    footer,
    tooltip: reasons.length > 0 ? `Dato confiable con notas: ${reasons.join(', ')}.` : 'El valor tiene soporte suficiente para lectura operativa.',
    benchmarkLabel,
    confidenceLabel
  }
}

export const getAgencyMetricStatusLabel = (metric: TrustMetricLike | null | undefined) =>
  getAgencyMetricTrustSummary(metric).statusLabel

export const getAgencyMetricStatusColor = (metric: TrustMetricLike | null | undefined) =>
  getAgencyMetricTrustSummary(metric).statusColor

export const getAgencyMetricFooterLabel = (metric: TrustMetricLike | null | undefined) =>
  getAgencyMetricTrustSummary(metric).footer

export const getAgencyMetricSupportLabel = (metric: TrustMetricLike | null | undefined) => {
  const state = getAgencyMetricUiState(metric)
  const benchmark = metric?.benchmarkType ? BENCHMARK_LABEL[metric.benchmarkType] : null

  if (state === 'unavailable') return 'Sin base suficiente para lectura operativa'
  if (state === 'degraded') return benchmark ? `${benchmark} con muestra limitada` : 'Dato disponible con soporte parcial'

  return benchmark ?? 'Dato operativo confiable'
}

export const getAgencyMetricTone = (metric: TrustMetricLike | null | undefined): TrustColor => {
  const state = getAgencyMetricUiState(metric)

  if (state === 'valid') return 'success'
  if (state === 'degraded') return 'warning'

  return 'secondary'
}

export const AgencyMetricStatusChip = ({
  metric
}: {
  metric: TrustMetricLike | null | undefined
}) => {
  const summary = getAgencyMetricTrustSummary(metric)

  return (
    <Tooltip title={summary.tooltip}>
      <span>
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={summary.statusColor}
          label={summary.statusLabel}
          sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
        />
      </span>
    </Tooltip>
  )
}

export const AgencyMetricTrustInline = ({
  metric,
  dense = false
}: {
  metric: TrustMetricLike | null | undefined
  dense?: boolean
}) => {
  const summary = getAgencyMetricTrustSummary(metric)

  return (
    <Tooltip title={summary.tooltip}>
      <Stack direction='row' spacing={0.75} alignItems='center' flexWrap='wrap' useFlexGap>
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={summary.statusColor}
          label={summary.statusLabel}
          sx={{
            height: dense ? 20 : 22,
            fontSize: dense ? '0.64rem' : '0.68rem',
            fontWeight: 600
          }}
        />
        {dense ? null : (
          <Typography variant='caption' color='text.secondary'>
            {summary.footer}
          </Typography>
        )}
      </Stack>
    </Tooltip>
  )
}
