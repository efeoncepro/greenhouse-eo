import 'server-only'

import { sql } from 'kysely'

import { getLastBusinessDayOfMonth } from '@/lib/calendar/operational-calendar'
import { getDb } from '@/lib/db'

type ConfidenceLabel = 'high' | 'medium' | 'low'
type SnapshotStatus = 'complete' | 'partial' | 'unresolved'
type SourceKind = 'catalog_seed' | 'admin_manual' | 'payroll_bridge' | 'modeled_formula' | 'backfill'

export interface RoleModeledCostBasisSnapshot {
  snapshotId: string
  snapshotKey: string
  roleId: string
  roleSku: string
  roleCode: string
  roleLabel: string
  employmentTypeCode: string
  periodYear: number
  periodMonth: number
  periodId: string
  snapshotDate: string
  sourceCostComponentEffectiveFrom: string
  sourceKind: SourceKind
  sourceRef: string | null
  resolvedCurrency: string
  baseLaborCostAmount: number
  directOverheadPct: number
  sharedOverheadPct: number
  directOverheadAmount: number
  sharedOverheadAmount: number
  loadedCostAmount: number
  costPerHourAmount: number | null
  hoursPerFteMonth: number
  confidenceScore: number
  confidenceLabel: ConfidenceLabel
  snapshotStatus: SnapshotStatus
  detail: Record<string, unknown>
  materializedAt: string
  createdAt: string
  updatedAt: string
}

type SnapshotRow = {
  snapshot_id: string
  snapshot_key: string
  role_id: string
  role_sku: string
  role_code: string
  role_label: string
  employment_type_code: string
  period_year: number | string
  period_month: number | string
  period_id: string
  snapshot_date: string | Date
  source_cost_component_effective_from: string | Date
  source_kind: SourceKind
  source_ref: string | null
  resolved_currency: string
  base_labor_cost_amount: number | string | null
  direct_overhead_pct: number | string | null
  shared_overhead_pct: number | string | null
  direct_overhead_amount: number | string | null
  shared_overhead_amount: number | string | null
  loaded_cost_amount: number | string | null
  cost_per_hour_amount: number | string | null
  hours_per_fte_month: number | string | null
  confidence_score: number | string | null
  confidence_label: ConfidenceLabel
  snapshot_status: SnapshotStatus
  detail_jsonb: Record<string, unknown> | null
  materialized_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

type LiveAssumptionRow = {
  role_id: string
  role_sku: string
  role_code: string
  role_label_es: string
  employment_type_code: string
  effective_from: string | Date
  source_kind: SourceKind
  source_ref: string | null
  total_monthly_cost_usd: number | string | null
  direct_overhead_pct: number | string | null
  shared_overhead_pct: number | string | null
  direct_overhead_amount_usd: number | string | null
  shared_overhead_amount_usd: number | string | null
  loaded_monthly_cost_usd: number | string | null
  loaded_hourly_cost_usd: number | string | null
  hours_per_fte_month: number | string | null
  confidence_score: number | string | null
  confidence_label: ConfidenceLabel
  base_salary_usd: number | string | null
  bonus_jit_usd: number | string | null
  bonus_rpa_usd: number | string | null
  bonus_ar_usd: number | string | null
  bonus_sobrecumplimiento_usd: number | string | null
  gastos_previsionales_usd: number | string | null
  fee_deel_usd: number | string | null
  fee_eor_usd: number | string | null
  payment_currency: string
  country_code: string
  applies_previsional: boolean
  source_of_truth: string
  compatibility_is_default: boolean | null
  compatibility_allowed: boolean | null
  created_at: string | Date
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => (value == null ? null : toNumber(value))

const toDateString = (value: string | Date | null) => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toTimestampString = (value: string | Date | null) => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return value
}

const mapSnapshotRow = (row: SnapshotRow): RoleModeledCostBasisSnapshot => ({
  snapshotId: row.snapshot_id,
  snapshotKey: row.snapshot_key,
  roleId: row.role_id,
  roleSku: row.role_sku,
  roleCode: row.role_code,
  roleLabel: row.role_label,
  employmentTypeCode: row.employment_type_code,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  periodId: row.period_id,
  snapshotDate: toDateString(row.snapshot_date),
  sourceCostComponentEffectiveFrom: toDateString(row.source_cost_component_effective_from),
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  resolvedCurrency: row.resolved_currency,
  baseLaborCostAmount: toNumber(row.base_labor_cost_amount),
  directOverheadPct: toNumber(row.direct_overhead_pct),
  sharedOverheadPct: toNumber(row.shared_overhead_pct),
  directOverheadAmount: toNumber(row.direct_overhead_amount),
  sharedOverheadAmount: toNumber(row.shared_overhead_amount),
  loadedCostAmount: toNumber(row.loaded_cost_amount),
  costPerHourAmount: toNullableNumber(row.cost_per_hour_amount),
  hoursPerFteMonth: toNumber(row.hours_per_fte_month),
  confidenceScore: toNumber(row.confidence_score),
  confidenceLabel: row.confidence_label,
  snapshotStatus: row.snapshot_status,
  detail: row.detail_jsonb ?? {},
  materializedAt: toTimestampString(row.materialized_at),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const buildPeriodId = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

const buildSnapshotKey = (roleId: string, employmentTypeCode: string, periodId: string) =>
  `role_modeled:${roleId}:${employmentTypeCode}:${periodId}`

const resolveConfidenceLabel = (score: number): ConfidenceLabel => {
  if (score >= 0.85) return 'high'
  if (score >= 0.6) return 'medium'

  return 'low'
}

const buildDetail = (row: LiveAssumptionRow) => ({
  baseSalaryUsd: toNumber(row.base_salary_usd),
  bonusJitUsd: toNumber(row.bonus_jit_usd),
  bonusRpaUsd: toNumber(row.bonus_rpa_usd),
  bonusArUsd: toNumber(row.bonus_ar_usd),
  bonusSobrecumplimientoUsd: toNumber(row.bonus_sobrecumplimiento_usd),
  gastosPrevisionalesUsd: toNumber(row.gastos_previsionales_usd),
  feeDeelUsd: toNumber(row.fee_deel_usd),
  feeEorUsd: toNumber(row.fee_eor_usd),
  countryCode: row.country_code,
  paymentCurrency: row.payment_currency,
  appliesPrevisional: row.applies_previsional,
  employmentTypeSourceOfTruth: row.source_of_truth,
  compatibilityIsDefault: row.compatibility_is_default ?? false,
  compatibilityAllowed: row.compatibility_allowed ?? true
})

const loadEffectiveAssumptions = async (asOfDate: string): Promise<LiveAssumptionRow[]> => {
  const db = await getDb()

  const result = await sql<LiveAssumptionRow>`
    WITH ranked AS (
      SELECT
        srcc.role_id,
        sr.role_sku,
        sr.role_code,
        sr.role_label_es,
        srcc.employment_type_code,
        srcc.effective_from,
        srcc.source_kind,
        srcc.source_ref,
        srcc.total_monthly_cost_usd,
        srcc.direct_overhead_pct,
        srcc.shared_overhead_pct,
        srcc.direct_overhead_amount_usd,
        srcc.shared_overhead_amount_usd,
        srcc.loaded_monthly_cost_usd,
        srcc.loaded_hourly_cost_usd,
        srcc.hours_per_fte_month,
        srcc.confidence_score,
        srcc.confidence_label,
        srcc.base_salary_usd,
        srcc.bonus_jit_usd,
        srcc.bonus_rpa_usd,
        srcc.bonus_ar_usd,
        srcc.bonus_sobrecumplimiento_usd,
        srcc.gastos_previsionales_usd,
        srcc.fee_deel_usd,
        srcc.fee_eor_usd,
        et.payment_currency,
        et.country_code,
        et.applies_previsional,
        et.source_of_truth,
        rec.is_default AS compatibility_is_default,
        rec.allowed AS compatibility_allowed,
        srcc.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY srcc.role_id, srcc.employment_type_code
          ORDER BY srcc.effective_from DESC, srcc.created_at DESC
        ) AS rank_index
      FROM greenhouse_commercial.sellable_role_cost_components srcc
      INNER JOIN greenhouse_commercial.sellable_roles sr
        ON sr.role_id = srcc.role_id
      INNER JOIN greenhouse_commercial.employment_types et
        ON et.employment_type_code = srcc.employment_type_code
      LEFT JOIN greenhouse_commercial.role_employment_compatibility rec
        ON rec.role_id = srcc.role_id
       AND rec.employment_type_code = srcc.employment_type_code
      WHERE sr.active = TRUE
        AND et.active = TRUE
        AND srcc.effective_from <= ${asOfDate}::date
        AND COALESCE(rec.allowed, TRUE) = TRUE
    )
    SELECT *
    FROM ranked
    WHERE rank_index = 1
    ORDER BY role_sku ASC, employment_type_code ASC
  `.execute(db)

  return result.rows
}

export const materializeRoleModeledCostBasisSnapshotsForPeriod = async (
  year: number,
  month: number
): Promise<RoleModeledCostBasisSnapshot[]> => {
  const db = await getDb()
  const periodId = buildPeriodId(year, month)
  const snapshotDate = getLastBusinessDayOfMonth(year, month)
  const assumptionRows = await loadEffectiveAssumptions(snapshotDate)

  for (const row of assumptionRows) {
    const sourceRef =
      row.source_ref ??
      `sellable_role_cost_components:${row.role_id}:${row.employment_type_code}:${toDateString(row.effective_from)}`

    await sql`
      INSERT INTO greenhouse_commercial.role_modeled_cost_basis_snapshots (
        snapshot_key,
        role_id,
        role_sku,
        role_code,
        role_label,
        employment_type_code,
        period_year,
        period_month,
        period_id,
        snapshot_date,
        source_cost_component_effective_from,
        source_kind,
        source_ref,
        resolved_currency,
        base_labor_cost_amount,
        direct_overhead_pct,
        shared_overhead_pct,
        direct_overhead_amount,
        shared_overhead_amount,
        loaded_cost_amount,
        cost_per_hour_amount,
        hours_per_fte_month,
        confidence_score,
        confidence_label,
        snapshot_status,
        detail_jsonb,
        materialized_at,
        updated_at
      ) VALUES (
        ${buildSnapshotKey(row.role_id, row.employment_type_code, periodId)},
        ${row.role_id},
        ${row.role_sku},
        ${row.role_code},
        ${row.role_label_es},
        ${row.employment_type_code},
        ${year},
        ${month},
        ${periodId},
        ${snapshotDate}::date,
        ${toDateString(row.effective_from)}::date,
        ${row.source_kind},
        ${sourceRef},
        'USD',
        ${toNumber(row.total_monthly_cost_usd)},
        ${toNumber(row.direct_overhead_pct)},
        ${toNumber(row.shared_overhead_pct)},
        ${toNumber(row.direct_overhead_amount_usd)},
        ${toNumber(row.shared_overhead_amount_usd)},
        ${toNumber(row.loaded_monthly_cost_usd)},
        ${toNullableNumber(row.loaded_hourly_cost_usd)},
        ${toNumber(row.hours_per_fte_month)},
        ${toNumber(row.confidence_score)},
        ${resolveConfidenceLabel(toNumber(row.confidence_score))},
        'complete',
        ${JSON.stringify(buildDetail(row))}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (role_id, employment_type_code, period_year, period_month)
      DO UPDATE SET
        role_sku = EXCLUDED.role_sku,
        role_code = EXCLUDED.role_code,
        role_label = EXCLUDED.role_label,
        snapshot_key = EXCLUDED.snapshot_key,
        snapshot_date = EXCLUDED.snapshot_date,
        source_cost_component_effective_from = EXCLUDED.source_cost_component_effective_from,
        source_kind = EXCLUDED.source_kind,
        source_ref = EXCLUDED.source_ref,
        resolved_currency = EXCLUDED.resolved_currency,
        base_labor_cost_amount = EXCLUDED.base_labor_cost_amount,
        direct_overhead_pct = EXCLUDED.direct_overhead_pct,
        shared_overhead_pct = EXCLUDED.shared_overhead_pct,
        direct_overhead_amount = EXCLUDED.direct_overhead_amount,
        shared_overhead_amount = EXCLUDED.shared_overhead_amount,
        loaded_cost_amount = EXCLUDED.loaded_cost_amount,
        cost_per_hour_amount = EXCLUDED.cost_per_hour_amount,
        hours_per_fte_month = EXCLUDED.hours_per_fte_month,
        confidence_score = EXCLUDED.confidence_score,
        confidence_label = EXCLUDED.confidence_label,
        snapshot_status = EXCLUDED.snapshot_status,
        detail_jsonb = EXCLUDED.detail_jsonb,
        materialized_at = EXCLUDED.materialized_at,
        updated_at = CURRENT_TIMESTAMP
    `.execute(db)
  }

  const result = await sql<SnapshotRow>`
    SELECT *
    FROM greenhouse_commercial.role_modeled_cost_basis_snapshots
    WHERE period_year = ${year}
      AND period_month = ${month}
    ORDER BY role_sku ASC, employment_type_code ASC
  `.execute(db)

  return result.rows.map(mapSnapshotRow)
}

export const getPreferredRoleModeledCostBasisByRoleId = async (
  roleId: string,
  employmentTypeCode?: string | null,
  input: { year?: number | null; month?: number | null; asOfDate?: string | null } = {}
): Promise<RoleModeledCostBasisSnapshot | null> => {
  const db = await getDb()
  const year = input.year ?? null
  const month = input.month ?? null

  const snapshotResult = await sql<SnapshotRow>`
    SELECT snapshot.*
    FROM greenhouse_commercial.role_modeled_cost_basis_snapshots AS snapshot
    WHERE snapshot.role_id = ${roleId}
      AND (${employmentTypeCode ?? null}::text IS NULL OR snapshot.employment_type_code = ${employmentTypeCode ?? null})
    ORDER BY
      CASE
        WHEN ${year}::integer IS NOT NULL
         AND ${month}::integer IS NOT NULL
         AND snapshot.period_year = ${year}
         AND snapshot.period_month = ${month}
        THEN 0
        ELSE 1
      END,
      snapshot.period_year DESC,
      snapshot.period_month DESC,
      snapshot.updated_at DESC
    LIMIT 1
  `.execute(db)

  if (snapshotResult.rows[0]) {
    return mapSnapshotRow(snapshotResult.rows[0])
  }

  const asOfDate =
    input.asOfDate?.trim() ||
    (year != null && month != null ? getLastBusinessDayOfMonth(year, month) : new Date().toISOString().slice(0, 10))

  const fallbackRows = await loadEffectiveAssumptions(asOfDate)

  const fallbackRow = fallbackRows.find(
    row => row.role_id === roleId && (!employmentTypeCode || row.employment_type_code === employmentTypeCode)
  )

  if (!fallbackRow) {
    return null
  }

  const resolvedYear = year ?? Number(asOfDate.slice(0, 4))
  const resolvedMonth = month ?? Number(asOfDate.slice(5, 7))
  const periodId = buildPeriodId(resolvedYear, resolvedMonth)

  return {
    snapshotId: `adhoc:${roleId}:${fallbackRow.employment_type_code}:${toDateString(fallbackRow.effective_from)}`,
    snapshotKey: buildSnapshotKey(roleId, fallbackRow.employment_type_code, periodId),
    roleId: fallbackRow.role_id,
    roleSku: fallbackRow.role_sku,
    roleCode: fallbackRow.role_code,
    roleLabel: fallbackRow.role_label_es,
    employmentTypeCode: fallbackRow.employment_type_code,
    periodYear: resolvedYear,
    periodMonth: resolvedMonth,
    periodId,
    snapshotDate: asOfDate,
    sourceCostComponentEffectiveFrom: toDateString(fallbackRow.effective_from),
    sourceKind: fallbackRow.source_kind,
    sourceRef:
      fallbackRow.source_ref ??
      `sellable_role_cost_components:${fallbackRow.role_id}:${fallbackRow.employment_type_code}:${toDateString(fallbackRow.effective_from)}`,
    resolvedCurrency: 'USD',
    baseLaborCostAmount: toNumber(fallbackRow.total_monthly_cost_usd),
    directOverheadPct: toNumber(fallbackRow.direct_overhead_pct),
    sharedOverheadPct: toNumber(fallbackRow.shared_overhead_pct),
    directOverheadAmount: toNumber(fallbackRow.direct_overhead_amount_usd),
    sharedOverheadAmount: toNumber(fallbackRow.shared_overhead_amount_usd),
    loadedCostAmount: toNumber(fallbackRow.loaded_monthly_cost_usd),
    costPerHourAmount: toNullableNumber(fallbackRow.loaded_hourly_cost_usd),
    hoursPerFteMonth: toNumber(fallbackRow.hours_per_fte_month),
    confidenceScore: toNumber(fallbackRow.confidence_score),
    confidenceLabel: fallbackRow.confidence_label,
    snapshotStatus: 'complete',
    detail: buildDetail(fallbackRow),
    materializedAt: toTimestampString(fallbackRow.created_at),
    createdAt: toTimestampString(fallbackRow.created_at),
    updatedAt: toTimestampString(fallbackRow.created_at)
  }
}
