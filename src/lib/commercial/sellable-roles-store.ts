import type { Kysely, Selectable, Transaction } from 'kysely'
import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import type { DB } from '@/types/db'

import type {
  EmploymentTypeSeedRow,
  SellableRolePricingCurrency,
  SellableRoleSeedPricingRow,
  SellableRoleSeedRow
} from './sellable-roles-seed'

type DbLike = Kysely<DB> | Transaction<DB>
type SellableRoleRow = Selectable<DB['greenhouse_commercial.sellable_roles']>
type EmploymentTypeRow = Selectable<DB['greenhouse_commercial.employment_types']>
type SellableRoleCostRow = Selectable<DB['greenhouse_commercial.sellable_role_cost_components']>
type SellableRolePricingRow = Selectable<DB['greenhouse_commercial.sellable_role_pricing_currency']>

export interface SellableRoleEntry {
  roleId: string
  roleSku: string
  roleCode: string
  roleLabelEs: string
  roleLabelEn: string | null
  category: string
  tier: string
  tierLabel: string
  canSellAsStaff: boolean
  canSellAsServiceComponent: boolean
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface EmploymentTypeEntry {
  employmentTypeCode: string
  labelEs: string
  labelEn: string | null
  paymentCurrency: string
  countryCode: string
  appliesPrevisional: boolean
  previsionalPctDefault: number | null
  feeMonthlyUsdDefault: number
  feePctDefault: number | null
  appliesBonuses: boolean
  sourceOfTruth: string
  effectiveFrom: string
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SellableRoleCostEntry {
  roleId: string
  employmentTypeCode: string
  effectiveFrom: string
  baseSalaryUsd: number
  bonusJitUsd: number
  bonusRpaUsd: number
  bonusArUsd: number
  bonusSobrecumplimientoUsd: number
  gastosPrevisionalesUsd: number
  feeDeelUsd: number
  feeEorUsd: number
  hoursPerFteMonth: number
  directOverheadPct: number
  sharedOverheadPct: number
  directOverheadAmountUsd: number | null
  sharedOverheadAmountUsd: number | null
  totalMonthlyCostUsd: number | null
  hourlyCostUsd: number | null
  loadedMonthlyCostUsd: number | null
  loadedHourlyCostUsd: number | null
  sourceKind: string
  sourceRef: string | null
  confidenceScore: number | null
  confidenceLabel: 'high' | 'medium' | 'low' | null
  notes: string | null
  createdAt: string
}

export interface SellableRolePricingEntry {
  roleId: string
  currencyCode: SellableRolePricingCurrency
  effectiveFrom: string
  marginPct: number
  hourlyPrice: number
  fteMonthlyPrice: number
  notes: string | null
  createdAt: string
}

export interface SellableRoleCompatibilityEntry {
  roleId: string
  employmentTypeCode: string
  isDefault: boolean
  allowed: boolean
  notes: string | null
  createdAt: string
  employmentType: EmploymentTypeEntry | null
}

export interface ListSellableRolesInput {
  category?: string | null
  tier?: string | null
  staffOnly?: boolean | null
  serviceComponentOnly?: boolean | null
  activeOnly?: boolean | null
}

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toStringDate = (value: Date | string | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toStringTimestamp = (value: Date | string | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value

  return value.toISOString()
}

const toConfidenceLabel = (value: string | null | undefined): SellableRoleCostEntry['confidenceLabel'] => {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return null
}

const mapRole = (row: SellableRoleRow): SellableRoleEntry => ({
  roleId: row.role_id,
  roleSku: row.role_sku,
  roleCode: row.role_code,
  roleLabelEs: row.role_label_es,
  roleLabelEn: row.role_label_en,
  category: row.category,
  tier: row.tier,
  tierLabel: row.tier_label,
  canSellAsStaff: row.can_sell_as_staff,
  canSellAsServiceComponent: row.can_sell_as_service_component,
  active: row.active,
  notes: row.notes,
  createdAt: toStringTimestamp(row.created_at),
  updatedAt: toStringTimestamp(row.updated_at)
})

const mapEmploymentType = (row: EmploymentTypeRow): EmploymentTypeEntry => ({
  employmentTypeCode: row.employment_type_code,
  labelEs: row.label_es,
  labelEn: row.label_en,
  paymentCurrency: row.payment_currency,
  countryCode: row.country_code,
  appliesPrevisional: row.applies_previsional,
  previsionalPctDefault: toNumber(row.previsional_pct_default),
  feeMonthlyUsdDefault: toNumber(row.fee_monthly_usd_default) ?? 0,
  feePctDefault: toNumber(row.fee_pct_default),
  appliesBonuses: row.applies_bonuses,
  sourceOfTruth: row.source_of_truth,
  effectiveFrom: toStringDate(row.effective_from),
  notes: row.notes,
  active: row.active,
  createdAt: toStringTimestamp(row.created_at),
  updatedAt: toStringTimestamp(row.updated_at)
})

const mapCostRow = (row: SellableRoleCostRow): SellableRoleCostEntry => ({
  roleId: row.role_id,
  employmentTypeCode: row.employment_type_code,
  effectiveFrom: toStringDate(row.effective_from),
  baseSalaryUsd: toNumber(row.base_salary_usd) ?? 0,
  bonusJitUsd: toNumber(row.bonus_jit_usd) ?? 0,
  bonusRpaUsd: toNumber(row.bonus_rpa_usd) ?? 0,
  bonusArUsd: toNumber(row.bonus_ar_usd) ?? 0,
  bonusSobrecumplimientoUsd: toNumber(row.bonus_sobrecumplimiento_usd) ?? 0,
  gastosPrevisionalesUsd: toNumber(row.gastos_previsionales_usd) ?? 0,
  feeDeelUsd: toNumber(row.fee_deel_usd) ?? 0,
  feeEorUsd: toNumber(row.fee_eor_usd) ?? 0,
  hoursPerFteMonth: row.hours_per_fte_month,
  directOverheadPct: toNumber(row.direct_overhead_pct) ?? 0,
  sharedOverheadPct: toNumber(row.shared_overhead_pct) ?? 0,
  directOverheadAmountUsd: toNumber(row.direct_overhead_amount_usd),
  sharedOverheadAmountUsd: toNumber(row.shared_overhead_amount_usd),
  totalMonthlyCostUsd: toNumber(row.total_monthly_cost_usd),
  hourlyCostUsd: toNumber(row.hourly_cost_usd),
  loadedMonthlyCostUsd: toNumber(row.loaded_monthly_cost_usd),
  loadedHourlyCostUsd: toNumber(row.loaded_hourly_cost_usd),
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  confidenceScore: toNumber(row.confidence_score),
  confidenceLabel: toConfidenceLabel(row.confidence_label),
  notes: row.notes,
  createdAt: toStringTimestamp(row.created_at)
})

const mapPricingRow = (row: SellableRolePricingRow): SellableRolePricingEntry => ({
  roleId: row.role_id,
  currencyCode: row.currency_code as SellableRolePricingCurrency,
  effectiveFrom: toStringDate(row.effective_from),
  marginPct: toNumber(row.margin_pct) ?? 0,
  hourlyPrice: toNumber(row.hourly_price) ?? 0,
  fteMonthlyPrice: toNumber(row.fte_monthly_price) ?? 0,
  notes: row.notes,
  createdAt: toStringTimestamp(row.created_at)
})

const numberChanged = (left: number | null | undefined, right: number | null | undefined, tolerance = 0.0001) => {
  const normalizedLeft = left ?? 0
  const normalizedRight = right ?? 0

  return Math.abs(normalizedLeft - normalizedRight) > tolerance
}

const getDbOrTx = async (dbOrTx?: DbLike) => dbOrTx ?? getDb()

export const listSellableRoles = async (
  input: ListSellableRolesInput = {}
): Promise<SellableRoleEntry[]> => {
  const db = await getDb()
  let statement = db
    .selectFrom('greenhouse_commercial.sellable_roles')
    .selectAll()

  if (input.category) {
    statement = statement.where('category', '=', input.category)
  }

  if (input.tier) {
    statement = statement.where('tier', '=', input.tier)
  }

  if (input.staffOnly) {
    statement = statement.where('can_sell_as_staff', '=', true)
  }

  if (input.serviceComponentOnly) {
    statement = statement.where('can_sell_as_service_component', '=', true)
  }

  if (input.activeOnly !== false) {
    statement = statement.where('active', '=', true)
  }

  const rows = await statement.orderBy('role_sku', 'asc').execute()

  return rows.map(mapRole)
}

export const getSellableRoleBySku = async (roleSku: string): Promise<SellableRoleEntry | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.sellable_roles')
    .selectAll()
    .where('role_sku', '=', roleSku)
    .executeTakeFirst()

  return row ? mapRole(row) : null
}

export const getEmploymentTypeByCode = async (employmentTypeCode: string): Promise<EmploymentTypeEntry | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.employment_types')
    .selectAll()
    .where('employment_type_code', '=', employmentTypeCode)
    .executeTakeFirst()

  return row ? mapEmploymentType(row) : null
}

export const listEmploymentTypes = async ({
  activeOnly = true
}: { activeOnly?: boolean } = {}): Promise<EmploymentTypeEntry[]> => {
  const db = await getDb()
  let statement = db.selectFrom('greenhouse_commercial.employment_types').selectAll()

  if (activeOnly) {
    statement = statement.where('active', '=', true)
  }

  const rows = await statement
    .orderBy('employment_type_code', 'asc')
    .orderBy('effective_from', 'desc')
    .execute()

  return rows.map(mapEmploymentType)
}

export const listCompatibleEmploymentTypes = async (
  roleId: string
): Promise<SellableRoleCompatibilityEntry[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_commercial.role_employment_compatibility as rec')
    .leftJoin('greenhouse_commercial.employment_types as et', 'et.employment_type_code', 'rec.employment_type_code')
    .select([
      'rec.role_id',
      'rec.employment_type_code',
      'rec.is_default',
      'rec.allowed',
      'rec.notes',
      'rec.created_at',
      'et.active as et_active',
      'et.applies_bonuses as et_applies_bonuses',
      'et.applies_previsional as et_applies_previsional',
      'et.country_code as et_country_code',
      'et.created_at as et_created_at',
      'et.effective_from as et_effective_from',
      'et.employment_type_code as et_employment_type_code',
      'et.fee_monthly_usd_default as et_fee_monthly_usd_default',
      'et.fee_pct_default as et_fee_pct_default',
      'et.label_en as et_label_en',
      'et.label_es as et_label_es',
      'et.notes as et_notes',
      'et.payment_currency as et_payment_currency',
      'et.previsional_pct_default as et_previsional_pct_default',
      'et.source_of_truth as et_source_of_truth',
      'et.updated_at as et_updated_at'
    ])
    .where('rec.role_id', '=', roleId)
    .orderBy('rec.is_default', 'desc')
    .orderBy('rec.employment_type_code', 'asc')
    .execute()

  return rows.map(row => ({
    roleId: row.role_id,
    employmentTypeCode: row.employment_type_code,
    isDefault: row.is_default,
    allowed: row.allowed,
    notes: row.notes,
    createdAt: toStringTimestamp(row.created_at),
    employmentType: row.et_employment_type_code
      ? {
          employmentTypeCode: row.et_employment_type_code,
          labelEs: row.et_label_es ?? '',
          labelEn: row.et_label_en,
          paymentCurrency: row.et_payment_currency ?? '',
          countryCode: row.et_country_code ?? '',
          appliesPrevisional: Boolean(row.et_applies_previsional),
          previsionalPctDefault: toNumber(row.et_previsional_pct_default),
          feeMonthlyUsdDefault: toNumber(row.et_fee_monthly_usd_default) ?? 0,
          feePctDefault: toNumber(row.et_fee_pct_default),
          appliesBonuses: Boolean(row.et_applies_bonuses),
          sourceOfTruth: row.et_source_of_truth ?? '',
          effectiveFrom: toStringDate(row.et_effective_from),
          notes: row.et_notes,
          active: Boolean(row.et_active),
          createdAt: toStringTimestamp(row.et_created_at),
          updatedAt: toStringTimestamp(row.et_updated_at)
        }
      : null
  }))
}

export const getCurrentCost = async (
  roleId: string,
  employmentTypeCode?: string | null,
  asOfDate?: string | null
): Promise<SellableRoleCostEntry | null> => {
  const db = await getDb()
  let resolvedEmploymentTypeCode = employmentTypeCode?.trim() || null
  const resolvedAsOfDate = asOfDate?.trim() || new Date().toISOString().slice(0, 10)
  const effectiveDate = new Date(`${resolvedAsOfDate}T00:00:00.000Z`)

  if (!resolvedEmploymentTypeCode) {
    const compatibility = await db
      .selectFrom('greenhouse_commercial.role_employment_compatibility')
      .select(['employment_type_code'])
      .where('role_id', '=', roleId)
      .where('is_default', '=', true)
      .where('allowed', '=', true)
      .executeTakeFirst()

    resolvedEmploymentTypeCode = compatibility?.employment_type_code ?? null
  }

  if (!resolvedEmploymentTypeCode) return null

  const row = await db
    .selectFrom('greenhouse_commercial.sellable_role_cost_components')
    .selectAll()
    .where('role_id', '=', roleId)
    .where('employment_type_code', '=', resolvedEmploymentTypeCode)
    .where('effective_from', '<=', effectiveDate)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  return row ? mapCostRow(row) : null
}

export const getCurrentPricing = async (
  roleId: string,
  currencyCode: SellableRolePricingCurrency,
  asOfDate?: string | null
): Promise<SellableRolePricingEntry | null> => {
  const db = await getDb()
  const resolvedAsOfDate = asOfDate?.trim() || new Date().toISOString().slice(0, 10)
  const effectiveDate = new Date(`${resolvedAsOfDate}T00:00:00.000Z`)

  const row = await db
    .selectFrom('greenhouse_commercial.sellable_role_pricing_currency')
    .selectAll()
    .where('role_id', '=', roleId)
    .where('currency_code', '=', currencyCode)
    .where('effective_from', '<=', effectiveDate)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  return row ? mapPricingRow(row) : null
}

export const upsertEmploymentType = async (
  input: EmploymentTypeSeedRow,
  dbOrTx?: DbLike
): Promise<{ employmentTypeCode: string; created: boolean }> => {
  const db = await getDbOrTx(dbOrTx)

  const existing = await db
    .selectFrom('greenhouse_commercial.employment_types')
    .select(['employment_type_code'])
    .where('employment_type_code', '=', input.employmentTypeCode)
    .executeTakeFirst()

  await db
    .insertInto('greenhouse_commercial.employment_types')
    .values({
      employment_type_code: input.employmentTypeCode,
      label_es: input.labelEs,
      label_en: input.labelEn,
      payment_currency: input.paymentCurrency,
      country_code: input.countryCode,
      applies_previsional: input.appliesPrevisional,
      previsional_pct_default: input.previsionalPctDefault,
      fee_monthly_usd_default: input.feeMonthlyUsdDefault,
      fee_pct_default: input.feePctDefault,
      applies_bonuses: input.appliesBonuses,
      source_of_truth: input.sourceOfTruth,
      effective_from: sql`CURRENT_DATE`,
      notes: input.notes,
      active: true,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.column('employment_type_code').doUpdateSet({
      label_es: input.labelEs,
      label_en: input.labelEn,
      payment_currency: input.paymentCurrency,
      country_code: input.countryCode,
      applies_previsional: input.appliesPrevisional,
      previsional_pct_default: input.previsionalPctDefault,
      fee_monthly_usd_default: input.feeMonthlyUsdDefault,
      fee_pct_default: input.feePctDefault,
      applies_bonuses: input.appliesBonuses,
      source_of_truth: input.sourceOfTruth,
      notes: input.notes,
      active: true,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .execute()

  return {
    employmentTypeCode: input.employmentTypeCode,
    created: !existing
  }
}

export const upsertSellableRole = async (
  input: SellableRoleSeedRow,
  dbOrTx?: DbLike
): Promise<{ roleId: string; created: boolean }> => {
  const db = await getDbOrTx(dbOrTx)

  const existing = await db
    .selectFrom('greenhouse_commercial.sellable_roles')
    .select(['role_id'])
    .where('role_sku', '=', input.roleSku)
    .executeTakeFirst()

  const row = await db
    .insertInto('greenhouse_commercial.sellable_roles')
    .values({
      role_sku: input.roleSku,
      role_code: input.roleCode,
      role_label_es: input.roleLabelEs,
      role_label_en: null,
      category: input.category,
      tier: input.tier,
      tier_label: input.tierLabel,
      can_sell_as_staff: input.canSellAsStaff,
      can_sell_as_service_component: input.canSellAsServiceComponent,
      active: true,
      notes: input.reviewReasons.length > 0 ? `needs_review:${input.reviewReasons.join(',')}` : null,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.column('role_sku').doUpdateSet({
      role_code: input.roleCode,
      role_label_es: input.roleLabelEs,
      category: input.category,
      tier: input.tier,
      tier_label: input.tierLabel,
      can_sell_as_staff: input.canSellAsStaff,
      can_sell_as_service_component: input.canSellAsServiceComponent,
      active: true,
      notes: input.reviewReasons.length > 0 ? `needs_review:${input.reviewReasons.join(',')}` : null,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .returning(['role_id'])
    .executeTakeFirstOrThrow()

  return {
    roleId: row.role_id,
    created: !existing
  }
}

export const insertCostComponentsIfChanged = async (
  roleId: string,
  seedRow: SellableRoleSeedRow,
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<{ changed: boolean; entry: SellableRoleCostEntry | null }> => {
  if (!seedRow.inferredEmploymentTypeCode) {
    return { changed: false, entry: null }
  }

  const db = await getDbOrTx(dbOrTx)
  const effectiveDate = new Date(`${effectiveFrom}T00:00:00.000Z`)

  const currentEffective = await db
    .selectFrom('greenhouse_commercial.sellable_role_cost_components')
    .selectAll()
    .where('role_id', '=', roleId)
    .where('employment_type_code', '=', seedRow.inferredEmploymentTypeCode)
    .where('effective_from', '=', effectiveDate)
    .executeTakeFirst()

  const latest = await db
    .selectFrom('greenhouse_commercial.sellable_role_cost_components')
    .selectAll()
    .where('role_id', '=', roleId)
    .where('employment_type_code', '=', seedRow.inferredEmploymentTypeCode)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const baseline = currentEffective ?? latest

  // Defaults back-compat: CSVs de seed histórico no traen estos campos
  // (se asumieron 180h/mes y 0 fee EOR desde TASK-464a). Admin UI (TASK-467
  // phase-2) los envía explícitos cuando el rol los overridea.
  const feeEorUsd = seedRow.feeEorUsd ?? 0
  const hoursPerFteMonth = seedRow.hoursPerFteMonth ?? 180
  const directOverheadPct = seedRow.directOverheadPct ?? 0
  const sharedOverheadPct = seedRow.sharedOverheadPct ?? 0
  const sourceKind = seedRow.sourceKind ?? 'catalog_seed'
  const sourceRef = seedRow.sourceRef ?? null
  const confidenceScore = seedRow.confidenceScore ?? (sourceKind === 'admin_manual' ? 0.75 : 0.6)

  const changed = !baseline ||
    numberChanged(toNumber(baseline.base_salary_usd), seedRow.baseSalaryUsd) ||
    numberChanged(toNumber(baseline.bonus_jit_usd), seedRow.bonusJitUsd) ||
    numberChanged(toNumber(baseline.bonus_rpa_usd), seedRow.bonusRpaUsd) ||
    numberChanged(toNumber(baseline.bonus_ar_usd), seedRow.bonusArUsd) ||
    numberChanged(toNumber(baseline.bonus_sobrecumplimiento_usd), seedRow.bonusSobrecumplimientoUsd) ||
    numberChanged(toNumber(baseline.gastos_previsionales_usd), seedRow.gastosPrevisionalesUsd) ||
    numberChanged(toNumber(baseline.fee_deel_usd), seedRow.feeDeelUsd) ||
    numberChanged(toNumber(baseline.fee_eor_usd), feeEorUsd) ||
    baseline.hours_per_fte_month !== hoursPerFteMonth ||
    numberChanged(toNumber(baseline.direct_overhead_pct), directOverheadPct) ||
    numberChanged(toNumber(baseline.shared_overhead_pct), sharedOverheadPct) ||
    (baseline.source_kind ?? 'catalog_seed') !== sourceKind ||
    (baseline.source_ref ?? null) !== sourceRef ||
    numberChanged(toNumber(baseline.confidence_score), confidenceScore)

  if (!changed) {
    return { changed: false, entry: mapCostRow(baseline) }
  }

  const inserted = await db
    .insertInto('greenhouse_commercial.sellable_role_cost_components')
    .values({
      role_id: roleId,
      employment_type_code: seedRow.inferredEmploymentTypeCode,
      effective_from: effectiveFrom,
      base_salary_usd: seedRow.baseSalaryUsd,
      bonus_jit_usd: seedRow.bonusJitUsd,
      bonus_rpa_usd: seedRow.bonusRpaUsd,
      bonus_ar_usd: seedRow.bonusArUsd,
      bonus_sobrecumplimiento_usd: seedRow.bonusSobrecumplimientoUsd,
      gastos_previsionales_usd: seedRow.gastosPrevisionalesUsd,
      fee_deel_usd: seedRow.feeDeelUsd,
      fee_eor_usd: feeEorUsd,
      hours_per_fte_month: hoursPerFteMonth,
      direct_overhead_pct: directOverheadPct,
      shared_overhead_pct: sharedOverheadPct,
      source_kind: sourceKind,
      source_ref: sourceRef,
      confidence_score: confidenceScore,
      notes: seedRow.driftWarnings.length > 0 ? `drift:${seedRow.driftWarnings.join(',')}` : null
    })
    .onConflict(oc => oc.columns(['role_id', 'employment_type_code', 'effective_from']).doUpdateSet({
      base_salary_usd: seedRow.baseSalaryUsd,
      bonus_jit_usd: seedRow.bonusJitUsd,
      bonus_rpa_usd: seedRow.bonusRpaUsd,
      bonus_ar_usd: seedRow.bonusArUsd,
      bonus_sobrecumplimiento_usd: seedRow.bonusSobrecumplimientoUsd,
      gastos_previsionales_usd: seedRow.gastosPrevisionalesUsd,
      fee_deel_usd: seedRow.feeDeelUsd,
      fee_eor_usd: feeEorUsd,
      hours_per_fte_month: hoursPerFteMonth,
      direct_overhead_pct: directOverheadPct,
      shared_overhead_pct: sharedOverheadPct,
      source_kind: sourceKind,
      source_ref: sourceRef,
      confidence_score: confidenceScore,
      notes: seedRow.driftWarnings.length > 0 ? `drift:${seedRow.driftWarnings.join(',')}` : null
    }))
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    changed: true,
    entry: mapCostRow(inserted)
  }
}

export const syncRoleEmploymentCompatibility = async (
  roleId: string,
  employmentTypeCode: string | null,
  dbOrTx?: DbLike
): Promise<void> => {
  if (!employmentTypeCode) return

  const db = await getDbOrTx(dbOrTx)

  await db
    .updateTable('greenhouse_commercial.role_employment_compatibility')
    .set({ is_default: false })
    .where('role_id', '=', roleId)
    .where('employment_type_code', '!=', employmentTypeCode)
    .execute()

  await db
    .insertInto('greenhouse_commercial.role_employment_compatibility')
    .values({
      role_id: roleId,
      employment_type_code: employmentTypeCode,
      is_default: true,
      allowed: true,
      notes: 'auto_seeded_default'
    })
    .onConflict(oc => oc.columns(['role_id', 'employment_type_code']).doUpdateSet({
      is_default: true,
      allowed: true,
      notes: 'auto_seeded_default'
    }))
    .execute()
}

export const insertPricingRowsIfChanged = async (
  roleId: string,
  pricingRows: SellableRoleSeedPricingRow[],
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<Array<{ changed: boolean; entry: SellableRolePricingEntry }>> => {
  const db = await getDbOrTx(dbOrTx)
  const effectiveDate = new Date(`${effectiveFrom}T00:00:00.000Z`)
  const results: Array<{ changed: boolean; entry: SellableRolePricingEntry }> = []

  for (const pricingRow of pricingRows) {
    const currentEffective = await db
      .selectFrom('greenhouse_commercial.sellable_role_pricing_currency')
      .selectAll()
      .where('role_id', '=', roleId)
      .where('currency_code', '=', pricingRow.currencyCode)
      .where('effective_from', '=', effectiveDate)
      .executeTakeFirst()

    const latest = await db
      .selectFrom('greenhouse_commercial.sellable_role_pricing_currency')
      .selectAll()
      .where('role_id', '=', roleId)
      .where('currency_code', '=', pricingRow.currencyCode)
      .orderBy('effective_from', 'desc')
      .executeTakeFirst()

    const baseline = currentEffective ?? latest

    const changed = !baseline ||
      numberChanged(toNumber(baseline.margin_pct), pricingRow.marginPct) ||
      numberChanged(toNumber(baseline.hourly_price), pricingRow.hourlyPrice) ||
      numberChanged(toNumber(baseline.fte_monthly_price), pricingRow.fteMonthlyPrice)

    if (!changed) {
      results.push({ changed: false, entry: mapPricingRow(baseline) })
      continue
    }

    const inserted = await db
      .insertInto('greenhouse_commercial.sellable_role_pricing_currency')
      .values({
        role_id: roleId,
        currency_code: pricingRow.currencyCode,
        effective_from: effectiveFrom,
        margin_pct: pricingRow.marginPct,
        hourly_price: pricingRow.hourlyPrice,
        fte_monthly_price: pricingRow.fteMonthlyPrice,
        notes: null
      })
      .onConflict(oc => oc.columns(['role_id', 'currency_code', 'effective_from']).doUpdateSet({
        margin_pct: pricingRow.marginPct,
        hourly_price: pricingRow.hourlyPrice,
        fte_monthly_price: pricingRow.fteMonthlyPrice,
        notes: null
      }))
      .returningAll()
      .executeTakeFirstOrThrow()

    results.push({
      changed: true,
      entry: mapPricingRow(inserted)
    })
  }

  return results
}

export const syncSellableRoleSkuSequence = async (dbOrTx?: DbLike): Promise<void> => {
  const db = await getDbOrTx(dbOrTx)

  await sql`
    SELECT setval(
      'greenhouse_commercial.sellable_role_sku_seq',
      GREATEST(
        COALESCE((
          SELECT MAX(CAST(SUBSTRING(role_sku FROM 5) AS integer)) + 1
          FROM greenhouse_commercial.sellable_roles
          WHERE role_sku ~ '^ECG-[0-9]{3,}$'
        ), 33),
        33
      ),
      false
    )
  `.execute(db)
}
