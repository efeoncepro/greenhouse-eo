import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getThresholdZone } from '@/lib/ico-engine/metric-registry'
import { getPersonMetricById } from './metric-registry'
import type {
  PersonOperational360Row,
  PersonIntelligenceSnapshot,
  MetricValue,
  CapacityContext,
  CostContext
} from './types'

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v == null) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : null
  }

  return null
}

const ENGINE_VERSION = 'v2.0.0-person-intelligence'

// ── ICO metric IDs for delivery metrics ──

const ICO_METRIC_MAP: Array<{ id: string; field: keyof PersonOperational360Row; higherIsBetter: boolean }> = [
  { id: 'rpa', field: 'rpa_avg', higherIsBetter: false },
  { id: 'otd_pct', field: 'otd_pct', higherIsBetter: true },
  { id: 'ftr_pct', field: 'ftr_pct', higherIsBetter: true },
  { id: 'cycle_time', field: 'cycle_time_avg_days', higherIsBetter: false },
  { id: 'throughput', field: 'throughput_count', higherIsBetter: true },
  { id: 'pipeline_velocity', field: 'pipeline_velocity', higherIsBetter: true },
  { id: 'stuck_assets', field: 'stuck_asset_count', higherIsBetter: false }
]

const DERIVED_FIELDS: Array<{ id: string; field: keyof PersonOperational360Row }> = [
  { id: 'utilization_pct', field: 'utilization_pct' },
  { id: 'allocation_variance', field: 'allocation_variance' },
  { id: 'cost_per_asset', field: 'cost_per_asset' },
  { id: 'cost_per_hour', field: 'cost_per_hour' },
  { id: 'quality_index', field: 'quality_index' },
  { id: 'dedication_index', field: 'dedication_index' }
]

// ── Row → Snapshot normalizer ──

const buildMetricValue = (metricId: string, value: number | null): MetricValue => {
  const zone = value != null
    ? (() => {
        const def = getPersonMetricById(metricId)

        if (def) return getThresholdZone(def, value)

        // Fallback for ICO metrics — import from ICO registry would create circular dep
        return null
      })()
    : null

  return { metricId, value, zone }
}

const rowToSnapshot = (row: PersonOperational360Row): PersonIntelligenceSnapshot => {
  const deliveryMetrics: MetricValue[] = ICO_METRIC_MAP.map(m => ({
    metricId: m.id,
    value: toNullNum(row[m.field]),
    zone: null // ICO zones computed by ICO registry — skip here to avoid circular
  }))

  const derivedMetrics: MetricValue[] = DERIVED_FIELDS.map(m => {
    const value = toNullNum(row[m.field])

    return buildMetricValue(m.id, value)
  })

  const capacity: CapacityContext = {
    contractedHoursMonth: toNum(row.contracted_hours_month),
    assignedHoursMonth: toNum(row.assigned_hours_month),
    usedHoursMonth: toNullNum(row.used_hours_month),
    availableHoursMonth: toNum(row.available_hours_month),
    overcommitted: row.overcommitted === true,
    roleCategory: row.role_category,
    totalFteAllocation: toNum(row.total_fte_allocation),
    expectedThroughput: toNum(row.expected_throughput),
    capacityHealth: row.capacity_health ?? 'idle',
    activeAssignmentCount: toNum(row.active_assignment_count),
    usageKind: toNullNum(row.used_hours_month) !== null ? 'hours' : toNullNum(row.utilization_pct) !== null ? 'percent' : 'none',
    usagePercent: toNullNum(row.utilization_pct),
    commercialAvailabilityHours: toNum(row.available_hours_month),
    operationalAvailabilityHours: toNullNum(row.used_hours_month) !== null
      ? Math.max(0, toNum(row.contracted_hours_month) - toNum(row.used_hours_month))
      : null
  }

  const cost: CostContext = {
    currency: row.compensation_currency,
    monthlyBaseSalary: toNullNum(row.monthly_base_salary),
    monthlyTotalComp: toNullNum(row.monthly_total_comp),
    compensationVersionId: row.compensation_version_id as string | null,
    targetCurrency: 'CLP',
    costPerHourTarget: toNullNum(row.cost_per_hour)
  }

  // Overall health: based on quality index + capacity health
  const qi = toNullNum(row.quality_index)
  const ch = row.capacity_health

  let health: 'green' | 'yellow' | 'red' = 'green'

  if (qi != null && qi < 50) health = 'red'
  else if (qi != null && qi < 75) health = 'yellow'
  else if (ch === 'overloaded') health = 'red'
  else if (ch === 'high') health = 'yellow'

  return {
    memberId: row.member_id,
    period: { year: toNum(row.period_year), month: toNum(row.period_month) },
    deliveryMetrics,
    derivedMetrics,
    capacity,
    cost,
    health,
    materializedAt: row.materialized_at as string | null,
    engineVersion: (row.engine_version as string) ?? ENGINE_VERSION,
    source: (row.source as string) ?? 'person_intelligence'
  }
}

// ── Schema provisioning ──

let ensureSchemaPromise: Promise<void> | null = null

export const ensurePersonIntelligenceSchema = (): Promise<void> => {
  if (ensureSchemaPromise) return ensureSchemaPromise

  ensureSchemaPromise = runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_serving.person_operational_360 (
      member_id TEXT NOT NULL,
      period_year INT NOT NULL,
      period_month INT NOT NULL,
      rpa_avg NUMERIC(6,2), rpa_median NUMERIC(6,2),
      otd_pct NUMERIC(5,2), ftr_pct NUMERIC(5,2),
      cycle_time_avg_days NUMERIC(6,2), cycle_time_p50_days NUMERIC(6,2), cycle_time_variance NUMERIC(6,2),
      throughput_count INT, pipeline_velocity NUMERIC(5,3),
      stuck_asset_count INT DEFAULT 0, stuck_asset_pct NUMERIC(5,2),
      total_tasks INT DEFAULT 0, completed_tasks INT DEFAULT 0, active_tasks INT DEFAULT 0,
      utilization_pct NUMERIC(5,2), allocation_variance NUMERIC(5,3),
      cost_per_asset NUMERIC(14,2), cost_per_hour NUMERIC(14,2),
      quality_index NUMERIC(5,2), dedication_index NUMERIC(5,2),
      role_category TEXT, total_fte_allocation NUMERIC(5,3),
      contracted_hours_month INT, assigned_hours_month INT,
      used_hours_month INT, available_hours_month INT,
      expected_throughput NUMERIC(6,1), capacity_health TEXT,
      overcommitted BOOLEAN DEFAULT FALSE, active_assignment_count INT DEFAULT 0,
      compensation_currency TEXT, monthly_base_salary NUMERIC(14,2),
      monthly_total_comp NUMERIC(14,2), compensation_version_id TEXT,
      source TEXT NOT NULL DEFAULT 'person_intelligence',
      engine_version TEXT,
      materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (member_id, period_year, period_month)
    )
  `).then(() => {}).catch(err => {
    ensureSchemaPromise = null
    throw err
  })

  return ensureSchemaPromise
}

// ── Read functions ──

export const readPersonIntelligence = async (
  memberId: string,
  year: number,
  month: number
): Promise<PersonIntelligenceSnapshot | null> => {
  await ensurePersonIntelligenceSchema()

  const rows = await runGreenhousePostgresQuery<PersonOperational360Row>(
    `SELECT * FROM greenhouse_serving.person_operational_360
     WHERE member_id = $1 AND period_year = $2 AND period_month = $3`,
    [memberId, year, month]
  )

  return rows.length > 0 ? rowToSnapshot(rows[0]) : null
}

export const readPersonIntelligenceTrend = async (
  memberId: string,
  months: number = 6
): Promise<PersonIntelligenceSnapshot[]> => {
  await ensurePersonIntelligenceSchema()

  const rows = await runGreenhousePostgresQuery<PersonOperational360Row>(
    `SELECT * FROM greenhouse_serving.person_operational_360
     WHERE member_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT $2`,
    [memberId, Math.min(months, 24)]
  )

  return rows.map(rowToSnapshot).reverse()
}

export const readPersonIntelligenceBatch = async (
  memberIds: string[],
  year: number,
  month: number
): Promise<Map<string, PersonIntelligenceSnapshot>> => {
  if (memberIds.length === 0) return new Map()

  await ensurePersonIntelligenceSchema()

  const rows = await runGreenhousePostgresQuery<PersonOperational360Row>(
    `SELECT * FROM greenhouse_serving.person_operational_360
     WHERE member_id = ANY($1) AND period_year = $2 AND period_month = $3`,
    [memberIds, year, month]
  )

  const result = new Map<string, PersonIntelligenceSnapshot>()

  for (const row of rows) {
    result.set(row.member_id, rowToSnapshot(row))
  }

  return result
}

// ── Write functions ──

export interface PersonIntelligenceUpsertInput {
  memberId: string
  periodYear: number
  periodMonth: number

  // ICO
  rpaAvg: number | null
  rpaMedian: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  throughputCount: number | null
  pipelineVelocity: number | null
  stuckAssetCount: number
  stuckAssetPct: number | null
  totalTasks: number
  completedTasks: number
  activeTasks: number

  // Derived
  utilizationPct: number | null
  allocationVariance: number | null
  costPerAsset: number | null
  costPerHour: number | null
  qualityIndex: number | null
  dedicationIndex: number | null

  // Capacity
  roleCategory: string | null
  totalFteAllocation: number
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number | null
  availableHoursMonth: number
  expectedThroughput: number
  capacityHealth: string
  overcommitted: boolean
  activeAssignmentCount: number

  // Cost
  compensationCurrency: string | null
  monthlyBaseSalary: number | null
  monthlyTotalComp: number | null
  compensationVersionId: string | null
}

export const upsertPersonIntelligence = async (input: PersonIntelligenceUpsertInput): Promise<void> => {
  await ensurePersonIntelligenceSchema()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_serving.person_operational_360 (
      member_id, period_year, period_month,
      rpa_avg, rpa_median, otd_pct, ftr_pct,
      cycle_time_avg_days, throughput_count, pipeline_velocity,
      stuck_asset_count, stuck_asset_pct, total_tasks, completed_tasks, active_tasks,
      utilization_pct, allocation_variance, cost_per_asset, cost_per_hour,
      quality_index, dedication_index,
      role_category, total_fte_allocation,
      contracted_hours_month, assigned_hours_month, used_hours_month, available_hours_month,
      expected_throughput, capacity_health, overcommitted, active_assignment_count,
      compensation_currency, monthly_base_salary, monthly_total_comp, compensation_version_id,
      source, engine_version, materialized_at
    ) VALUES (
      $1, $2, $3,
      $4, $5, $6, $7,
      $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19,
      $20, $21,
      $22, $23,
      $24, $25, $26, $27,
      $28, $29, $30, $31,
      $32, $33, $34, $35,
      'person_intelligence', $36, NOW()
    )
    ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
      rpa_avg = EXCLUDED.rpa_avg, rpa_median = EXCLUDED.rpa_median,
      otd_pct = EXCLUDED.otd_pct, ftr_pct = EXCLUDED.ftr_pct,
      cycle_time_avg_days = EXCLUDED.cycle_time_avg_days,
      throughput_count = EXCLUDED.throughput_count, pipeline_velocity = EXCLUDED.pipeline_velocity,
      stuck_asset_count = EXCLUDED.stuck_asset_count, stuck_asset_pct = EXCLUDED.stuck_asset_pct,
      total_tasks = EXCLUDED.total_tasks, completed_tasks = EXCLUDED.completed_tasks, active_tasks = EXCLUDED.active_tasks,
      utilization_pct = EXCLUDED.utilization_pct, allocation_variance = EXCLUDED.allocation_variance,
      cost_per_asset = EXCLUDED.cost_per_asset, cost_per_hour = EXCLUDED.cost_per_hour,
      quality_index = EXCLUDED.quality_index, dedication_index = EXCLUDED.dedication_index,
      role_category = EXCLUDED.role_category, total_fte_allocation = EXCLUDED.total_fte_allocation,
      contracted_hours_month = EXCLUDED.contracted_hours_month, assigned_hours_month = EXCLUDED.assigned_hours_month,
      used_hours_month = EXCLUDED.used_hours_month, available_hours_month = EXCLUDED.available_hours_month,
      expected_throughput = EXCLUDED.expected_throughput, capacity_health = EXCLUDED.capacity_health,
      overcommitted = EXCLUDED.overcommitted, active_assignment_count = EXCLUDED.active_assignment_count,
      compensation_currency = EXCLUDED.compensation_currency, monthly_base_salary = EXCLUDED.monthly_base_salary,
      monthly_total_comp = EXCLUDED.monthly_total_comp, compensation_version_id = EXCLUDED.compensation_version_id,
      source = EXCLUDED.source, engine_version = EXCLUDED.engine_version, materialized_at = NOW()`,
    [
      input.memberId, input.periodYear, input.periodMonth,
      input.rpaAvg, input.rpaMedian, input.otdPct, input.ftrPct,
      input.cycleTimeAvgDays, input.throughputCount, input.pipelineVelocity,
      input.stuckAssetCount, input.stuckAssetPct, input.totalTasks, input.completedTasks, input.activeTasks,
      input.utilizationPct, input.allocationVariance, input.costPerAsset, input.costPerHour,
      input.qualityIndex, input.dedicationIndex,
      input.roleCategory, input.totalFteAllocation,
      input.contractedHoursMonth, input.assignedHoursMonth, input.usedHoursMonth, input.availableHoursMonth,
      input.expectedThroughput, input.capacityHealth, input.overcommitted, input.activeAssignmentCount,
      input.compensationCurrency, input.monthlyBaseSalary, input.monthlyTotalComp, input.compensationVersionId,
      ENGINE_VERSION
    ]
  )
}
