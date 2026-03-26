import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  CAPACITY_HOURS_PER_FTE,
  getExpectedMonthlyThroughput,
  getUtilizationPercent
} from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'
import type { CompensationBreakdown, FxContext } from '@/lib/team-capacity/economics'
import { buildLaborEconomicsSnapshot } from '@/lib/team-capacity/economics'
import {
  allocateSharedOverheadTarget,
  buildMemberOverheadSnapshot,
  type SharedOverheadPool
} from '@/lib/team-capacity/overhead'
import {
  getBasePricingPolicy,
  getLoadedCostPerHour,
  getSuggestedBillRate
} from '@/lib/team-capacity/pricing'
import { buildCapacityEnvelope, fteToHours } from '@/lib/team-capacity/units'
import {
  ensureMemberCapacityEconomicsSchema,
  upsertMemberCapacityEconomicsSnapshot,
  type MemberCapacityEconomicsSnapshot
} from '@/lib/member-capacity-economics/store'

const TARGET_CURRENCY = 'CLP'

type MemberRow = {
  member_id: string
  display_name: string | null
  role_category: string | null
  role_title: string | null
  active: boolean | null
}

type AssignmentRow = {
  assignment_id: string
  client_id: string | null
  client_name: string | null
  fte_allocation: number | string | null
  hours_per_month: number | string | null
  start_date: string | Date | null
  end_date: string | Date | null
  active: boolean | null
}

type CompensationRow = {
  version_id: string
  currency: string | null
  base_salary: number | string | null
  remote_allowance: number | string | null
  bonus_otd_min: number | string | null
  bonus_otd_max: number | string | null
  bonus_rpa_min: number | string | null
  bonus_rpa_max: number | string | null
  effective_from: string | Date | null
  effective_to: string | Date | null
}

type PayrollEntryRow = {
  entry_id: string
  period_id: string
  compensation_version_id: string
  currency: string | null
  gross_total: number | string | null
}

type IcoMemberMetricsRow = {
  active_tasks: number | string | null
  completed_tasks: number | string | null
  throughput_count: number | string | null
  total_tasks: number | string | null
}

type ExchangeRateRow = {
  rate_id: string
  rate: number | string | null
  rate_date: string | Date | null
  source: string | null
}

type SharedOverheadPoolRow = {
  expense_count: number | string
  total_shared_overhead_target: number | string | null
  active_member_count: number | string
}

type Period = {
  year: number
  month: number
}

type MemberCapacityEconomicsInputs = {
  member: MemberRow
  period: Period
  assignments: AssignmentRow[]
  compensation: CompensationRow | null
  payrollEntry: PayrollEntryRow | null
  icoMetrics: IcoMemberMetricsRow | null
  exchangeRate: ExchangeRateRow | null
  sharedOverheadPool: SharedOverheadPool | null
  sharedOverheadTotalWeight: number
}

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNum = (value: unknown): number | null => {
  if (value == null) return null

  const parsed = toNum(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const getPeriodStartDate = ({ year, month }: Period) => `${year}-${pad2(month)}-01`

const getPeriodEndDate = ({ year, month }: Period) => {
  const end = new Date(Date.UTC(year, month, 0))

  return end.toISOString().slice(0, 10)
}

const getLastBusinessDay = (period: Period) => {
  const end = new Date(`${getPeriodEndDate(period)}T00:00:00Z`)

  while (end.getUTCDay() === 0 || end.getUTCDay() === 6) {
    end.setUTCDate(end.getUTCDate() - 1)
  }

  return end.toISOString().slice(0, 10)
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

export const getMemberCapacityEconomicsPeriodFromPayload = (payload: Record<string, unknown>): Period | null => {
  const explicitYear = toNullableNum(payload.periodYear) ?? toNullableNum(payload.year)
  const explicitMonth = toNullableNum(payload.periodMonth) ?? toNullableNum(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  const fromPeriodId = parsePeriodId(payload.periodId) ?? parsePeriodId(payload.payrollPeriodId)

  if (fromPeriodId) return fromPeriodId

  const fromDate =
    parsePeriodFromDateLike(payload.effectiveFrom) ??
    parsePeriodFromDateLike(payload.effective_from) ??
    parsePeriodFromDateLike(payload.rateDate) ??
    parsePeriodFromDateLike(payload.rate_date) ??
    parsePeriodFromDateLike(payload.startDate) ??
    parsePeriodFromDateLike(payload.start_date) ??
    parsePeriodFromDateLike(payload.updatedAt) ??
    parsePeriodFromDateLike(payload.updated_at)

  if (fromDate) return fromDate

  return null
}

export const getMemberCapacityEconomicsScopeFromPayload = (
  payload: Record<string, unknown>
): { entityType: string; entityId: string } | null => {
  const memberId = typeof payload.memberId === 'string'
    ? payload.memberId
    : typeof payload.member_id === 'string'
      ? payload.member_id
      : null

  if (memberId) {
    return { entityType: 'member', entityId: memberId }
  }

  const period = getMemberCapacityEconomicsPeriodFromPayload(payload)

  if (period) {
    return { entityType: 'finance_period', entityId: `${period.year}-${pad2(period.month)}` }
  }

  return null
}

const isInternalAssignment = (row: AssignmentRow) => {
  const clientId = String(row.client_id || '').trim().toLowerCase()
  const clientName = String(row.client_name || '').trim().toLowerCase()

  return (
    clientId === 'efeonce_internal' ||
    clientId === 'client_internal' ||
    clientId === 'space-efeonce' ||
    clientName === 'efeonce internal' ||
    clientName === 'efeonce'
  )
}

const inferRoleCategory = (roleTitle: string | null): TeamRoleCategory => {
  if (!roleTitle) return 'unknown'

  const lower = roleTitle.toLowerCase()

  if (lower.includes('account') || lower.includes('ejecutiv')) return 'account'
  if (lower.includes('operation') || lower.includes('project') || lower.includes('tráfico')) return 'operations'
  if (lower.includes('strate') || lower.includes('plan')) return 'strategy'
  if (lower.includes('diseñ') || lower.includes('design') || lower.includes('art')) return 'design'
  if (lower.includes('develop') || lower.includes('dev') || lower.includes('front') || lower.includes('back')) return 'development'
  if (lower.includes('media') || lower.includes('pauta') || lower.includes('social')) return 'media'

  return 'unknown'
}

const getRoleCategory = (member: MemberRow) =>
  (member.role_category as TeamRoleCategory | null) || inferRoleCategory(member.role_title)

const getAssignedHours = (assignments: AssignmentRow[]) =>
  assignments.reduce((sum, row) => {
    const hours = row.hours_per_month == null
      ? Math.round(toNum(row.fte_allocation) * CAPACITY_HOURS_PER_FTE)
      : Math.round(toNum(row.hours_per_month))

    return sum + Math.max(0, hours)
  }, 0)

const getUsageContext = (member: MemberRow, icoMetrics: IcoMemberMetricsRow | null) => {
  if (!icoMetrics) {
    return {
      usageKind: 'none',
      usedHours: null as number | null,
      usagePercent: null as number | null,
      snapshotStatus: 'partial' as const
    }
  }

  const roleCategory = getRoleCategory(member)
  const activityCount = Math.max(
    toNum(icoMetrics.throughput_count),
    toNum(icoMetrics.completed_tasks),
    toNum(icoMetrics.active_tasks),
    toNum(icoMetrics.total_tasks)
  )
  const expectedThroughput = getExpectedMonthlyThroughput({ roleCategory, fteAllocation: 1 })
  const usagePercent = expectedThroughput > 0
    ? getUtilizationPercent({ activeAssets: activityCount, expectedMonthlyThroughput: expectedThroughput })
    : null

  return {
    usageKind: 'percent',
    usedHours: null as number | null,
    usagePercent,
    snapshotStatus: 'partial' as const
  }
}

const getExchangeRateContext = (
  period: Period,
  sourceCurrency: string,
  targetCurrency: string,
  exchangeRate: ExchangeRateRow | null
) => {
  if (sourceCurrency === targetCurrency) {
    return {
      fxRate: 1,
      fxRateDate: getLastBusinessDay(period),
      fxProvider: 'identity',
      fxStrategy: 'same_currency'
    }
  }

  if (!exchangeRate) {
    return {
      fxRate: null as number | null,
      fxRateDate: null as string | null,
      fxProvider: null as string | null,
      fxStrategy: 'period_last_business_day'
    }
  }

  return {
    fxRate: toNullableNum(exchangeRate.rate),
    fxRateDate: toDateString(exchangeRate.rate_date),
    fxProvider: exchangeRate.source ? exchangeRate.source : 'manual',
    fxStrategy: 'period_last_business_day'
  }
}

const buildSharedOverheadPool = (
  period: Period,
  row: SharedOverheadPoolRow | null
): { pool: SharedOverheadPool | null; totalWeight: number } => {
  if (!row) {
    return { pool: null, totalWeight: 0 }
  }

  const totalSharedOverheadTarget = toNullableNum(row.total_shared_overhead_target)
  const activeMemberCount = Math.max(0, Math.round(toNum(row.active_member_count)))
  const totalWeight = activeMemberCount * CAPACITY_HOURS_PER_FTE

  if (totalSharedOverheadTarget === null || activeMemberCount <= 0 || totalWeight <= 0) {
    return { pool: null, totalWeight: 0 }
  }

  return {
    pool: {
      periodYear: period.year,
      periodMonth: period.month,
      targetCurrency: TARGET_CURRENCY as 'CLP' | 'USD',
      totalSharedOverheadTarget,
      allocationMethod: 'contracted_hours'
    },
    totalWeight
  }
}

export const buildMemberCapacityEconomicsSnapshot = ({
  member,
  period,
  assignments,
  compensation,
  payrollEntry,
  icoMetrics,
  exchangeRate,
  sharedOverheadPool,
  sharedOverheadTotalWeight
}: MemberCapacityEconomicsInputs): MemberCapacityEconomicsSnapshot => {
  const activeAssignments = assignments.filter(row => row.active !== false && !isInternalAssignment(row))
  const contractedFte = 1
  const contractedHours = fteToHours(contractedFte)
  const assignedHours = getAssignedHours(activeAssignments)
  const usageContext = getUsageContext(member, icoMetrics)
  const envelope = buildCapacityEnvelope({
    contractedFte,
    assignedHours,
    usedHours: usageContext.usedHours
  })

  const sourceCurrency = payrollEntry?.currency || compensation?.currency || TARGET_CURRENCY
  const sourceCompensationVersionId = payrollEntry?.compensation_version_id || compensation?.version_id || null
  const sourcePayrollPeriodId = payrollEntry?.period_id || null
  const compensationBreakdown: CompensationBreakdown | null = payrollEntry?.gross_total != null
    ? {
        sourceCurrency: sourceCurrency as 'CLP' | 'USD',
        baseSalarySource: toNum(payrollEntry.gross_total),
        fixedBonusesSource: 0,
        variableBonusesSource: 0,
        employerCostsSource: 0
      }
    : compensation
      ? {
          sourceCurrency: sourceCurrency as 'CLP' | 'USD',
          baseSalarySource: toNum(compensation.base_salary),
          fixedBonusesSource: toNum(compensation.remote_allowance),
          variableBonusesSource:
            toNum(compensation.bonus_otd_min) +
            toNum(compensation.bonus_otd_max) +
            toNum(compensation.bonus_rpa_min) +
            toNum(compensation.bonus_rpa_max),
          employerCostsSource: 0
        }
      : null

  const fxContext = getExchangeRateContext(period, sourceCurrency, TARGET_CURRENCY, exchangeRate)
  const normalizedFx: FxContext | null =
    sourceCurrency === TARGET_CURRENCY
      ? null
      : fxContext.fxRate != null && fxContext.fxRateDate
        ? {
            sourceCurrency: sourceCurrency as 'CLP' | 'USD',
            targetCurrency: TARGET_CURRENCY as 'CLP' | 'USD',
            rate: fxContext.fxRate,
            rateDate: fxContext.fxRateDate,
            provider: fxContext.fxProvider || 'manual',
            strategy: 'period_last_business_day'
          }
        : null

  const laborSnapshot = buildLaborEconomicsSnapshot({
    compensation: compensationBreakdown,
    contractedHours,
    targetCurrency: TARGET_CURRENCY as 'CLP' | 'USD',
    fx: normalizedFx
  })
  const sharedOverheadTarget = allocateSharedOverheadTarget({
    pool: sharedOverheadPool,
    memberWeight: contractedHours,
    totalWeight: sharedOverheadTotalWeight
  })
  const overheadSnapshot = buildMemberOverheadSnapshot({
    directOverheadTarget: 0,
    sharedOverheadTarget,
    contractedHours
  })
  const loadedCostPerHourTarget = getLoadedCostPerHour({
    laborCostPerHourTarget: laborSnapshot.costPerHourTarget,
    overheadPerHourTarget: overheadSnapshot.overheadPerHourTarget
  })
  const pricingSnapshot = getSuggestedBillRate({
    loadedCostPerHourTarget,
    pricingPolicy: getBasePricingPolicy({
      roleCategory: getRoleCategory(member),
      targetCurrency: TARGET_CURRENCY as 'CLP' | 'USD'
    }),
    targetCurrency: TARGET_CURRENCY as 'CLP' | 'USD'
  })
  const loadedCostTarget =
    laborSnapshot.totalLaborCostTarget == null || overheadSnapshot.totalOverheadTarget == null
      ? laborSnapshot.totalLaborCostTarget
      : Math.round((laborSnapshot.totalLaborCostTarget + overheadSnapshot.totalOverheadTarget) * 100) / 100

  const snapshotStatus =
    laborSnapshot.snapshotStatus === 'complete' &&
    usageContext.usageKind !== 'none' &&
    overheadSnapshot.snapshotStatus === 'complete'
      ? 'complete'
      : 'partial'

  return {
    memberId: member.member_id,
    periodYear: period.year,
    periodMonth: period.month,
    contractedFte,
    contractedHours,
    assignedHours,
    usageKind: usageContext.usageKind,
    usedHours: usageContext.usedHours,
    usagePercent: usageContext.usagePercent,
    commercialAvailabilityHours: envelope.commercialAvailabilityHours,
    operationalAvailabilityHours: envelope.operationalAvailabilityHours,
    sourceCurrency,
    targetCurrency: TARGET_CURRENCY,
    totalCompSource: laborSnapshot.totalCompensationSource,
    totalLaborCostTarget: laborSnapshot.totalLaborCostTarget,
    directOverheadTarget: overheadSnapshot.directOverheadTarget ?? 0,
    sharedOverheadTarget: overheadSnapshot.sharedOverheadTarget ?? 0,
    loadedCostTarget,
    costPerHourTarget: laborSnapshot.costPerHourTarget,
    suggestedBillRateTarget: pricingSnapshot.suggestedBillRateTarget,
    fxRate: fxContext.fxRate,
    fxRateDate: fxContext.fxRateDate,
    fxProvider: fxContext.fxProvider,
    fxStrategy: fxContext.fxStrategy,
    snapshotStatus,
    sourceCompensationVersionId,
    sourcePayrollPeriodId,
    assignmentCount: activeAssignments.length,
    materializedAt: new Date().toISOString()
  }
}

const getCurrentMonthInSantiago = (): Period => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (!match) {
    const now = new Date()

    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  return { year: Number(match[1]), month: Number(match[2]) }
}

const getPeriodOrCurrent = (payload: Record<string, unknown>) =>
  getMemberCapacityEconomicsPeriodFromPayload(payload) || getCurrentMonthInSantiago()

const loadMemberCapacityEconomicsSources = async (memberId: string, period: Period): Promise<MemberCapacityEconomicsInputs> => {
  const periodStart = getPeriodStartDate(period)
  const periodEnd = getPeriodEndDate(period)
  const payrollPeriodId = `${period.year}-${pad2(period.month)}`

  const [member] = await runGreenhousePostgresQuery<MemberRow>(
    `
      SELECT member_id, display_name, role_category, role_title, active
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  if (!member) {
    throw new Error(`Member ${memberId} not found`)
  }

  const assignments = await runGreenhousePostgresQuery<AssignmentRow>(
    `
      SELECT assignment_id, client_id, client_name, fte_allocation, hours_per_month, start_date, end_date, active
      FROM greenhouse_core.client_team_assignments
      WHERE member_id = $1
        AND active = TRUE
        AND start_date <= $2::date
        AND (end_date IS NULL OR end_date >= $3::date)
      ORDER BY client_name ASC, assignment_id ASC
    `,
    [memberId, periodEnd, periodStart]
  )

  const [payrollEntry] = await runGreenhousePostgresQuery<PayrollEntryRow>(
    `
      SELECT entry_id, period_id, compensation_version_id, currency, gross_total
      FROM greenhouse_payroll.payroll_entries
      WHERE member_id = $1 AND period_id = $2
      LIMIT 1
    `,
    [memberId, payrollPeriodId]
  )

  const [compensation] = await runGreenhousePostgresQuery<CompensationRow>(
    `
      SELECT
        version_id, currency, base_salary, remote_allowance,
        bonus_otd_min, bonus_otd_max, bonus_rpa_min, bonus_rpa_max,
        effective_from, effective_to
      FROM greenhouse_payroll.compensation_versions
      WHERE member_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to >= $3::date)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    [memberId, periodEnd, periodStart]
  )

  const [icoMetrics] = await runGreenhousePostgresQuery<IcoMemberMetricsRow>(
    `
      SELECT active_tasks, completed_tasks, throughput_count, total_tasks
      FROM greenhouse_serving.ico_member_metrics
      WHERE member_id = $1 AND period_year = $2 AND period_month = $3
      LIMIT 1
    `,
    [memberId, period.year, period.month]
  )

  const exchangeRateNeeded =
    (payrollEntry?.currency || compensation?.currency || TARGET_CURRENCY) !== TARGET_CURRENCY

  const [exchangeRate] = exchangeRateNeeded
    ? await runGreenhousePostgresQuery<ExchangeRateRow>(
        `
          SELECT rate_id, rate, rate_date, source
          FROM greenhouse_finance.exchange_rates
          WHERE from_currency = $1
            AND to_currency = $2
            AND rate_date <= $3::date
          ORDER BY rate_date DESC
          LIMIT 1
        `,
        [payrollEntry?.currency || compensation?.currency || TARGET_CURRENCY, TARGET_CURRENCY, getLastBusinessDay(period)]
      )
    : [null]

  const [sharedOverheadPoolRow] = await runGreenhousePostgresQuery<SharedOverheadPoolRow>(
    `
      SELECT
        COUNT(*)::int AS expense_count,
        COALESCE(SUM(total_amount_clp), 0) AS total_shared_overhead_target,
        (
          SELECT COUNT(*)::int
          FROM greenhouse_core.members
          WHERE active = TRUE
        ) AS active_member_count
      FROM greenhouse_finance.expenses
      WHERE allocated_client_id IS NULL
        AND COALESCE(cost_is_direct, FALSE) = FALSE
        AND cost_category IN ('operational', 'infrastructure', 'tax_social')
        AND COALESCE(document_date, payment_date) >= $1::date
        AND COALESCE(document_date, payment_date) <= $2::date
    `,
    [periodStart, periodEnd]
  )

  const sharedOverheadContext = buildSharedOverheadPool(period, sharedOverheadPoolRow || null)

  return {
    member,
    period,
    assignments,
    compensation: compensation || null,
    payrollEntry: payrollEntry || null,
    icoMetrics: icoMetrics || null,
    exchangeRate: exchangeRate || null,
    sharedOverheadPool: sharedOverheadContext.pool,
    sharedOverheadTotalWeight: sharedOverheadContext.totalWeight
  }
}

export const refreshMemberCapacityEconomicsForMember = async (
  memberId: string,
  period: Period
): Promise<MemberCapacityEconomicsSnapshot | null> => {
  const sources = await loadMemberCapacityEconomicsSources(memberId, period)
  const snapshot = buildMemberCapacityEconomicsSnapshot(sources)

  await upsertMemberCapacityEconomicsSnapshot(snapshot)

  return snapshot
}

const refreshAllMembersForPeriod = async (period: Period): Promise<number> => {
  const members = await runGreenhousePostgresQuery<{ member_id: string }>(
    `
      SELECT member_id
      FROM greenhouse_core.members
      WHERE active = TRUE
      ORDER BY member_id ASC
    `
  )

  let refreshed = 0

  for (const row of members) {
    try {
      await refreshMemberCapacityEconomicsForMember(row.member_id, period)
      refreshed++
    } catch {
      // Keep the batch moving; a single bad row should not block the full refresh.
    }
  }

  return refreshed
}

export const memberCapacityEconomicsProjection: ProjectionDefinition = {
  name: 'member_capacity_economics',
  description: 'Materialize member capacity economics snapshots per member and period',
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
    'payroll_entry.upserted',
    'finance.expense.created',
    'finance.expense.updated',
    'finance.exchange_rate.upserted',
    'finance.overhead.updated',
    'finance.license_cost.updated',
    'finance.tooling_cost.updated'
  ],

  extractScope: (payload) => getMemberCapacityEconomicsScopeFromPayload(payload),

  refresh: async (scope, payload) => {
    await ensureMemberCapacityEconomicsSchema()

    const period = getPeriodOrCurrent(payload)

    if (scope.entityType === 'finance_period') {
      const refreshed = await refreshAllMembersForPeriod(period)

      return `refreshed member_capacity_economics for ${refreshed} members in ${scope.entityId}`
    }

    const snapshot = await refreshMemberCapacityEconomicsForMember(scope.entityId, period)

    return snapshot
      ? `refreshed member_capacity_economics for ${scope.entityId} (${snapshot.periodYear}-${pad2(snapshot.periodMonth)})`
      : null
  },

  maxRetries: 2
}
