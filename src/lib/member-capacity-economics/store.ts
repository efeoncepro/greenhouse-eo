import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { toTimestampString } from '@/lib/finance/shared'

export interface MemberCapacityEconomicsSnapshot {
  memberId: string
  periodYear: number
  periodMonth: number
  contractedFte: number
  contractedHours: number
  assignedHours: number
  usageKind: string
  usedHours: number | null
  usagePercent: number | null
  commercialAvailabilityHours: number
  operationalAvailabilityHours: number | null
  sourceCurrency: string
  targetCurrency: string
  totalCompSource: number | null
  totalLaborCostTarget: number | null
  directOverheadTarget: number
  sharedOverheadTarget: number
  loadedCostTarget: number | null
  costPerHourTarget: number | null
  suggestedBillRateTarget: number | null
  fxRate: number | null
  fxRateDate: string | null
  fxProvider: string | null
  fxStrategy: string | null
  snapshotStatus: string
  sourceCompensationVersionId: string | null
  sourcePayrollPeriodId: string | null
  assignmentCount: number
  materializedAt: string | null
}

type MemberCapacityEconomicsRow = {
  member_id: string
  period_year: number | string
  period_month: number | string
  contracted_fte: number | string
  contracted_hours: number | string
  assigned_hours: number | string
  usage_kind: string
  used_hours: number | string | null
  usage_percent: number | string | null
  commercial_availability_hours: number | string
  operational_availability_hours: number | string | null
  source_currency: string
  target_currency: string
  total_comp_source: number | string | null
  total_labor_cost_target: number | string | null
  direct_overhead_target: number | string
  shared_overhead_target: number | string
  loaded_cost_target: number | string | null
  cost_per_hour_target: number | string | null
  suggested_bill_rate_target: number | string | null
  fx_rate: number | string | null
  fx_rate_date: string | Date | null
  fx_provider: string | null
  fx_strategy: string | null
  snapshot_status: string
  source_compensation_version_id: string | null
  source_payroll_period_id: string | null
  assignment_count: number | string
  materialized_at: string | Date | null
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

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

let ensureSchemaPromise: Promise<void> | null = null

export const ensureMemberCapacityEconomicsSchema = async () => {
  if (ensureSchemaPromise) return ensureSchemaPromise

  ensureSchemaPromise = runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_serving.member_capacity_economics (
      member_id TEXT NOT NULL,
      period_year INT NOT NULL,
      period_month INT NOT NULL,
      contracted_fte NUMERIC(5,3) NOT NULL DEFAULT 1,
      contracted_hours INT NOT NULL,
      assigned_hours INT NOT NULL DEFAULT 0,
      usage_kind TEXT NOT NULL DEFAULT 'missing',
      used_hours NUMERIC(10,2),
      usage_percent NUMERIC(5,2),
      commercial_availability_hours INT NOT NULL,
      operational_availability_hours NUMERIC(10,2),
      source_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL DEFAULT 'CLP',
      total_comp_source NUMERIC(14,2),
      total_labor_cost_target NUMERIC(14,2),
      direct_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      shared_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      loaded_cost_target NUMERIC(14,2),
      cost_per_hour_target NUMERIC(14,2),
      suggested_bill_rate_target NUMERIC(14,2),
      fx_rate NUMERIC(18,6),
      fx_rate_date DATE,
      fx_provider TEXT,
      fx_strategy TEXT,
      snapshot_status TEXT NOT NULL DEFAULT 'partial',
      source_compensation_version_id TEXT,
      source_payroll_period_id TEXT,
      assignment_count INT NOT NULL DEFAULT 0,
      materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (member_id, period_year, period_month)
    )
  `).then(() => {}).catch(error => {
    ensureSchemaPromise = null
    throw error
  })

  return ensureSchemaPromise
}

export const upsertMemberCapacityEconomicsSnapshot = async (snapshot: MemberCapacityEconomicsSnapshot) => {
  await ensureMemberCapacityEconomicsSchema()

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_serving.member_capacity_economics (
        member_id, period_year, period_month,
        contracted_fte, contracted_hours, assigned_hours,
        usage_kind, used_hours, usage_percent,
        commercial_availability_hours, operational_availability_hours,
        source_currency, target_currency,
        total_comp_source, total_labor_cost_target,
        direct_overhead_target, shared_overhead_target,
        loaded_cost_target, cost_per_hour_target, suggested_bill_rate_target,
        fx_rate, fx_rate_date, fx_provider, fx_strategy,
        snapshot_status, source_compensation_version_id, source_payroll_period_id,
        assignment_count, materialized_at
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7, $8, $9,
        $10, $11,
        $12, $13,
        $14, $15,
        $16, $17,
        $18, $19, $20,
        $21, $22::date, $23, $24,
        $25, $26, $27,
        $28, $29::timestamptz
      )
      ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
        contracted_fte = EXCLUDED.contracted_fte,
        contracted_hours = EXCLUDED.contracted_hours,
        assigned_hours = EXCLUDED.assigned_hours,
        usage_kind = EXCLUDED.usage_kind,
        used_hours = EXCLUDED.used_hours,
        usage_percent = EXCLUDED.usage_percent,
        commercial_availability_hours = EXCLUDED.commercial_availability_hours,
        operational_availability_hours = EXCLUDED.operational_availability_hours,
        source_currency = EXCLUDED.source_currency,
        target_currency = EXCLUDED.target_currency,
        total_comp_source = EXCLUDED.total_comp_source,
        total_labor_cost_target = EXCLUDED.total_labor_cost_target,
        direct_overhead_target = EXCLUDED.direct_overhead_target,
        shared_overhead_target = EXCLUDED.shared_overhead_target,
        loaded_cost_target = EXCLUDED.loaded_cost_target,
        cost_per_hour_target = EXCLUDED.cost_per_hour_target,
        suggested_bill_rate_target = EXCLUDED.suggested_bill_rate_target,
        fx_rate = EXCLUDED.fx_rate,
        fx_rate_date = EXCLUDED.fx_rate_date,
        fx_provider = EXCLUDED.fx_provider,
        fx_strategy = EXCLUDED.fx_strategy,
        snapshot_status = EXCLUDED.snapshot_status,
        source_compensation_version_id = EXCLUDED.source_compensation_version_id,
        source_payroll_period_id = EXCLUDED.source_payroll_period_id,
        assignment_count = EXCLUDED.assignment_count,
        materialized_at = EXCLUDED.materialized_at
    `,
    [
      snapshot.memberId,
      snapshot.periodYear,
      snapshot.periodMonth,
      snapshot.contractedFte,
      snapshot.contractedHours,
      snapshot.assignedHours,
      snapshot.usageKind,
      snapshot.usedHours,
      snapshot.usagePercent,
      snapshot.commercialAvailabilityHours,
      snapshot.operationalAvailabilityHours,
      snapshot.sourceCurrency,
      snapshot.targetCurrency,
      snapshot.totalCompSource,
      snapshot.totalLaborCostTarget,
      snapshot.directOverheadTarget,
      snapshot.sharedOverheadTarget,
      snapshot.loadedCostTarget,
      snapshot.costPerHourTarget,
      snapshot.suggestedBillRateTarget,
      snapshot.fxRate,
      snapshot.fxRateDate,
      snapshot.fxProvider,
      snapshot.fxStrategy,
      snapshot.snapshotStatus,
      snapshot.sourceCompensationVersionId,
      snapshot.sourcePayrollPeriodId,
      snapshot.assignmentCount,
      snapshot.materializedAt
    ]
  )
}

export const readMemberCapacityEconomicsSnapshot = async (
  memberId: string,
  year: number,
  month: number
): Promise<MemberCapacityEconomicsSnapshot | null> => {
  await ensureMemberCapacityEconomicsSchema()

  const rows = await runGreenhousePostgresQuery<MemberCapacityEconomicsRow>(
    `
      SELECT *
      FROM greenhouse_serving.member_capacity_economics
      WHERE member_id = $1 AND period_year = $2 AND period_month = $3
      LIMIT 1
    `,
    [memberId, year, month]
  )

  const row = rows[0]

  if (!row) return null

  return {
    memberId: row.member_id,
    periodYear: toNum(row.period_year),
    periodMonth: toNum(row.period_month),
    contractedFte: toNum(row.contracted_fte),
    contractedHours: toNum(row.contracted_hours),
    assignedHours: toNum(row.assigned_hours),
    usageKind: row.usage_kind,
    usedHours: toNullableNum(row.used_hours),
    usagePercent: toNullableNum(row.usage_percent),
    commercialAvailabilityHours: toNum(row.commercial_availability_hours),
    operationalAvailabilityHours: toNullableNum(row.operational_availability_hours),
    sourceCurrency: row.source_currency,
    targetCurrency: row.target_currency,
    totalCompSource: toNullableNum(row.total_comp_source),
    totalLaborCostTarget: toNullableNum(row.total_labor_cost_target),
    directOverheadTarget: toNum(row.direct_overhead_target),
    sharedOverheadTarget: toNum(row.shared_overhead_target),
    loadedCostTarget: toNullableNum(row.loaded_cost_target),
    costPerHourTarget: toNullableNum(row.cost_per_hour_target),
    suggestedBillRateTarget: toNullableNum(row.suggested_bill_rate_target),
    fxRate: toNullableNum(row.fx_rate),
    fxRateDate: toDateString(row.fx_rate_date),
    fxProvider: toNullableString(row.fx_provider),
    fxStrategy: toNullableString(row.fx_strategy),
    snapshotStatus: row.snapshot_status,
    sourceCompensationVersionId: row.source_compensation_version_id,
    sourcePayrollPeriodId: row.source_payroll_period_id,
    assignmentCount: toNum(row.assignment_count),
    materializedAt: toTimestampString(row.materialized_at)
  }
}

export const readLatestMemberCapacityEconomicsSnapshot = async (
  memberId: string
): Promise<MemberCapacityEconomicsSnapshot | null> => {
  await ensureMemberCapacityEconomicsSchema()

  const rows = await runGreenhousePostgresQuery<MemberCapacityEconomicsRow>(
    `
      SELECT *
      FROM greenhouse_serving.member_capacity_economics
      WHERE member_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `,
    [memberId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    memberId: row.member_id,
    periodYear: toNum(row.period_year),
    periodMonth: toNum(row.period_month),
    contractedFte: toNum(row.contracted_fte),
    contractedHours: toNum(row.contracted_hours),
    assignedHours: toNum(row.assigned_hours),
    usageKind: row.usage_kind,
    usedHours: toNullableNum(row.used_hours),
    usagePercent: toNullableNum(row.usage_percent),
    commercialAvailabilityHours: toNum(row.commercial_availability_hours),
    operationalAvailabilityHours: toNullableNum(row.operational_availability_hours),
    sourceCurrency: row.source_currency,
    targetCurrency: row.target_currency,
    totalCompSource: toNullableNum(row.total_comp_source),
    totalLaborCostTarget: toNullableNum(row.total_labor_cost_target),
    directOverheadTarget: toNum(row.direct_overhead_target),
    sharedOverheadTarget: toNum(row.shared_overhead_target),
    loadedCostTarget: toNullableNum(row.loaded_cost_target),
    costPerHourTarget: toNullableNum(row.cost_per_hour_target),
    suggestedBillRateTarget: toNullableNum(row.suggested_bill_rate_target),
    fxRate: toNullableNum(row.fx_rate),
    fxRateDate: toDateString(row.fx_rate_date),
    fxProvider: toNullableString(row.fx_provider),
    fxStrategy: toNullableString(row.fx_strategy),
    snapshotStatus: row.snapshot_status,
    sourceCompensationVersionId: row.source_compensation_version_id,
    sourcePayrollPeriodId: row.source_payroll_period_id,
    assignmentCount: toNum(row.assignment_count),
    materializedAt: toTimestampString(row.materialized_at)
  }
}

export const readMemberCapacityEconomicsTrend = async (
  memberId: string,
  months: number = 6
): Promise<MemberCapacityEconomicsSnapshot[]> => {
  await ensureMemberCapacityEconomicsSchema()

  const rows = await runGreenhousePostgresQuery<MemberCapacityEconomicsRow>(
    `
      SELECT *
      FROM greenhouse_serving.member_capacity_economics
      WHERE member_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT $2
    `,
    [memberId, Math.min(months, 24)]
  )

  return rows.map(row => ({
    memberId: row.member_id,
    periodYear: toNum(row.period_year),
    periodMonth: toNum(row.period_month),
    contractedFte: toNum(row.contracted_fte),
    contractedHours: toNum(row.contracted_hours),
    assignedHours: toNum(row.assigned_hours),
    usageKind: row.usage_kind,
    usedHours: toNullableNum(row.used_hours),
    usagePercent: toNullableNum(row.usage_percent),
    commercialAvailabilityHours: toNum(row.commercial_availability_hours),
    operationalAvailabilityHours: toNullableNum(row.operational_availability_hours),
    sourceCurrency: row.source_currency,
    targetCurrency: row.target_currency,
    totalCompSource: toNullableNum(row.total_comp_source),
    totalLaborCostTarget: toNullableNum(row.total_labor_cost_target),
    directOverheadTarget: toNum(row.direct_overhead_target),
    sharedOverheadTarget: toNum(row.shared_overhead_target),
    loadedCostTarget: toNullableNum(row.loaded_cost_target),
    costPerHourTarget: toNullableNum(row.cost_per_hour_target),
    suggestedBillRateTarget: toNullableNum(row.suggested_bill_rate_target),
    fxRate: toNullableNum(row.fx_rate),
    fxRateDate: toDateString(row.fx_rate_date),
    fxProvider: toNullableString(row.fx_provider),
    fxStrategy: toNullableString(row.fx_strategy),
    snapshotStatus: row.snapshot_status,
    sourceCompensationVersionId: row.source_compensation_version_id,
    sourcePayrollPeriodId: row.source_payroll_period_id,
    assignmentCount: toNum(row.assignment_count),
    materializedAt: toTimestampString(row.materialized_at)
  })).reverse()
}

export const readMemberCapacityEconomicsBatch = async ({
  memberIds,
  year,
  month
}: {
  memberIds: string[]
  year: number
  month: number
}): Promise<Map<string, MemberCapacityEconomicsSnapshot>> => {
  if (memberIds.length === 0) {
    return new Map()
  }

  await ensureMemberCapacityEconomicsSchema()

  const rows = await runGreenhousePostgresQuery<MemberCapacityEconomicsRow>(
    `
      SELECT *
      FROM greenhouse_serving.member_capacity_economics
      WHERE member_id = ANY($1::text[])
        AND period_year = $2
        AND period_month = $3
    `,
    [memberIds, year, month]
  )

  const snapshots = new Map<string, MemberCapacityEconomicsSnapshot>()

  for (const row of rows) {
    snapshots.set(row.member_id, {
      memberId: row.member_id,
      periodYear: toNum(row.period_year),
      periodMonth: toNum(row.period_month),
      contractedFte: toNum(row.contracted_fte),
      contractedHours: toNum(row.contracted_hours),
      assignedHours: toNum(row.assigned_hours),
      usageKind: row.usage_kind,
      usedHours: toNullableNum(row.used_hours),
      usagePercent: toNullableNum(row.usage_percent),
      commercialAvailabilityHours: toNum(row.commercial_availability_hours),
      operationalAvailabilityHours: toNullableNum(row.operational_availability_hours),
      sourceCurrency: row.source_currency,
      targetCurrency: row.target_currency,
      totalCompSource: toNullableNum(row.total_comp_source),
      totalLaborCostTarget: toNullableNum(row.total_labor_cost_target),
      directOverheadTarget: toNum(row.direct_overhead_target),
      sharedOverheadTarget: toNum(row.shared_overhead_target),
      loadedCostTarget: toNullableNum(row.loaded_cost_target),
      costPerHourTarget: toNullableNum(row.cost_per_hour_target),
      suggestedBillRateTarget: toNullableNum(row.suggested_bill_rate_target),
      fxRate: toNullableNum(row.fx_rate),
      fxRateDate: toDateString(row.fx_rate_date),
      fxProvider: toNullableString(row.fx_provider),
      fxStrategy: toNullableString(row.fx_strategy),
      snapshotStatus: row.snapshot_status,
      sourceCompensationVersionId: row.source_compensation_version_id,
      sourcePayrollPeriodId: row.source_payroll_period_id,
      assignmentCount: toNum(row.assignment_count),
      materializedAt: toTimestampString(row.materialized_at)
    })
  }

  return snapshots
}
