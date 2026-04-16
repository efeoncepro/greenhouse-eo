import type { ThresholdZone } from '@/lib/ico-engine/metric-registry'
import type { MemberNexaInsightsPayload } from '@/lib/ico-engine/ai/llm-types'
import type { CapacityBreakdown } from '@/lib/team-capacity/shared'

// ── Metric value with zone ──

export interface MetricValue {
  metricId: string
  value: number | null
  zone: ThresholdZone | null
}

// ── Derived metrics (computed from cross-source data) ──

export interface DerivedMetrics {
  utilizationPct: number | null
  allocationVariance: number | null
  costPerAsset: number | null
  costPerHour: number | null
  qualityIndex: number | null
  dedicationIndex: number | null
}

// ── Cost context ──

export interface CostContext {
  currency: string | null
  monthlyBaseSalary: number | null
  monthlyTotalComp: number | null
  compensationVersionId: string | null
  targetCurrency?: string | null
  loadedCostTarget?: number | null
  costPerHourTarget?: number | null
  suggestedBillRateTarget?: number | null
}

// ── Capacity context ──

export interface CapacityContext extends CapacityBreakdown {
  roleCategory: string | null
  totalFteAllocation: number
  expectedThroughput: number
  capacityHealth: string
  activeAssignmentCount: number
  usageKind?: string
  usagePercent?: number | null
  commercialAvailabilityHours?: number
  operationalAvailabilityHours?: number | null
}

// ── Full intelligence snapshot (one period) ──

export interface PersonIntelligenceSnapshot {
  memberId: string
  period: { year: number; month: number }

  // ICO delivery metrics (9)
  deliveryMetrics: MetricValue[]

  // Derived person metrics (6)
  derivedMetrics: MetricValue[]

  // Capacity breakdown
  capacity: CapacityContext

  // Cost context
  cost: CostContext

  // Overall health
  health: 'green' | 'yellow' | 'red'

  // Metadata
  materializedAt: string | null
  engineVersion: string
  source: string
}

// ── API response ──

export interface PersonIntelligenceResponse {
  memberId: string
  current: PersonIntelligenceSnapshot | null
  trend: PersonIntelligenceSnapshot[]
  nexaInsights: MemberNexaInsightsPayload | null
  meta: {
    source: string
    materializedAt: string | null
    engineVersion: string
  }
}

// ── Raw row from person_operational_360 table ──

export interface PersonOperational360Row extends Record<string, unknown> {
  member_id: string
  period_year: number
  period_month: number

  // ICO delivery
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  cycle_time_avg_days: string | number | null
  throughput_count: string | number | null
  pipeline_velocity: string | number | null
  stuck_asset_count: string | number | null
  stuck_asset_pct: string | number | null
  total_tasks: string | number | null
  completed_tasks: string | number | null
  active_tasks: string | number | null

  // Derived
  utilization_pct: string | number | null
  allocation_variance: string | number | null
  cost_per_asset: string | number | null
  cost_per_hour: string | number | null
  quality_index: string | number | null
  dedication_index: string | number | null

  // Capacity
  role_category: string | null
  total_fte_allocation: string | number | null
  contracted_hours_month: string | number | null
  assigned_hours_month: string | number | null
  used_hours_month: string | number | null
  available_hours_month: string | number | null
  expected_throughput: string | number | null
  capacity_health: string | null
  overcommitted: boolean | null
  active_assignment_count: string | number | null

  // Cost
  compensation_currency: string | null
  monthly_base_salary: string | number | null
  monthly_total_comp: string | number | null
  compensation_version_id: string | null

  // Metadata
  source: string | null
  engine_version: string | null
  materialized_at: string | null
}
