import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  getExpectedMonthlyThroughput,
  getCapacityHealth
} from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'
import { hoursToFte } from '@/lib/team-capacity/units'
import { readMemberCapacityEconomicsSnapshot } from '@/lib/member-capacity-economics/store'
import { computeDerivedMetrics } from '@/lib/person-intelligence/compute'
import { upsertPersonIntelligence } from '@/lib/person-intelligence/store'
import { refreshMemberCapacityEconomicsForMember } from './member-capacity-economics'
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

interface CompRow extends Record<string, unknown> {
  version_id: string
  base_salary: string | number | null
  remote_allowance: string | number | null
  currency: string | null
}

interface MemberRow extends Record<string, unknown> {
  role_category: string | null
}

type Period = {
  year: number
  month: number
}

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

  const n = toNum(v)

  return n
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const getCurrentPeriod = (): Period => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  return match
    ? { year: Number(match[1]), month: Number(match[2]) }
    : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
}

const parsePeriodId = (value: unknown): Period | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const parsePeriodFromDateLike = (value: unknown): Period | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

export const getPersonIntelligencePeriodFromPayload = (payload: Record<string, unknown>): Period | null => {
  const explicitYear = toNullNum(payload.periodYear) ?? toNullNum(payload.year)
  const explicitMonth = toNullNum(payload.periodMonth) ?? toNullNum(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  const fromPeriodId = parsePeriodId(payload.periodId) ?? parsePeriodId(payload.payrollPeriodId)

  if (fromPeriodId) {
    return fromPeriodId
  }

  return (
    parsePeriodFromDateLike(payload.effectiveFrom) ??
    parsePeriodFromDateLike(payload.effective_from) ??
    parsePeriodFromDateLike(payload.rateDate) ??
    parsePeriodFromDateLike(payload.rate_date) ??
    parsePeriodFromDateLike(payload.updatedAt) ??
    parsePeriodFromDateLike(payload.updated_at)
  )
}

const getPeriodEndDate = (period: Period) =>
  new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, 10)

const getPeriodOrCurrent = (payload: Record<string, unknown>): Period =>
  getPersonIntelligencePeriodFromPayload(payload) ?? getCurrentPeriod()

// ── Refresh function ──

const refreshPersonIntelligenceForMember = async (
  memberId: string,
  period: Period
): Promise<string | null> => {
  const { year, month } = period
  const periodEndDate = getPeriodEndDate(period)

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

  // 2. Read or refresh the canonical member capacity snapshot
  let memberCapacity = await readMemberCapacityEconomicsSnapshot(memberId, year, month).catch(() => null)

  if (!memberCapacity) {
    memberCapacity = await refreshMemberCapacityEconomicsForMember(memberId, { year, month }).catch(() => null)
  }

  // 3. Read current compensation
  let comp: CompRow | null = null

  try {
    const compRows = await runGreenhousePostgresQuery<CompRow>(
      `SELECT version_id, base_salary, remote_allowance, currency
       FROM greenhouse_payroll.compensation_versions
       WHERE member_id = $1
         AND effective_from <= $2::date
         AND (effective_to IS NULL OR effective_to >= $2::date)
       ORDER BY effective_from DESC LIMIT 1`,
      [memberId, periodEndDate]
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

  // 5. Compute capacity from the canonical snapshot
  const contractedHoursMonth = memberCapacity?.contractedHours ?? 0
  const assignedHoursMonth = memberCapacity?.assignedHours ?? 0
  const totalAssignedFte = hoursToFte(assignedHoursMonth)

  const expectedThroughput = getExpectedMonthlyThroughput({
    roleCategory,
    fteAllocation: totalAssignedFte > 0 ? totalAssignedFte : 1
  })

  const utilizationPct = memberCapacity?.usagePercent ?? null
  const capacityHealth = getCapacityHealth(utilizationPct ?? 0)

  // 6. Compute derived metrics
  const monthlyBase = toNum(comp?.base_salary)
  const monthlyRemote = toNum(comp?.remote_allowance)

  const monthlyTotalComp = comp
    ? monthlyBase + monthlyRemote
    : memberCapacity?.totalCompSource ?? null

  const derived = computeDerivedMetrics(
    {
      rpaAvg: toNullNum(ico?.rpa_avg),
      otdPct: toNullNum(ico?.otd_pct),
      ftrPct: toNullNum(ico?.ftr_pct),
      throughputCount: toNullNum(ico?.throughput_count),
      activeTasks: toNullNum(ico?.active_tasks)
    },
    {
      totalFte: totalAssignedFte,
      contractedHoursMonth,
      roleCategory
    },
    { monthlyTotalComp }
  )

  const throughputCount = toNullNum(ico?.throughput_count)
  const targetCostBasis = memberCapacity?.totalLaborCostTarget ?? null

  const costPerAsset = targetCostBasis != null && throughputCount != null && throughputCount > 0
    ? Math.round(targetCostBasis / throughputCount)
    : null

  const costPerHour = memberCapacity?.costPerHourTarget ?? null

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
    utilizationPct: utilizationPct ?? derived.utilizationPct,
    allocationVariance: derived.allocationVariance,
    costPerAsset,
    costPerHour,
    qualityIndex: derived.qualityIndex,
    dedicationIndex: derived.dedicationIndex,

    // Capacity
    roleCategory,
    totalFteAllocation: totalAssignedFte,
    contractedHoursMonth,
    assignedHoursMonth,
    usedHoursMonth: memberCapacity?.usedHours ?? null,
    availableHoursMonth: memberCapacity?.commercialAvailabilityHours ?? contractedHoursMonth,
    expectedThroughput,
    capacityHealth,
    overcommitted: assignedHoursMonth > contractedHoursMonth,
    activeAssignmentCount: memberCapacity?.assignmentCount ?? 0,

    // Cost
    compensationCurrency: comp?.currency as string | null ?? memberCapacity?.sourceCurrency ?? null,
    monthlyBaseSalary: comp ? monthlyBase : null,
    monthlyTotalComp,
    compensationVersionId: comp?.version_id as string | null ?? memberCapacity?.sourceCompensationVersionId ?? null
  })

  return `refreshed person_intelligence for ${memberId} (${year}-${String(month).padStart(2, '0')})`
}

const refreshAllMembersForPeriod = async (period: Period): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ member_id: string }>(
    `
      SELECT member_id
      FROM greenhouse_core.members
      WHERE active = TRUE
      ORDER BY member_id ASC
    `
  )

  let refreshed = 0

  for (const row of rows) {
    try {
      await refreshPersonIntelligenceForMember(row.member_id, period)
      refreshed++
    } catch {
      // Keep the batch moving; a single bad row should not block the full refresh.
    }
  }

  return refreshed
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
    'compensation_version.created',
    'compensation_version.updated',
    'payroll_period.created',
    'payroll_period.updated',
    'payroll_period.calculated',
    'payroll_period.approved',
    'payroll_period.exported',
    'payroll_entry.upserted',
    'finance.exchange_rate.upserted',
    'finance.overhead.updated',
    'finance.license_cost.updated',
    'finance.tooling_cost.updated',
    'ico.materialization.completed'
  ],

  extractScope: (payload) => {
    const memberId = (payload.memberId ?? payload.member_id) as string | undefined

    if (memberId) {
      return { entityType: 'member', entityId: memberId }
    }

    const period = getPersonIntelligencePeriodFromPayload(payload)

    return period ? { entityType: 'finance_period', entityId: `${period.year}-${pad2(period.month)}` } : null
  },

  refresh: async (scope, payload) => {
    const period = getPeriodOrCurrent(payload)

    if (scope.entityType === 'finance_period') {
      const refreshed = await refreshAllMembersForPeriod(period)

      return `refreshed person_intelligence for ${refreshed} members in ${scope.entityId}`
    }

    return refreshPersonIntelligenceForMember(scope.entityId, period)
  },

  maxRetries: 2
}
