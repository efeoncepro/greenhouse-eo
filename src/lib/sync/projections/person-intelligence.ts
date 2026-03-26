import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  computeCapacityBreakdown,
  getExpectedMonthlyThroughput,
  getUtilizationPercent,
  getCapacityHealth
} from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'
import { computeDerivedMetrics } from '@/lib/person-intelligence/compute'
import { upsertPersonIntelligence } from '@/lib/person-intelligence/store'
import type { ProjectionDefinition } from '../projection-registry'

// ── Row types for source queries ──

interface IcoRow extends Record<string, unknown> {
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
}

interface AssignmentRow extends Record<string, unknown> {
  fte_allocation: string | number
  contracted_hours_month: number | null
}

interface CompRow extends Record<string, unknown> {
  version_id: string
  base_salary: string | number | null
  remote_allowance: string | number | null
  currency: string | null
}

interface MemberRow extends Record<string, unknown> {
  role_category: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v == null) return null

  const n = toNum(v)

  return n
}

// ── Refresh function ──

const refreshPersonIntelligence = async (
  scope: { entityType: string; entityId: string }
): Promise<string | null> => {
  const memberId = scope.entityId
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 1. Read ICO metrics from Postgres (already populated by BQ materialization)
  let ico: IcoRow | null = null

  try {
    const rows = await runGreenhousePostgresQuery<IcoRow>(
      `SELECT * FROM greenhouse_serving.ico_member_metrics
       WHERE member_id = $1 AND period_year = $2 AND period_month = $3`,
      [memberId, year, month]
    )

    ico = rows[0] ?? null
  } catch {
    // Table may not exist yet — continue with nulls
  }

  // 2. Read active assignments
  let assignments: AssignmentRow[] = []

  try {
    assignments = await runGreenhousePostgresQuery<AssignmentRow>(
      `SELECT fte_allocation, contracted_hours_month
       FROM greenhouse_core.client_team_assignments
       WHERE member_id = $1 AND active = TRUE`,
      [memberId]
    )
  } catch {
    // Non-blocking
  }

  const totalFte = assignments.reduce((s, a) => s + toNum(a.fte_allocation), 0)
  const totalContracted = assignments.reduce((s, a) => s + (a.contracted_hours_month ?? Math.round(toNum(a.fte_allocation) * 160)), 0)

  // 3. Read current compensation
  let comp: CompRow | null = null

  try {
    const compRows = await runGreenhousePostgresQuery<CompRow>(
      `SELECT version_id, base_salary, remote_allowance, currency
       FROM greenhouse_payroll.compensation_versions
       WHERE member_id = $1 AND effective_from <= CURRENT_DATE
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY effective_from DESC LIMIT 1`,
      [memberId]
    )

    comp = compRows[0] ?? null
  } catch {
    // Non-blocking
  }

  // 4. Read member role category
  let roleCategory: TeamRoleCategory = 'unknown'

  try {
    const memberRows = await runGreenhousePostgresQuery<MemberRow>(
      `SELECT role_category FROM greenhouse_core.members WHERE member_id = $1`,
      [memberId]
    )

    roleCategory = (memberRows[0]?.role_category as TeamRoleCategory) || 'unknown'
  } catch {
    // Non-blocking
  }

  // 5. Compute capacity
  const expectedThroughput = getExpectedMonthlyThroughput({ roleCategory, fteAllocation: totalFte })
  const activeTasks = toNum(ico?.active_tasks)
  const utilizationPct = expectedThroughput > 0
    ? getUtilizationPercent({ activeAssets: activeTasks, expectedMonthlyThroughput: expectedThroughput })
    : 0

  const capacity = computeCapacityBreakdown({
    fteAllocation: totalFte,
    contractedHoursMonth: totalContracted || null,
    utilizationPercent: utilizationPct
  })

  const capacityHealth = getCapacityHealth(utilizationPct)

  // 6. Compute derived metrics
  const monthlyBase = toNum(comp?.base_salary)
  const monthlyRemote = toNum(comp?.remote_allowance)
  const monthlyTotalComp = comp ? monthlyBase + monthlyRemote : null

  const derived = computeDerivedMetrics(
    {
      rpaAvg: toNullNum(ico?.rpa_avg),
      otdPct: toNullNum(ico?.otd_pct),
      ftrPct: toNullNum(ico?.ftr_pct),
      throughputCount: toNullNum(ico?.throughput_count),
      activeTasks: toNullNum(ico?.active_tasks)
    },
    {
      totalFte,
      contractedHoursMonth: totalContracted,
      roleCategory
    },
    { monthlyTotalComp }
  )

  // 7. Upsert
  await upsertPersonIntelligence({
    memberId,
    periodYear: year,
    periodMonth: month,

    // ICO delivery
    rpaAvg: toNullNum(ico?.rpa_avg),
    rpaMedian: toNullNum(ico?.rpa_median),
    otdPct: toNullNum(ico?.otd_pct),
    ftrPct: toNullNum(ico?.ftr_pct),
    cycleTimeAvgDays: toNullNum(ico?.cycle_time_avg_days),
    throughputCount: toNum(ico?.throughput_count),
    pipelineVelocity: toNullNum(ico?.pipeline_velocity),
    stuckAssetCount: toNum(ico?.stuck_asset_count),
    stuckAssetPct: toNullNum(ico?.stuck_asset_pct),
    totalTasks: toNum(ico?.total_tasks),
    completedTasks: toNum(ico?.completed_tasks),
    activeTasks: toNum(ico?.active_tasks),

    // Derived
    utilizationPct: derived.utilizationPct,
    allocationVariance: derived.allocationVariance,
    costPerAsset: derived.costPerAsset,
    costPerHour: derived.costPerHour,
    qualityIndex: derived.qualityIndex,
    dedicationIndex: derived.dedicationIndex,

    // Capacity
    roleCategory,
    totalFteAllocation: totalFte,
    contractedHoursMonth: capacity.contractedHoursMonth,
    assignedHoursMonth: capacity.assignedHoursMonth,
    usedHoursMonth: capacity.usedHoursMonth ?? 0,
    availableHoursMonth: capacity.availableHoursMonth,
    expectedThroughput,
    capacityHealth,
    overcommitted: capacity.overcommitted,
    activeAssignmentCount: assignments.length,

    // Cost
    compensationCurrency: comp?.currency as string | null ?? null,
    monthlyBaseSalary: comp ? monthlyBase : null,
    monthlyTotalComp,
    compensationVersionId: comp?.version_id as string | null ?? null
  })

  return `refreshed person_intelligence for ${memberId} (${year}-${String(month).padStart(2, '0')})`
}

// ── Projection definition ──

export const personIntelligenceProjection: ProjectionDefinition = {
  name: 'person_intelligence',
  description: 'Unified person operational intelligence: ICO delivery + capacity + cost + derived metrics',
  domain: 'people',

  triggerEvents: [
    'member.created',
    'member.updated',
    'assignment.created',
    'assignment.updated',
    'assignment.removed',
    'compensation.updated',
    'ico.materialization.completed'
  ],

  extractScope: (payload) => {
    const memberId = (payload.memberId ?? payload.member_id) as string | undefined

    return memberId ? { entityType: 'member', entityId: memberId } : null
  },

  refresh: async (scope, _payload) => refreshPersonIntelligence(scope),

  maxRetries: 2
}
