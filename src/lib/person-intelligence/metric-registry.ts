import type { MetricDefinition } from '@/lib/ico-engine/metric-registry'

/**
 * Person Intelligence Metric Registry
 *
 * 6 composite metrics that require cross-source data (ICO + capacity + compensation).
 * These extend the ICO metric system with person-scoped operational intelligence.
 */

export const PERSON_METRICS: MetricDefinition[] = [
  {
    id: 'utilization_pct',
    code: 'utilization_pct',
    label: 'Utilización',
    shortName: 'Utilization %',
    description: 'Porcentaje de capacidad productiva utilizada (active_tasks / expected_throughput)',
    unit: '%',
    granularities: ['monthly'],
    formula: { kind: 'composite' },
    thresholds: {
      optimal: { min: 35, max: 85 },
      attention: { min: 20, max: 100 },
      critical: { min: 0, max: 120 }
    },
    higherIsBetter: false, // sweet spot — neither too low nor too high
    icon: 'tabler-gauge',
    color: 'info',
    scopes: ['person'],
    compositeInputs: ['active_tasks', 'expected_throughput']
  },
  {
    id: 'allocation_variance',
    code: 'allocation_variance',
    label: 'Varianza de asignación',
    shortName: 'Allocation Variance',
    description: 'Desviación del FTE total asignado respecto a 1.0 FTE (ideal)',
    unit: 'FTE',
    granularities: ['monthly'],
    formula: { kind: 'composite' },
    thresholds: {
      optimal: { min: -0.05, max: 0.05 },
      attention: { min: -0.15, max: 0.15 },
      critical: { min: -1, max: 1 }
    },
    higherIsBetter: false, // closer to 0 is better
    icon: 'tabler-scale',
    color: 'warning',
    scopes: ['person'],
    compositeInputs: ['total_fte_allocation']
  },
  {
    id: 'cost_per_asset',
    code: 'cost_per_asset',
    label: 'Costo por activo',
    shortName: 'Cost / Asset',
    description: 'Compensación mensual total dividida por throughput de activos completados',
    unit: 'CLP/activo',
    granularities: ['monthly'],
    formula: { kind: 'composite' },
    thresholds: {
      optimal: { min: 0, max: 150000 },
      attention: { min: 150000, max: 300000 },
      critical: { min: 300000, max: 9999999 }
    },
    higherIsBetter: false,
    icon: 'tabler-coin',
    color: 'primary',
    scopes: ['person'],
    compositeInputs: ['monthly_total_comp', 'throughput_count']
  },
  {
    id: 'cost_per_hour',
    code: 'cost_per_hour',
    label: 'Costo por hora',
    shortName: 'Cost / Hour',
    description: 'Compensación mensual total dividida por horas contratadas',
    unit: 'CLP/hora',
    granularities: ['monthly'],
    formula: { kind: 'composite' },
    thresholds: {
      optimal: { min: 0, max: 15000 },
      attention: { min: 15000, max: 25000 },
      critical: { min: 25000, max: 999999 }
    },
    higherIsBetter: false,
    icon: 'tabler-clock-dollar',
    color: 'primary',
    scopes: ['person'],
    compositeInputs: ['monthly_total_comp', 'contracted_hours_month']
  },
  {
    id: 'quality_index',
    code: 'quality_index',
    label: 'Índice de calidad',
    shortName: 'Quality Index',
    description: 'Compuesto ponderado: (1/RPA_norm × 0.4) + (OTD% × 0.3) + (FTR% × 0.3)',
    unit: 'score 0-100',
    granularities: ['monthly'],
    formula: { kind: 'composite' },
    thresholds: {
      optimal: { min: 75, max: 100 },
      attention: { min: 50, max: 75 },
      critical: { min: 0, max: 50 }
    },
    higherIsBetter: true,
    icon: 'tabler-award',
    color: 'success',
    scopes: ['person'],
    compositeInputs: ['rpa_avg', 'otd_pct', 'ftr_pct']
  },
  {
    id: 'dedication_index',
    code: 'dedication_index',
    label: 'Índice de dedicación',
    shortName: 'Dedication Index',
    description: 'Utilización × (1 - |varianza de asignación|) — mide dedicación efectiva',
    unit: 'score 0-100',
    granularities: ['monthly'],
    formula: { kind: 'composite' },
    thresholds: {
      optimal: { min: 70, max: 100 },
      attention: { min: 40, max: 70 },
      critical: { min: 0, max: 40 }
    },
    higherIsBetter: true,
    icon: 'tabler-flame',
    color: 'warning',
    scopes: ['person'],
    compositeInputs: ['utilization_pct', 'allocation_variance']
  }
]

/** Get a person metric definition by ID */
export const getPersonMetricById = (id: string): MetricDefinition | undefined =>
  PERSON_METRICS.find(m => m.id === id)

/** All person metric IDs */
export const PERSON_METRIC_IDS = PERSON_METRICS.map(m => m.id)
