// ─── Types ──────────────────────────────────────────────────────────────────

export type MetricGranularity = 'monthly' | 'weekly'
export type MetricKind = 'average' | 'percentage' | 'count' | 'duration' | 'distribution' | 'ratio' | 'composite'
export type MetricScope = 'space' | 'project' | 'member' | 'sprint' | 'person'
export type ThresholdZone = 'optimal' | 'attention' | 'critical'

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

export interface MetricDefinition {
  id: string
  code: string
  label: string
  description: string
  unit: string
  granularities: readonly MetricGranularity[]
  formula: FormulaConfig
  thresholds: MetricThreshold
  higherIsBetter: boolean
  icon: string
  color: 'success' | 'warning' | 'error' | 'primary' | 'info'

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

// ─── Task Status → CSC Phase Mapping ────────────────────────────────────────
// task_status values come from Notion (Spanish) but the column name is English.

export const TASK_STATUS_TO_CSC: Record<string, CscPhase> = {
  'Sin empezar': 'briefing',
  'Backlog': 'briefing',
  'Pendiente': 'briefing',
  'Listo para diseñar': 'briefing',
  'En curso': 'produccion',
  'En Curso': 'produccion',
  'Cambios Solicitados': 'cambios_cliente',
  'Listo': 'entrega',
  'Done': 'entrega',
  'Finalizado': 'entrega',
  'Completado': 'entrega'
}

// "Listo para revisión" uses a LIKE match in SQL — handled in the view, not here.

// ─── Done / Excluded Status Sets ────────────────────────────────────────────

export const DONE_STATUSES = ['Listo', 'Done', 'Finalizado', 'Completado', 'Aprobado'] as const
export const EXCLUDED_STATUSES = ['Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled', 'Archivado'] as const
export const BLOCKED_STATUSES = ['Bloqueado', 'Detenido'] as const

const DONE_STATUSES_SQL = DONE_STATUSES.map(status => `'${status}'`).join(',')
const EXCLUDED_STATUSES_SQL = EXCLUDED_STATUSES.map(status => `'${status}'`).join(',')

const CANONICAL_COMPLETED_TASK_SQL = `(
  completed_at IS NOT NULL
  AND task_status IN (${DONE_STATUSES_SQL})
)`

const CANONICAL_OPEN_TASK_SQL = `(
  completed_at IS NULL
  AND (task_status IS NULL OR task_status NOT IN (${EXCLUDED_STATUSES_SQL}))
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

export const ICO_METRIC_REGISTRY: MetricDefinition[] = [
  {
    id: 'rpa',
    code: 'rpa',
    label: 'Rendimiento por Activo',
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
    color: 'primary'
  },
  {
    id: 'otd_pct',
    code: 'otd_pct',
    label: 'Entrega a tiempo',
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
    color: 'success'
  },
  {
    id: 'ftr_pct',
    code: 'ftr_pct',
    label: 'Primera entrega correcta',
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
    color: 'success'
  },
  {
    id: 'cycle_time',
    code: 'cycle_time',
    label: 'Tiempo de ciclo',
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
    color: 'info'
  },
  {
    id: 'cycle_time_variance',
    code: 'cycle_time_variance',
    label: 'Varianza del ciclo',
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
    color: 'warning'
  },
  {
    id: 'throughput',
    code: 'throughput',
    label: 'Throughput',
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
    color: 'primary'
  },
  {
    id: 'pipeline_velocity',
    code: 'pipeline_velocity',
    label: 'Velocidad del pipeline',
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
    color: 'warning'
  },
  {
    id: 'csc_distribution',
    code: 'csc_distribution',
    label: 'Distribución CSC',
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
    color: 'info'
  },
  {
    id: 'stuck_assets',
    code: 'stuck_assets',
    label: 'Activos estancados',
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
    color: 'error'
  },
  {
    id: 'stuck_asset_pct',
    code: 'stuck_asset_pct',
    label: 'Porcentaje estancado',
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
    color: 'error'
  },
  {
    id: 'overdue_carried_forward',
    code: 'overdue_carried_forward',
    label: 'Overdue Carried Forward',
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
    color: 'error'
  }
]

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
