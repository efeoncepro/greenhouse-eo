// ─── Types ──────────────────────────────────────────────────────────────────

export type MetricGranularity = 'monthly' | 'weekly'
export type MetricKind = 'average' | 'percentage' | 'count' | 'duration' | 'distribution' | 'ratio' | 'composite'
export type MetricScope = 'space' | 'project' | 'member' | 'sprint' | 'person'
export type ThresholdZone = 'optimal' | 'attention' | 'critical'
export type MetricBenchmarkType = 'external' | 'analog' | 'adapted' | 'internal'
export type MetricConfidenceLevel = 'high' | 'medium' | 'none'
export type MetricQualityGateStatus = 'healthy' | 'degraded' | 'broken'
export type MetricTrustSampleBasis =
  | 'rpa_policy'
  | 'delivery_classified_tasks'
  | 'completed_tasks'
  | 'active_tasks'
  | 'total_tasks'

export interface MetricThreshold {
  optimal: { min: number; max: number }
  attention: { min: number; max: number }
  critical: { min: number; max: number }
}

export interface FormulaConfig {
  kind: MetricKind
  sourceField?: string
  numeratorCondition?: string
  denominatorCondition?: string
  buckets?: readonly string[]
  percentile?: number
  durationUnit?: 'days' | 'hours'
}

export interface MetricBenchmarkConfig {
  type: MetricBenchmarkType
  label: string
  source: string
}

export interface MetricTrustConfig {
  sampleBasis: MetricTrustSampleBasis
  healthyMinSampleSize: number
}

export interface MetricDefinition {
  id: string
  code: string
  label: string
  shortName: string
  description: string
  unit: string
  granularities: readonly MetricGranularity[]
  formula: FormulaConfig
  thresholds: MetricThreshold
  higherIsBetter: boolean
  icon: string
  color: 'success' | 'warning' | 'error' | 'primary' | 'info'
  benchmark?: MetricBenchmarkConfig
  trust?: MetricTrustConfig

  /** Scopes where this metric is available. Defaults to all if omitted. */
  scopes?: readonly MetricScope[]

  /** For composite metrics: input metric codes or data source fields needed. */
  compositeInputs?: readonly string[]
}

/** Forward-compatible config for AI-generated metrics (spec §12.5.7). */
export interface AIMetricConfig {
  agentId: string
  model: string
  promptVersionTag: string
  triggerEvent: 'phase_change' | 'batch' | 'manual'
  triggerPhase?: string
  maxTokens: number
  costPerEvalUsd: number
}

// ─── CSC Phase Buckets ──────────────────────────────────────────────────────

export const CSC_PHASES = ['briefing', 'produccion', 'revision_interna', 'cambios_cliente', 'entrega'] as const
export type CscPhase = (typeof CSC_PHASES)[number]

export const CSC_PHASE_LABELS: Record<CscPhase, string> = {
  briefing: 'Briefing',
  produccion: 'Producción',
  revision_interna: 'Revisión interna',
  cambios_cliente: 'Cambios cliente',
  entrega: 'Entrega'
}

// CSC chart colors (UI concern) viven en la capa UI, NO acá: este módulo es código
// de dominio bundleado por el worker ico-batch, cuyo build excluye `src/@core`
// (capa de tema AXIS/Vuexy). Importar `@core/theme/*` en código de dominio
// worker-bundled rompe el bundle (TASK-1048 — incidente ICO batch 2026-06-08).
// Ver `src/components/greenhouse/charts/csc-chart-colors.ts`. metric-registry
// mantiene la definición de fase + labels (dominio puro, sin `@core`).

// ─── Task Status → CSC Phase Mapping ────────────────────────────────────────
// task_status values come from Notion (Spanish) but the column name is English.
//
// Canonical V1 source of truth: `src/lib/delivery/task-status-canonical.ts`.
// All status names (canonical V1 + Efeonce legacy + Sky legacy + English /
// accent variants) are mapped via the central alias table. Adding a tenant
// variant means adding one entry there, NOT mutating this map.

import {
  TASK_STATUS_CANONICAL,
  TASK_STATUS_GROUPS,
  allVariantsForCanonical,
  allVariantsForGroup,
  taskStatusGroupSql
} from '@/lib/delivery/task-status-canonical'
import { getSLOThreshold } from '@/lib/notion-metrics/cycle-time-slo-config'
import { isCtSloPctMetricEnabled } from '@/lib/ico-engine/cycle-time-flags'

const buildTaskStatusToCsc = (): Record<string, CscPhase> => {
  const map: Record<string, CscPhase> = {}

  for (const variant of allVariantsForGroup(TASK_STATUS_GROUPS.BRIEFING)) map[variant] = 'briefing'
  for (const variant of allVariantsForCanonical(TASK_STATUS_CANONICAL.EN_CURSO)) map[variant] = 'produccion'

  for (const variant of allVariantsForCanonical(TASK_STATUS_CANONICAL.LISTO_PARA_REVISION)) {
    map[variant] = 'revision_interna'
  }

  for (const variant of allVariantsForCanonical(TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS)) {
    map[variant] = 'cambios_cliente'
  }

  for (const variant of allVariantsForCanonical(TASK_STATUS_CANONICAL.APROBADO)) map[variant] = 'entrega'

  return map
}

export const TASK_STATUS_TO_CSC: Record<string, CscPhase> = buildTaskStatusToCsc()

// ─── Done / Excluded Status Sets ────────────────────────────────────────────
//
// Backward-compat exports kept for any external consumer. New code should
// consume `TASK_STATUS_GROUPS.*` + `taskStatusGroupSql` directly.

export const DONE_STATUSES = allVariantsForCanonical(TASK_STATUS_CANONICAL.APROBADO)
export const EXCLUDED_STATUSES = allVariantsForGroup(TASK_STATUS_GROUPS.EXCLUDED)
export const BLOCKED_STATUSES = allVariantsForGroup(TASK_STATUS_GROUPS.BLOCKED)

/**
 * TASK-908 Slice 6 — Fix B.1 canonical V1.
 *
 * Union canonical de `EXCLUDED` (Cancelado, Archivado) + `BLOCKED`
 * (Bloqueado, En pausa, legacy `Detenido`). Tareas en estos estados NO
 * cuentan en el denominador de OTD/RpA/FTR — son trabajo detenido o cerrado
 * que no representa pipeline activo evaluable.
 *
 * Contradicción canonical resuelta (per spec Delta 2026-05-17 sección B.1):
 * `BLOCKED_STATUSES` estaba declarado pero NO se excluía del denominator.
 * Resultado: tareas bloqueadas contaminaban OTD/RpA/FTR. Post-fix, métricas
 * suben ligeramente (efecto canonical esperado, NO bug).
 *
 * Cross-ref `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17
 * sección B.1 + `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md` regla A.4.
 */
export const EXCLUDED_FROM_METRICS_STATUSES = [
  ...EXCLUDED_STATUSES,
  ...BLOCKED_STATUSES
] as const

const DONE_STATUSES_SQL = taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)

/**
 * TASK-908 Slice 6 — SQL canonical para `EXCLUDED_FROM_METRICS_STATUSES`.
 * Incluye TODAS las variantes (canonical V1 + legacy aliases Efeonce/Sky)
 * vía `taskStatusGroupSql([...EXCLUDED, ...BLOCKED])`. Reemplaza el legacy
 * `EXCLUDED_STATUSES_SQL` (que solo cubría EXCLUDED, omitiendo BLOCKED).
 */
const EXCLUDED_FROM_METRICS_SQL = taskStatusGroupSql([
  ...TASK_STATUS_GROUPS.EXCLUDED,
  ...TASK_STATUS_GROUPS.BLOCKED
])

const CANONICAL_COMPLETED_TASK_SQL = `(
  completed_at IS NOT NULL
  AND task_status IN (${DONE_STATUSES_SQL})
)`

const CANONICAL_OPEN_TASK_SQL = `(
  completed_at IS NULL
  AND (task_status IS NULL OR task_status NOT IN (${EXCLUDED_FROM_METRICS_SQL}))
)`

const CANONICAL_ON_TIME_SQL = `(
  report_bucket = 'on_time'
  OR (performance_indicator_code = 'on_time' AND ${CANONICAL_COMPLETED_TASK_SQL})
)`

const CANONICAL_LATE_DROP_SQL = `(
  report_bucket = 'late_drop'
  OR (performance_indicator_code = 'late_drop' AND ${CANONICAL_COMPLETED_TASK_SQL})
)`

const CANONICAL_OVERDUE_SQL = `(
  report_bucket = 'overdue'
  OR (performance_indicator_code = 'overdue' AND ${CANONICAL_OPEN_TASK_SQL})
)`

const CANONICAL_FTR_ELIGIBLE_SQL = `(${CANONICAL_COMPLETED_TASK_SQL})`

const CANONICAL_FTR_PASSED_SQL = `(
  ${CANONICAL_COMPLETED_TASK_SQL}
  AND client_change_round_final = 0
)`

// ─── Stuck Threshold (hours without edit while in an active state) ──────────

export const STUCK_THRESHOLD_HOURS = 72

// ─── Metric Registry ────────────────────────────────────────────────────────

const BASE_ICO_METRIC_REGISTRY: MetricDefinition[] = [
  {
    id: 'rpa',
    code: 'rpa',
    label: 'Rendimiento por Activo',
    shortName: 'RpA',
    description: 'Promedio del score RPA en activos completados del período.',
    unit: 'score',
    granularities: ['monthly', 'weekly'],
    formula: { kind: 'average', sourceField: 'rpa_value' },
    thresholds: {
      optimal: { min: 0, max: 1.5 },
      attention: { min: 1.5, max: 2.5 },
      critical: { min: 2.5, max: 999 }
    },
    higherIsBetter: false,
    icon: 'tabler-chart-dots-3',
    color: 'primary',
    benchmark: {
      type: 'adapted',
      label: 'Benchmark creativo adaptado',
      source: 'Greenhouse ICO / TASK-215 runtime policy'
    },
    trust: {
      sampleBasis: 'rpa_policy',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'otd_pct',
    code: 'otd_pct',
    label: 'Entrega a tiempo',
    shortName: 'OTD%',
    description: 'Porcentaje de tareas del período clasificadas como On-Time dentro del scorecard mensual.',
    unit: '%',
    granularities: ['monthly', 'weekly'],
    formula: {
      kind: 'percentage',
      numeratorCondition: CANONICAL_ON_TIME_SQL,
      denominatorCondition: `(${CANONICAL_ON_TIME_SQL} OR ${CANONICAL_LATE_DROP_SQL} OR ${CANONICAL_OVERDUE_SQL})`
    },
    thresholds: {
      optimal: { min: 90, max: 100 },
      attention: { min: 70, max: 90 },
      critical: { min: 0, max: 70 }
    },
    higherIsBetter: true,
    icon: 'tabler-clock-check',
    color: 'success',
    benchmark: {
      type: 'external',
      label: 'Benchmark externo fuerte',
      source: 'Contrato ICO / benchmark delivery externo'
    },
    trust: {
      sampleBasis: 'delivery_classified_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'ftr_pct',
    code: 'ftr_pct',
    label: 'Primera entrega correcta',
    shortName: 'FTR%',
    description: 'Porcentaje de tareas completadas del período sin rondas finales de cambio del cliente.',
    unit: '%',
    granularities: ['monthly'],
    formula: {
      kind: 'percentage',
      numeratorCondition: CANONICAL_FTR_PASSED_SQL,
      denominatorCondition: CANONICAL_FTR_ELIGIBLE_SQL
    },
    thresholds: {
      optimal: { min: 80, max: 100 },
      attention: { min: 60, max: 80 },
      critical: { min: 0, max: 60 }
    },
    higherIsBetter: true,
    icon: 'tabler-target-arrow',
    color: 'success',
    benchmark: {
      type: 'analog',
      label: 'Benchmark por análogo',
      source: 'Contrato ICO / first-pass yield analog'
    },
    trust: {
      sampleBasis: 'completed_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'cycle_time',
    code: 'cycle_time',
    label: 'Tiempo de ciclo',
    shortName: 'Cycle Time',
    description: 'Promedio de días entre creación y entrega del activo.',
    unit: 'días',
    granularities: ['monthly', 'weekly'],
    formula: { kind: 'duration', sourceField: 'cycle_time_days', durationUnit: 'days' },
    thresholds: {
      optimal: { min: 0, max: 7 },
      attention: { min: 7, max: 14 },
      critical: { min: 14, max: 999 }
    },
    higherIsBetter: false,
    icon: 'tabler-hourglass',
    color: 'info',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'completed_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'cycle_time_variance',
    code: 'cycle_time_variance',
    label: 'Varianza del ciclo',
    shortName: 'Cycle Time Variance',
    description: 'Desviación estándar del tiempo de ciclo — mide la previsibilidad.',
    unit: 'días',
    granularities: ['monthly'],
    formula: { kind: 'duration', sourceField: 'cycle_time_days', durationUnit: 'days' },
    thresholds: {
      optimal: { min: 0, max: 3 },
      attention: { min: 3, max: 7 },
      critical: { min: 7, max: 999 }
    },
    higherIsBetter: false,
    icon: 'tabler-chart-candle',
    color: 'warning',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'completed_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'throughput',
    code: 'throughput',
    label: 'Throughput',
    shortName: 'Throughput',
    description: 'Cantidad de activos completados en el período.',
    unit: 'activos',
    granularities: ['monthly', 'weekly'],
    formula: { kind: 'count', numeratorCondition: `(${CANONICAL_ON_TIME_SQL} OR ${CANONICAL_LATE_DROP_SQL})` },
    thresholds: {
      optimal: { min: 20, max: 999 },
      attention: { min: 10, max: 20 },
      critical: { min: 0, max: 10 }
    },
    higherIsBetter: true,
    icon: 'tabler-rocket',
    color: 'primary',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'completed_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'pipeline_velocity',
    code: 'pipeline_velocity',
    label: 'Velocidad del pipeline',
    shortName: 'Pipeline Velocity',
    description: 'Ratio de activos completados sobre activos activos — velocidad de flujo.',
    unit: 'ratio',
    granularities: ['monthly', 'weekly'],
    formula: {
      kind: 'ratio',
      numeratorCondition: `(${CANONICAL_ON_TIME_SQL} OR ${CANONICAL_LATE_DROP_SQL})`,
      denominatorCondition: CANONICAL_OPEN_TASK_SQL
    },
    thresholds: {
      optimal: { min: 0.8, max: 999 },
      attention: { min: 0.4, max: 0.8 },
      critical: { min: 0, max: 0.4 }
    },
    higherIsBetter: true,
    icon: 'tabler-bolt',
    color: 'warning',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'active_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'csc_distribution',
    code: 'csc_distribution',
    label: 'Distribución CSC',
    shortName: 'CSC Distribution',
    description: 'Distribución de activos activos por fase de la Cadena de Suministro Creativo.',
    unit: 'distribución',
    granularities: ['monthly', 'weekly'],
    formula: {
      kind: 'distribution',
      buckets: CSC_PHASES
    },
    thresholds: {
      optimal: { min: 0, max: 100 },
      attention: { min: 0, max: 100 },
      critical: { min: 0, max: 100 }
    },
    higherIsBetter: true,
    icon: 'tabler-chart-pie',
    color: 'info',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'active_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'stuck_assets',
    code: 'stuck_assets',
    label: 'Activos estancados',
    shortName: 'Stuck Assets',
    description: `Activos sin movimiento en ${STUCK_THRESHOLD_HOURS}+ horas mientras están en estado activo.`,
    unit: 'activos',
    granularities: ['monthly', 'weekly'],
    formula: { kind: 'count', numeratorCondition: 'is_stuck = TRUE' },
    thresholds: {
      optimal: { min: 0, max: 2 },
      attention: { min: 2, max: 5 },
      critical: { min: 5, max: 999 }
    },
    higherIsBetter: false,
    icon: 'tabler-alert-triangle',
    color: 'error',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'active_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'stuck_asset_pct',
    code: 'stuck_asset_pct',
    label: 'Porcentaje estancado',
    shortName: 'Stuck %',
    description: 'Porcentaje de activos activos que están estancados.',
    unit: '%',
    granularities: ['monthly', 'weekly'],
    formula: {
      kind: 'percentage',
      numeratorCondition: 'is_stuck = TRUE',
      denominatorCondition: CANONICAL_OPEN_TASK_SQL
    },
    thresholds: {
      optimal: { min: 0, max: 10 },
      attention: { min: 10, max: 25 },
      critical: { min: 25, max: 100 }
    },
    higherIsBetter: false,
    icon: 'tabler-percentage',
    color: 'error',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'active_tasks',
      healthyMinSampleSize: 10
    }
  },
  {
    id: 'overdue_carried_forward',
    code: 'overdue_carried_forward',
    label: 'Overdue Carried Forward',
    shortName: 'OCF',
    description: 'Past-due tasks from prior periods still open at cutoff',
    unit: 'tasks',
    granularities: ['monthly'],
    formula: { kind: 'count' },
    thresholds: {
      optimal: { min: 0, max: 2 },
      attention: { min: 2, max: 5 },
      critical: { min: 5, max: 999 }
    },
    higherIsBetter: false,
    icon: 'tabler-clock-exclamation',
    color: 'error',
    benchmark: {
      type: 'internal',
      label: 'Policy interna',
      source: 'Greenhouse operating policy'
    },
    trust: {
      sampleBasis: 'active_tasks',
      healthyMinSampleSize: 10
    }
  }
]

/**
 * TASK-912 Slice 5 — `cycle_time_slo_pct`: % de tareas completadas con
 * `cycle_time_days <= threshold SLO` (default 14.2 días, Engine §A.5.5,
 * calibrable per tipo de pieza V2 vía `getSLOThreshold`).
 *
 * Gated por `CT_SLO_PCT_METRIC_ENABLED` (default OFF). Cuando OFF NO se incluye
 * en `ICO_METRIC_REGISTRY` → inerte (sin UI, sin compute, sin persist). Cuando
 * ON aparece. El threshold se interpola al build del registry (uniforme V1).
 */
export const CYCLE_TIME_SLO_PCT_METRIC: MetricDefinition = {
  id: 'cycle_time_slo_pct',
  code: 'cycle_time_slo_pct',
  label: '% dentro de SLO de ciclo',
  shortName: 'CT SLO%',
  description:
    'Porcentaje de tareas completadas del período con cycle_time_days dentro del SLO de industria (default 14.2 días).',
  unit: '%',
  granularities: ['monthly', 'weekly'],
  formula: {
    kind: 'percentage',
    numeratorCondition: `(${CANONICAL_COMPLETED_TASK_SQL} AND cycle_time_days IS NOT NULL AND cycle_time_days <= ${getSLOThreshold()})`,
    denominatorCondition: CANONICAL_COMPLETED_TASK_SQL
  },
  thresholds: {
    optimal: { min: 89, max: 100 },
    attention: { min: 75, max: 89 },
    critical: { min: 0, max: 75 }
  },
  higherIsBetter: true,
  icon: 'tabler-gauge',
  color: 'success',
  benchmark: {
    type: 'external',
    label: 'Benchmark industria LATAM',
    source: 'Greenhouse_ICO_Engine_v1.md §A.5.5'
  },
  trust: {
    sampleBasis: 'completed_tasks',
    healthyMinSampleSize: 10
  }
}

/**
 * Registry canónico. Incluye `cycle_time_slo_pct` solo cuando
 * `CT_SLO_PCT_METRIC_ENABLED` (default OFF → registry idéntico al pre-TASK-912).
 */
export const ICO_METRIC_REGISTRY: MetricDefinition[] = isCtSloPctMetricEnabled()
  ? [...BASE_ICO_METRIC_REGISTRY, CYCLE_TIME_SLO_PCT_METRIC]
  : BASE_ICO_METRIC_REGISTRY

// ─── Helpers ────────────────────────────────────────────────────────────────

export const getMetricById = (id: string): MetricDefinition | undefined =>
  ICO_METRIC_REGISTRY.find(m => m.id === id)

export const getThresholdZone = (metric: MetricDefinition, value: number): ThresholdZone => {
  const { thresholds, higherIsBetter } = metric

  if (higherIsBetter) {
    if (value >= thresholds.optimal.min) return 'optimal'
    if (value >= thresholds.attention.min) return 'attention'

    return 'critical'
  }

  if (value <= thresholds.optimal.max) return 'optimal'
  if (value <= thresholds.attention.max) return 'attention'

  return 'critical'
}

export const THRESHOLD_ZONE_COLOR: Record<ThresholdZone, 'success' | 'warning' | 'error'> = {
  optimal: 'success',
  attention: 'warning',
  critical: 'error'
}
