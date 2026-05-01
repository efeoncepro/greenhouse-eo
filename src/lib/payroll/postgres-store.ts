import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type {
  CompensationVersion,
  CreateCompensationVersionInput,
  CreatePayrollPeriodInput,
  PayrollCompensationMember,
  PayrollCompensationOverview,
  PayrollEntry,
  PayrollMemberSummary,
  PayrollPeriod,
  UpdateCompensationVersionInput,
  UpdatePayrollPeriodInput
} from '@/types/payroll'
import {
  CONTRACT_DERIVATIONS,
  contractAllowsRemoteAllowance,
  normalizeContractType,
  normalizePayrollVia,
  resolveScheduleRequired
} from '@/types/hr-contracts'

import { captureWithDomain } from '@/lib/observability/capture'
import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  PayrollValidationError,
  assertPayrollDateString,
  buildPeriodId,
  getPayrollPeriodEndDate,
  normalizeBoolean,
  normalizeNullableString,
  normalizeString,
  parsePayrollNumber,
  toNullableNumber,
  toNumber
} from '@/lib/payroll/shared'
import {
  getCompensationVersionLockedMessage,
  isCompensationVersionLockedByPayroll
} from '@/lib/payroll/compensation-versioning'
import {
  canEditPayrollPeriodMetadata,
  canSetPayrollPeriodApproved,
  canSetPayrollPeriodCalculated,
  canSetPayrollPeriodExported,
  doesPayrollPeriodUpdateRequireReset
} from '@/lib/payroll/period-lifecycle'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { resolveChileAfpSplitRates } from '@/lib/payroll/chile-previsional-helpers'
import { buildPayrollTaxTableVersion } from '@/lib/payroll/tax-table-version-format'
import { resolvePayrollTaxTableVersion } from '@/lib/payroll/tax-table-version'


// ---------------------------------------------------------------------------
// Row types (PostgreSQL result shapes)
// ---------------------------------------------------------------------------

type PgCompensationRow = {
  version_id: string
  member_id: string
  display_name: string | null
  primary_email: string | null
  avatar_url: string | null
  version: number | string
  pay_regime: string
  currency: string
  base_salary: number | string
  remote_allowance: number | string
  colacion_amount: number | string
  movilizacion_amount: number | string
  fixed_bonus_label: string | null
  fixed_bonus_amount: number | string
  bonus_otd_min: number | string
  bonus_otd_max: number | string
  bonus_rpa_min: number | string
  bonus_rpa_max: number | string
  gratificacion_legal_mode: string | null
  afp_name: string | null
  afp_rate: number | string | null
  afp_cotizacion_rate: number | string | null
  afp_comision_rate: number | string | null
  health_system: string | null
  health_plan_uf: number | string | null
  unemployment_rate: number | string | null
  contract_type: string
  payroll_via: string | null
  deel_contract_id: string | null
  daily_required: boolean | null
  has_apv: boolean
  apv_amount: number | string
  effective_from: string | Date
  effective_to: string | Date | null
  is_current: boolean
  change_reason: string | null
  desired_net_clp: number | string | null
  created_by_user_id: string | null
  created_at: string | Date | null
}

const resolvePayrollPeriodUfValue = async ({
  year,
  month,
  ufValue
}: {
  year: number
  month: number
  ufValue?: number | null
}) => {
  if (typeof ufValue === 'number') {
    return ufValue
  }

  const snapshot = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'UF',
    periodDate: getPayrollPeriodEndDate(year, month)
  })

  return snapshot?.value ?? null
}

type PgPeriodRow = {
  period_id: string
  year: number | string
  month: number | string
  status: string
  calculated_at: string | Date | null
  calculated_by_user_id: string | null
  approved_at: string | Date | null
  approved_by_user_id: string | null
  exported_at: string | Date | null
  uf_value: number | string | null
  tax_table_version: string | null
  notes: string | null
  created_at: string | Date | null
}

type PgEntryRow = {
  entry_id: string
  period_id: string
  member_id: string
  display_name: string | null
  primary_email: string | null
  avatar_url: string | null
  compensation_version_id: string
  pay_regime: string
  payroll_via: string | null
  deel_contract_id: string | null
  currency: string
  base_salary: number | string
  remote_allowance: number | string
  colacion_amount: number | string
  movilizacion_amount: number | string
  fixed_bonus_label: string | null
  fixed_bonus_amount: number | string
  member_display_name: string | null
  kpi_otd_percent: number | string | null
  kpi_rpa_avg: number | string | null
  kpi_otd_qualifies: boolean | null
  kpi_rpa_qualifies: boolean | null
  kpi_tasks_completed: number | string | null
  kpi_data_source: string | null
  bonus_otd_amount: number | string
  bonus_rpa_amount: number | string
  bonus_other_amount: number | string
  bonus_other_description: string | null
  gross_total: number | string
  bonus_otd_min: number | string | null
  bonus_otd_max: number | string | null
  bonus_rpa_min: number | string | null
  bonus_rpa_max: number | string | null
  gratificacion_legal_mode: string | null
  chile_gratificacion_legal: number | string | null
  chile_colacion_amount: number | string | null
  chile_movilizacion_amount: number | string | null
  chile_afp_name: string | null
  chile_afp_rate: number | string | null
  chile_afp_amount: number | string | null
  chile_afp_cotizacion_amount: number | string | null
  chile_afp_comision_amount: number | string | null
  chile_health_system: string | null
  chile_health_amount: number | string | null
  chile_health_obligatoria_amount: number | string | null
  chile_health_voluntaria_amount: number | string | null
  chile_employer_sis_amount: number | string | null
  chile_employer_cesantia_amount: number | string | null
  chile_employer_mutual_amount: number | string | null
  chile_employer_total_cost: number | string | null
  chile_unemployment_rate: number | string | null
  chile_unemployment_amount: number | string | null
  chile_taxable_base: number | string | null
  chile_tax_amount: number | string | null
  sii_retention_rate: number | string | null
  sii_retention_amount: number | string | null
  chile_apv_amount: number | string | null
  chile_uf_value: number | string | null
  chile_total_deductions: number | string | null
  net_total_calculated: number | string | null
  net_total_override: number | string | null
  net_total: number | string
  manual_override: boolean
  manual_override_note: string | null
  bonus_otd_proration_factor: number | string | null
  bonus_rpa_proration_factor: number | string | null
  working_days_in_period: number | string | null
  days_present: number | string | null
  days_absent: number | string | null
  days_on_leave: number | string | null
  days_on_unpaid_leave: number | string | null
  adjusted_base_salary: number | string | null
  adjusted_remote_allowance: number | string | null
  adjusted_colacion_amount: number | string | null
  adjusted_movilizacion_amount: number | string | null
  adjusted_fixed_bonus_amount: number | string | null
  version: number | string | null
  is_active: boolean | null
  superseded_by: string | null
  reopen_audit_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type PgMemberRow = {
  member_id: string
  display_name: string | null
  primary_email: string | null
  avatar_url: string | null
  active: boolean
}

type PgCompensationMemberRow = PgMemberRow & {
  compensation_version_count: number | string | null
  current_version_id: string | null
  current_effective_from: string | Date | null
  current_contract_type: string | null
  current_pay_regime: string | null
  current_payroll_via: string | null
  current_daily_required: boolean | null
  current_deel_contract_id: string | null
  contract_end_date: string | Date | null
  current_currency: string | null
}

// ---------------------------------------------------------------------------
// Schema readiness check (replicated from Leave store pattern)
// ---------------------------------------------------------------------------

const PAYROLL_CORE_REQUIRED_TABLES = [
  'greenhouse_core.members',
  'greenhouse_core.client_users',
  'greenhouse_payroll.compensation_versions',
  'greenhouse_payroll.payroll_periods',
  'greenhouse_payroll.payroll_entries',
  'greenhouse_payroll.payroll_bonus_config'
] as const

const PAYROLL_RECEIPT_REQUIRED_TABLES = [
  ...PAYROLL_CORE_REQUIRED_TABLES,
  'greenhouse_payroll.payroll_receipts'
] as const

const PAYROLL_EXPORT_PACKAGE_REQUIRED_TABLES = [
  ...PAYROLL_CORE_REQUIRED_TABLES,
  'greenhouse_payroll.payroll_export_packages'
] as const

let payrollStoreReadyPromise: Promise<void> | null = null
let payrollStoreReadyAt = 0

const PAYROLL_STORE_READY_TTL_MS = 60_000

export const isPayrollPostgresEnabled = () => isGreenhousePostgresConfigured()

const assertPayrollTablesReady = async (requiredTables: readonly string[], label: string) => {
  if (!isPayrollPostgresEnabled()) {
    throw new PayrollValidationError(
      `${label} is not configured in this environment.`,
      503
    )
  }

  if (Date.now() - payrollStoreReadyAt < PAYROLL_STORE_READY_TTL_MS) {
    return
  }

  if (payrollStoreReadyPromise) {
    return payrollStoreReadyPromise
  }

  payrollStoreReadyPromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
      `
        SELECT schemaname || '.' || tablename AS qualified_name
        FROM pg_tables
        WHERE schemaname = ANY($1::text[])
      `,
      [['greenhouse_core', 'greenhouse_payroll']]
    )

    const existing = new Set(rows.map(row => row.qualified_name))
    const missing = requiredTables.filter(t => !existing.has(t))

    if (missing.length > 0) {
      throw new PayrollValidationError(
        `${label} schema is not ready. Missing tables: ${missing.join(', ')}. Run setup-postgres-payroll.sql first.`,
        503
      )
    }

    payrollStoreReadyAt = Date.now()
  })().catch(error => {
    payrollStoreReadyPromise = null
    throw error
  })

  return payrollStoreReadyPromise.finally(() => {
    payrollStoreReadyPromise = null
  })
}

export const assertPayrollPostgresReady = async () =>
  assertPayrollTablesReady(PAYROLL_CORE_REQUIRED_TABLES, 'Payroll Postgres store')

export const assertPayrollReceiptsReady = async () =>
  assertPayrollTablesReady(PAYROLL_RECEIPT_REQUIRED_TABLES, 'Payroll receipts store')

export const assertPayrollExportPackagesReady = async () =>
  assertPayrollTablesReady(PAYROLL_EXPORT_PACKAGE_REQUIRED_TABLES, 'Payroll export packages store')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: PoolClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const toPgDateString = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return typeof value === 'string' ? value.slice(0, 10) : null
}

const toPgTimestampString = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return typeof value === 'string' ? value : null
}

const getCurrentDateString = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

const addDaysToDateString = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00.000Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

const isCurrentCompensationWindow = (effectiveFrom: string, effectiveTo: string | null) => {
  const today = getCurrentDateString()

  return effectiveFrom <= today && (!effectiveTo || effectiveTo >= today)
}

const normalizeGratificacionLegalMode = (
  value: string | null | undefined,
  payRegime: 'chile' | 'international'
): 'mensual_25pct' | 'anual_proporcional' | 'ninguna' =>
  payRegime === 'international'
    ? 'ninguna'
    : value === 'mensual_25pct' || value === 'anual_proporcional' || value === 'ninguna'
      ? value
      : 'mensual_25pct'

const toFinitePeriodNumber = (value: string | undefined): number | null => {
  if (!value) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

const publishPayrollOutboxEvent = async ({
  eventType,
  aggregateType,
  aggregateId,
  payload,
  client
}: {
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  client: PoolClient
}) => {
  await client.query(
    `
      INSERT INTO greenhouse_sync.outbox_events (
        event_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload_json
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [`outbox-${randomUUID()}`, aggregateType, aggregateId, eventType, JSON.stringify(payload)]
  )
}

// ---------------------------------------------------------------------------
// Mappers (PG row → API type)
// ---------------------------------------------------------------------------

const mapCompensationVersion = (row: PgCompensationRow): CompensationVersion => {
  const effectiveFrom = toPgDateString(row.effective_from) || ''
  const effectiveTo = toPgDateString(row.effective_to)
  const payRegime = row.pay_regime === 'international' ? 'international' : 'chile'
  const afpRate = toNullableNumber(row.afp_rate)
  const contractType = normalizeContractType(row.contract_type)

  const resolvedAfpSplitRates = resolveChileAfpSplitRates({
    totalRate: afpRate,
    cotizacionRate: toNullableNumber(row.afp_cotizacion_rate),
    comisionRate: toNullableNumber(row.afp_comision_rate)
  })

  return {
    versionId: row.version_id,
    memberId: row.member_id,
    memberName: row.display_name || 'Sin nombre',
    memberEmail: row.primary_email || '',
    memberAvatarUrl: normalizeNullableString(row.avatar_url),
    notionUserId: null,
    version: toNumber(row.version),
    payRegime,
    currency: row.currency === 'USD' ? 'USD' : 'CLP',
    baseSalary: toNumber(row.base_salary),
    remoteAllowance: toNumber(row.remote_allowance),
    colacionAmount: toNumber(row.colacion_amount),
    movilizacionAmount: toNumber(row.movilizacion_amount),
    fixedBonusLabel: normalizeNullableString(row.fixed_bonus_label),
    fixedBonusAmount: toNumber(row.fixed_bonus_amount),
    bonusOtdMin: toNumber(row.bonus_otd_min),
    bonusOtdMax: toNumber(row.bonus_otd_max),
    bonusRpaMin: toNumber(row.bonus_rpa_min),
    bonusRpaMax: toNumber(row.bonus_rpa_max),
    gratificacionLegalMode: normalizeGratificacionLegalMode(row.gratificacion_legal_mode, payRegime),
    afpName: normalizeNullableString(row.afp_name),
    afpRate,
    afpCotizacionRate: payRegime === 'chile' ? resolvedAfpSplitRates?.cotizacionRate ?? null : null,
    afpComisionRate: payRegime === 'chile' ? resolvedAfpSplitRates?.comisionRate ?? null : null,
    healthSystem: row.health_system === 'isapre' ? 'isapre' : row.health_system === 'fonasa' ? 'fonasa' : null,
    healthPlanUf: toNullableNumber(row.health_plan_uf),
    unemploymentRate: toNumber(row.unemployment_rate),
    contractType,
    payrollVia: normalizePayrollVia(row.payroll_via, contractType),
    scheduleRequired: row.daily_required ?? resolveScheduleRequired({ contractType }),
    deelContractId: normalizeNullableString(row.deel_contract_id),
    hasApv: Boolean(row.has_apv),
    apvAmount: toNumber(row.apv_amount),
    effectiveFrom,
    effectiveTo,
    isCurrent: effectiveFrom ? isCurrentCompensationWindow(effectiveFrom, effectiveTo) : Boolean(row.is_current),
    changeReason: normalizeNullableString(row.change_reason),
    desiredNetClp: toNullableNumber(row.desired_net_clp),
    createdBy: normalizeNullableString(row.created_by_user_id),
    createdAt: toPgTimestampString(row.created_at)
  }
}

const mapPeriod = (row: PgPeriodRow): PayrollPeriod => ({
  periodId: row.period_id,
  year: toNumber(row.year),
  month: toNumber(row.month),
  status:
    row.status === 'approved' ||
    row.status === 'exported' ||
    row.status === 'calculated' ||
    row.status === 'reopened'
      ? row.status
      : 'draft',
  calculatedAt: toPgTimestampString(row.calculated_at),
  calculatedBy: normalizeNullableString(row.calculated_by_user_id),
  approvedAt: toPgTimestampString(row.approved_at),
  approvedBy: normalizeNullableString(row.approved_by_user_id),
  exportedAt: toPgTimestampString(row.exported_at),
  ufValue: toNullableNumber(row.uf_value),
  taxTableVersion: normalizeNullableString(row.tax_table_version),
  notes: normalizeNullableString(row.notes),
  createdAt: toPgTimestampString(row.created_at)
})

const mapEntry = (row: PgEntryRow): PayrollEntry => ({
  entryId: row.entry_id,
  periodId: row.period_id,
  memberId: row.member_id,
  memberName: row.display_name || row.member_display_name || 'Sin nombre',
  memberEmail: row.primary_email || '',
  memberAvatarUrl: normalizeNullableString(row.avatar_url),
  compensationVersionId: row.compensation_version_id,
  payRegime: row.pay_regime === 'international' ? 'international' : 'chile',
  payrollVia: row.payroll_via === 'deel' ? 'deel' : 'internal',
  currency: row.currency === 'USD' ? 'USD' : 'CLP',
  baseSalary: toNumber(row.base_salary),
  remoteAllowance: toNumber(row.remote_allowance),
  colacionAmount: toNumber(row.colacion_amount),
  movilizacionAmount: toNumber(row.movilizacion_amount),
  fixedBonusLabel: normalizeNullableString(row.fixed_bonus_label),
  fixedBonusAmount: toNumber(row.fixed_bonus_amount),
  kpiOtdPercent: toNullableNumber(row.kpi_otd_percent),
  kpiRpaAvg: toNullableNumber(row.kpi_rpa_avg),
  kpiOtdQualifies: normalizeBoolean(row.kpi_otd_qualifies),
  kpiRpaQualifies: normalizeBoolean(row.kpi_rpa_qualifies),
  kpiTasksCompleted: toNullableNumber(row.kpi_tasks_completed),
  kpiDataSource:
    row.kpi_data_source === 'manual'
      ? 'manual'
      : row.kpi_data_source === 'ico'
        ? 'ico'
        : row.kpi_data_source === 'external'
          ? 'external'
          : 'notion_ops',
  bonusOtdAmount: toNumber(row.bonus_otd_amount),
  bonusRpaAmount: toNumber(row.bonus_rpa_amount),
  bonusOtherAmount: toNumber(row.bonus_other_amount),
  bonusOtherDescription: normalizeNullableString(row.bonus_other_description),
  grossTotal: toNumber(row.gross_total),
  bonusOtdMin: toNumber(row.bonus_otd_min),
  bonusOtdMax: toNumber(row.bonus_otd_max),
  bonusRpaMin: toNumber(row.bonus_rpa_min),
  bonusRpaMax: toNumber(row.bonus_rpa_max),
  chileGratificacionLegalAmount: toNullableNumber(row.chile_gratificacion_legal),
  chileColacionAmount: toNullableNumber(row.chile_colacion_amount),
  chileMovilizacionAmount: toNullableNumber(row.chile_movilizacion_amount),
  chileAfpName: normalizeNullableString(row.chile_afp_name),
  chileAfpRate: toNullableNumber(row.chile_afp_rate),
  chileAfpAmount: toNullableNumber(row.chile_afp_amount),
  chileAfpCotizacionAmount: toNullableNumber(row.chile_afp_cotizacion_amount),
  chileAfpComisionAmount: toNullableNumber(row.chile_afp_comision_amount),
  chileHealthSystem: normalizeNullableString(row.chile_health_system),
  chileHealthAmount: toNullableNumber(row.chile_health_amount),
  chileHealthObligatoriaAmount: toNullableNumber(row.chile_health_obligatoria_amount),
  chileHealthVoluntariaAmount: toNullableNumber(row.chile_health_voluntaria_amount),
  chileEmployerSisAmount: toNullableNumber(row.chile_employer_sis_amount),
  chileEmployerCesantiaAmount: toNullableNumber(row.chile_employer_cesantia_amount),
  chileEmployerMutualAmount: toNullableNumber(row.chile_employer_mutual_amount),
  chileEmployerTotalCost: toNullableNumber(row.chile_employer_total_cost),
  chileUnemploymentRate: toNullableNumber(row.chile_unemployment_rate),
  chileUnemploymentAmount: toNullableNumber(row.chile_unemployment_amount),
  chileTaxableBase: toNullableNumber(row.chile_taxable_base),
  chileTaxAmount: toNullableNumber(row.chile_tax_amount),
  siiRetentionRate: toNullableNumber(row.sii_retention_rate),
  siiRetentionAmount: toNullableNumber(row.sii_retention_amount),
  chileApvAmount: toNullableNumber(row.chile_apv_amount),
  chileUfValue: toNullableNumber(row.chile_uf_value),
  chileTotalDeductions: toNullableNumber(row.chile_total_deductions),
  deelContractId: normalizeNullableString(row.deel_contract_id),
  netTotalCalculated: toNullableNumber(row.net_total_calculated),
  netTotalOverride: toNullableNumber(row.net_total_override),
  netTotal: toNumber(row.net_total),
  manualOverride: normalizeBoolean(row.manual_override),
  manualOverrideNote: normalizeNullableString(row.manual_override_note),
  bonusOtdProrationFactor: toNullableNumber(row.bonus_otd_proration_factor),
  bonusRpaProrationFactor: toNullableNumber(row.bonus_rpa_proration_factor),
  workingDaysInPeriod: toNullableNumber(row.working_days_in_period),
  daysPresent: toNullableNumber(row.days_present),
  daysAbsent: toNullableNumber(row.days_absent),
  daysOnLeave: toNullableNumber(row.days_on_leave),
  daysOnUnpaidLeave: toNullableNumber(row.days_on_unpaid_leave),
  adjustedBaseSalary: toNullableNumber(row.adjusted_base_salary),
  adjustedRemoteAllowance: toNullableNumber(row.adjusted_remote_allowance),
  adjustedColacionAmount: toNullableNumber(row.adjusted_colacion_amount),
  adjustedMovilizacionAmount: toNullableNumber(row.adjusted_movilizacion_amount),
  adjustedFixedBonusAmount: toNullableNumber(row.adjusted_fixed_bonus_amount),
  version: row.version != null ? Number(row.version) : 1,
  isActive: row.is_active == null ? true : Boolean(row.is_active),
  supersededBy: normalizeNullableString(row.superseded_by),
  reopenAuditId: normalizeNullableString(row.reopen_audit_id),
  createdAt: toPgTimestampString(row.created_at),
  updatedAt: toPgTimestampString(row.updated_at)
})

const mapMemberSummary = (row: PgMemberRow): PayrollMemberSummary => ({
  memberId: row.member_id,
  memberName: row.display_name || 'Sin nombre',
  memberEmail: row.primary_email || '',
  memberAvatarUrl: normalizeNullableString(row.avatar_url),
  notionUserId: null,
  active: Boolean(row.active)
})

const mapCompensationMember = (row: PgCompensationMemberRow): PayrollCompensationMember => {
  const count = toNumber(row.compensation_version_count)
  const currentId = normalizeNullableString(row.current_version_id)

  return {
    ...mapMemberSummary(row),
    hasCurrentCompensation: Boolean(currentId),
    hasCompensationHistory: count > 0,
    compensationVersionCount: count,
    currentCompensationVersionId: currentId,
    currentCompensationEffectiveFrom: toPgDateString(row.current_effective_from),
    currentContractType: row.current_contract_type ? normalizeContractType(row.current_contract_type) : null,
    currentPayRegime: row.current_pay_regime === 'chile' || row.current_pay_regime === 'international' ? row.current_pay_regime : null,
    currentPayrollVia: row.current_payroll_via === 'deel' ? 'deel' : row.current_payroll_via === 'internal' ? 'internal' : null,
    currentScheduleRequired: row.current_daily_required,
    currentDeelContractId: normalizeNullableString(row.current_deel_contract_id),
    currentContractEndDate: toPgDateString(row.contract_end_date),
    currentCurrency: row.current_currency === 'CLP' || row.current_currency === 'USD' ? row.current_currency : null
  }
}

// ---------------------------------------------------------------------------
// Compensation queries
// ---------------------------------------------------------------------------

const COMPENSATION_BASE_SELECT = `
  SELECT
    cv.version_id,
    cv.member_id,
    m.display_name,
    m.primary_email,
    m.avatar_url,
    cv.version,
    cv.pay_regime,
    cv.currency,
    cv.base_salary,
    cv.remote_allowance,
    cv.colacion_amount,
    cv.movilizacion_amount,
    cv.fixed_bonus_label,
    cv.fixed_bonus_amount,
    cv.bonus_otd_min,
    cv.bonus_otd_max,
    cv.bonus_rpa_min,
    cv.bonus_rpa_max,
    cv.gratificacion_legal_mode,
    cv.afp_name,
    cv.afp_rate,
    cv.afp_cotizacion_rate,
    cv.afp_comision_rate,
    cv.health_system,
    cv.health_plan_uf,
    cv.unemployment_rate,
    cv.contract_type,
    m.payroll_via,
    m.deel_contract_id,
    m.daily_required,
    cv.has_apv,
    cv.apv_amount,
    cv.effective_from,
    cv.effective_to,
    cv.is_current,
    cv.change_reason,
    cv.desired_net_clp,
    cv.created_by_user_id,
    cv.created_at
  FROM greenhouse_payroll.compensation_versions AS cv
  INNER JOIN greenhouse_core.members AS m ON m.member_id = cv.member_id
`

const resolveMemberContractForCompensation = async ({
  memberId,
  contractType,
  scheduleRequired,
  deelContractId,
  client
}: {
  memberId: string
  contractType?: CreateCompensationVersionInput['contractType']
  scheduleRequired?: CreateCompensationVersionInput['scheduleRequired']
  deelContractId?: CreateCompensationVersionInput['deelContractId']
  client: PoolClient
}) => {
  const [member] = await queryRows<{
    contract_type: string | null
    pay_regime: string | null
    payroll_via: string | null
    daily_required: boolean | null
    deel_contract_id: string | null
  }>(
    `
      SELECT contract_type, pay_regime, payroll_via, daily_required, deel_contract_id
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId],
    client
  )

  if (!member) {
    throw new PayrollValidationError('Member not found.', 404, { memberId })
  }

  const resolvedContractType = contractType ?? normalizeContractType(member.contract_type)
  const derivation = CONTRACT_DERIVATIONS[resolvedContractType]

  const resolvedScheduleRequired = resolveScheduleRequired({
    contractType: resolvedContractType,
    scheduleRequired: scheduleRequired ?? member.daily_required
  })

  const resolvedDeelContractId = normalizeNullableString(
    derivation.payrollVia === 'deel' ? (deelContractId ?? member.deel_contract_id) : null
  )

  if ((resolvedContractType === 'contractor' || resolvedContractType === 'eor') && !resolvedDeelContractId) {
    throw new PayrollValidationError('deelContractId is required for contractor and eor contracts.', 400, {
      memberId
    })
  }

  return {
    contractType: resolvedContractType,
    payRegime: derivation.payRegime,
    payrollVia: derivation.payrollVia,
    scheduleRequired: resolvedScheduleRequired,
    deelContractId: resolvedDeelContractId
  }
}

const syncMemberContractForCompensation = async ({
  memberId,
  contractType,
  payRegime,
  payrollVia,
  scheduleRequired,
  deelContractId,
  client
}: {
  memberId: string
  contractType: CompensationVersion['contractType']
  payRegime: CompensationVersion['payRegime']
  payrollVia: CompensationVersion['payrollVia']
  scheduleRequired: CompensationVersion['scheduleRequired']
  deelContractId: CompensationVersion['deelContractId']
  client: PoolClient
}) => {
  await client.query(
    `
      UPDATE greenhouse_core.members
      SET
        contract_type = $1,
        pay_regime = $2,
        payroll_via = $3,
        daily_required = $4,
        deel_contract_id = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $6
    `,
    [contractType, payRegime, payrollVia, scheduleRequired, deelContractId, memberId]
  )
}

export const pgGetCurrentCompensation = async () => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgCompensationRow>(
    `
      ${COMPENSATION_BASE_SELECT}
      WHERE m.active = TRUE
        AND cv.effective_from <= CURRENT_DATE
        AND (cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE)
      ORDER BY m.display_name ASC
    `
  )

  return rows.map(mapCompensationVersion)
}

export const pgGetCompensationHistoryByMember = async (memberId: string) => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgCompensationRow>(
    `
      ${COMPENSATION_BASE_SELECT}
      WHERE cv.member_id = $1
      ORDER BY cv.effective_from DESC, cv.version DESC
    `,
    [memberId]
  )

  return rows.map(mapCompensationVersion)
}

export const pgGetCompensationVersionById = async (versionId: string) => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<PgCompensationRow>(
    `
      ${COMPENSATION_BASE_SELECT}
      WHERE cv.version_id = $1
      LIMIT 1
    `,
    [versionId]
  )

  return row ? mapCompensationVersion(row) : null
}

export const pgGetApplicableCompensationVersionsForPeriod = async (periodStart: string, periodEnd: string) => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgCompensationRow & { active: boolean }>(
    `
      SELECT DISTINCT ON (m.member_id)
        cv.version_id,
        m.member_id,
        m.display_name,
        m.primary_email,
        m.avatar_url,
        cv.version,
        cv.pay_regime,
        cv.currency,
        cv.base_salary,
        cv.remote_allowance,
        cv.colacion_amount,
        cv.movilizacion_amount,
        cv.fixed_bonus_label,
        cv.fixed_bonus_amount,
        cv.bonus_otd_min,
        cv.bonus_otd_max,
        cv.bonus_rpa_min,
        cv.bonus_rpa_max,
        cv.gratificacion_legal_mode,
        cv.afp_name,
        cv.afp_rate,
        cv.afp_cotizacion_rate,
        cv.afp_comision_rate,
        cv.health_system,
        cv.health_plan_uf,
        cv.unemployment_rate,
        cv.contract_type,
        m.payroll_via,
        m.deel_contract_id,
        m.daily_required,
        cv.has_apv,
        cv.apv_amount,
        cv.effective_from,
        cv.effective_to,
        cv.is_current,
        cv.change_reason,
        cv.created_by_user_id,
        cv.created_at,
        m.active
      FROM greenhouse_core.members AS m
      LEFT JOIN greenhouse_payroll.compensation_versions AS cv
        ON cv.member_id = m.member_id
       AND cv.effective_from <= $2::date
       AND (cv.effective_to IS NULL OR cv.effective_to >= $1::date)
          WHERE m.active = TRUE
      ORDER BY m.member_id, cv.effective_from DESC, cv.version DESC
    `,
    [periodStart, periodEnd]
  )

  return rows.map(row => ({
    ...mapCompensationVersion(row),
    hasCompensationVersion: Boolean(row.version_id)
  }))
}

export const pgCreateCompensationVersion = async ({
  input,
  actorEmail
}: {
  input: CreateCompensationVersionInput
  actorEmail: string | null
}) => {
  await assertPayrollPostgresReady()

  // Validate input
  if (!normalizeString(input.memberId)) {
    throw new PayrollValidationError('memberId is required.')
  }

  if (!normalizeString(input.changeReason)) {
    throw new PayrollValidationError('changeReason is required.')
  }

  const effectiveFrom = assertPayrollDateString(input.effectiveFrom, 'effectiveFrom')

  parsePayrollNumber(input.baseSalary, 'baseSalary', { min: 0 })
  parsePayrollNumber(input.remoteAllowance ?? 0, 'remoteAllowance', { min: 0 })
  parsePayrollNumber(input.colacionAmount ?? 0, 'colacionAmount', { min: 0 })
  parsePayrollNumber(input.movilizacionAmount ?? 0, 'movilizacionAmount', { min: 0 })
  parsePayrollNumber(input.fixedBonusAmount ?? 0, 'fixedBonusAmount', { min: 0 })
  parsePayrollNumber(input.bonusOtdMin ?? 0, 'bonusOtdMin', { min: 0 })
  parsePayrollNumber(input.bonusOtdMax ?? 0, 'bonusOtdMax', { min: 0 })
  parsePayrollNumber(input.bonusRpaMin ?? 0, 'bonusRpaMin', { min: 0 })
  parsePayrollNumber(input.bonusRpaMax ?? 0, 'bonusRpaMax', { min: 0 })
  parsePayrollNumber(input.apvAmount ?? 0, 'apvAmount', { min: 0 })

  if (input.afpRate !== undefined && input.afpRate !== null) {
    parsePayrollNumber(input.afpRate, 'afpRate', { min: 0, max: 1 })
  }

  if (input.afpCotizacionRate !== undefined && input.afpCotizacionRate !== null) {
    parsePayrollNumber(input.afpCotizacionRate, 'afpCotizacionRate', { min: 0, max: 1 })
  }

  if (input.afpComisionRate !== undefined && input.afpComisionRate !== null) {
    parsePayrollNumber(input.afpComisionRate, 'afpComisionRate', { min: 0, max: 1 })
  }

  if (input.healthPlanUf !== undefined && input.healthPlanUf !== null) {
    parsePayrollNumber(input.healthPlanUf, 'healthPlanUf', { min: 0 })
  }

  if (input.unemploymentRate !== undefined && input.unemploymentRate !== null) {
    parsePayrollNumber(input.unemploymentRate, 'unemploymentRate', { min: 0, max: 1 })
  }

  if (Number(input.bonusOtdMax ?? 0) < Number(input.bonusOtdMin ?? 0)) {
    throw new PayrollValidationError('bonusOtdMax must be greater than or equal to bonusOtdMin.')
  }

  if (Number(input.bonusRpaMax ?? 0) < Number(input.bonusRpaMin ?? 0)) {
    throw new PayrollValidationError('bonusRpaMax must be greater than or equal to bonusRpaMin.')
  }

  return withGreenhousePostgresTransaction(async (client) => {
    // Validate member exists
    const memberRows = await queryRows<{ member_id: string }>(
      `SELECT member_id FROM greenhouse_core.members WHERE member_id = $1 AND active = TRUE LIMIT 1`,
      [input.memberId],
      client
    )

    if (memberRows.length === 0) {
      throw new PayrollValidationError('Active team member not found for compensation version.', 404)
    }

    // Resolve actor user_id from email
    let actorUserId: string | null = null

    if (actorEmail) {
      const [actorRow] = await queryRows<{ user_id: string }>(
        `SELECT user_id FROM greenhouse_core.client_users WHERE email = $1 LIMIT 1`,
        [actorEmail],
        client
      )

      actorUserId = actorRow?.user_id ?? null
    }

    const memberContract = await resolveMemberContractForCompensation({
      memberId: input.memberId,
      contractType: input.contractType,
      scheduleRequired: input.scheduleRequired,
      deelContractId: input.deelContractId,
      client
    })

    // Get next version number
    const [versionRow] = await queryRows<{ next_version: number | string }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM greenhouse_payroll.compensation_versions WHERE member_id = $1`,
      [input.memberId],
      client
    )

    const nextVersion = toNumber(versionRow?.next_version)
    const versionId = `${input.memberId}_v${nextVersion}`

    // Check for duplicate effective_from
    const [duplicate] = await queryRows<{ version_id: string }>(
      `SELECT version_id FROM greenhouse_payroll.compensation_versions WHERE member_id = $1 AND effective_from = $2::date LIMIT 1`,
      [input.memberId, effectiveFrom],
      client
    )

    if (duplicate) {
      throw new PayrollValidationError('A compensation version already exists for that effectiveFrom date.', 409, {
        versionId: duplicate.version_id
      })
    }

    // Find covering version to close
    const [coveringVersion] = await queryRows<{ version_id: string; effective_from: string | Date }>(
      `
        SELECT version_id, effective_from
        FROM greenhouse_payroll.compensation_versions
        WHERE member_id = $1
          AND effective_from <= $2::date
          AND (effective_to IS NULL OR effective_to >= $2::date)
        ORDER BY effective_from DESC, version DESC
        LIMIT 1
      `,
      [input.memberId, effectiveFrom],
      client
    )

    // Find next scheduled version
    const [nextScheduled] = await queryRows<{ version_id: string; effective_from: string | Date }>(
      `
        SELECT version_id, effective_from
        FROM greenhouse_payroll.compensation_versions
        WHERE member_id = $1
          AND effective_from > $2::date
        ORDER BY effective_from ASC, version ASC
        LIMIT 1
      `,
      [input.memberId, effectiveFrom],
      client
    )

    const nextScheduledFrom = toPgDateString(nextScheduled?.effective_from ?? null)

    const nextEffectiveTo =
      nextScheduledFrom && nextScheduledFrom > effectiveFrom
        ? addDaysToDateString(nextScheduledFrom, -1)
        : null

    const today = getCurrentDateString()
    const isCurrent = effectiveFrom <= today && (!nextScheduledFrom || nextScheduledFrom > today)

    const resolvedAfpSplitRates = resolveChileAfpSplitRates({
      totalRate: input.afpRate ?? null,
      cotizacionRate: input.afpCotizacionRate ?? null,
      comisionRate: input.afpComisionRate ?? null
    })

    const resolvedRemoteAllowance = contractAllowsRemoteAllowance(memberContract.contractType)
      ? Number(input.remoteAllowance ?? 0)
      : 0

    await syncMemberContractForCompensation({
      memberId: input.memberId,
      contractType: memberContract.contractType,
      payRegime: memberContract.payRegime,
      payrollVia: memberContract.payrollVia,
      scheduleRequired: memberContract.scheduleRequired,
      deelContractId: memberContract.deelContractId,
      client
    })

    // Close covering version
    if (coveringVersion) {
      await client.query(
        `
          UPDATE greenhouse_payroll.compensation_versions
          SET effective_to = ($1::date - INTERVAL '1 day')::date,
              is_current = CASE WHEN $1::date <= CURRENT_DATE THEN FALSE ELSE is_current END
          WHERE version_id = $2
        `,
        [effectiveFrom, coveringVersion.version_id]
      )
    }

    // Insert new version
    await client.query(
      `
        INSERT INTO greenhouse_payroll.compensation_versions (
          version_id, member_id, version, pay_regime, currency,
          base_salary, remote_allowance, colacion_amount, movilizacion_amount, fixed_bonus_label, fixed_bonus_amount,
          bonus_otd_min, bonus_otd_max, bonus_rpa_min, bonus_rpa_max, gratificacion_legal_mode,
          afp_name, afp_rate, afp_cotizacion_rate, afp_comision_rate, health_system, health_plan_uf,
          unemployment_rate, contract_type, has_apv, apv_amount,
          effective_from, effective_to, is_current,
          change_reason, desired_net_clp, created_by_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27::date, $28, $29,
          $30, $31, $32
        )
      `,
      [
        versionId, input.memberId, nextVersion, memberContract.payRegime, input.currency,
        Number(input.baseSalary), resolvedRemoteAllowance, Number(input.colacionAmount ?? 0), Number(input.movilizacionAmount ?? 0),
        normalizeNullableString(input.fixedBonusLabel), Number(input.fixedBonusAmount ?? 0),
        Number(input.bonusOtdMin ?? 0), Number(input.bonusOtdMax ?? 0),
        Number(input.bonusRpaMin ?? 0), Number(input.bonusRpaMax ?? 0),
        normalizeGratificacionLegalMode(input.gratificacionLegalMode, memberContract.payRegime),
        normalizeNullableString(input.afpName), input.afpRate ?? null,
        resolvedAfpSplitRates?.cotizacionRate ?? null,
        resolvedAfpSplitRates?.comisionRate ?? null,
        input.healthSystem ?? null, input.healthPlanUf ?? null,
        input.unemploymentRate ?? (memberContract.contractType === 'plazo_fijo' ? 0.03 : 0.006),
        memberContract.contractType, Boolean(input.hasApv), Number(input.apvAmount ?? 0),
        effectiveFrom, nextEffectiveTo, isCurrent,
        input.changeReason.trim(), input.desiredNetClp ?? null, actorUserId
      ]
    )

    // Outbox event
    await publishPayrollOutboxEvent({
      eventType: 'compensation_version.created',
      aggregateType: 'compensation_version',
      aggregateId: versionId,
      payload: {
        versionId,
        memberId: input.memberId,
        effectiveFrom,
        payRegime: memberContract.payRegime,
        currency: input.currency,
        baseSalary: Number(input.baseSalary)
      },
      client
    })

    return versionId
  })
}

export const pgUpdateCompensationVersion = async ({
  versionId,
  input,
  actorEmail
}: {
  versionId: string
  input: UpdateCompensationVersionInput
  actorEmail: string | null
}) => {
  await assertPayrollPostgresReady()

  if (!normalizeString(versionId)) {
    throw new PayrollValidationError('versionId is required.')
  }

  if (!normalizeString(input.changeReason)) {
    throw new PayrollValidationError('changeReason is required.')
  }

  const effectiveFrom = assertPayrollDateString(input.effectiveFrom, 'effectiveFrom')

  parsePayrollNumber(input.baseSalary, 'baseSalary', { min: 0 })
  parsePayrollNumber(input.remoteAllowance ?? 0, 'remoteAllowance', { min: 0 })
  parsePayrollNumber(input.colacionAmount ?? 0, 'colacionAmount', { min: 0 })
  parsePayrollNumber(input.movilizacionAmount ?? 0, 'movilizacionAmount', { min: 0 })
  parsePayrollNumber(input.fixedBonusAmount ?? 0, 'fixedBonusAmount', { min: 0 })
  parsePayrollNumber(input.bonusOtdMin ?? 0, 'bonusOtdMin', { min: 0 })
  parsePayrollNumber(input.bonusOtdMax ?? 0, 'bonusOtdMax', { min: 0 })
  parsePayrollNumber(input.bonusRpaMin ?? 0, 'bonusRpaMin', { min: 0 })
  parsePayrollNumber(input.bonusRpaMax ?? 0, 'bonusRpaMax', { min: 0 })
  parsePayrollNumber(input.apvAmount ?? 0, 'apvAmount', { min: 0 })

  if (input.afpRate !== undefined && input.afpRate !== null) {
    parsePayrollNumber(input.afpRate, 'afpRate', { min: 0, max: 1 })
  }

  if (input.afpCotizacionRate !== undefined && input.afpCotizacionRate !== null) {
    parsePayrollNumber(input.afpCotizacionRate, 'afpCotizacionRate', { min: 0, max: 1 })
  }

  if (input.afpComisionRate !== undefined && input.afpComisionRate !== null) {
    parsePayrollNumber(input.afpComisionRate, 'afpComisionRate', { min: 0, max: 1 })
  }

  if (input.healthPlanUf !== undefined && input.healthPlanUf !== null) {
    parsePayrollNumber(input.healthPlanUf, 'healthPlanUf', { min: 0 })
  }

  if (input.unemploymentRate !== undefined && input.unemploymentRate !== null) {
    parsePayrollNumber(input.unemploymentRate, 'unemploymentRate', { min: 0, max: 1 })
  }

  if (Number(input.bonusOtdMax ?? 0) < Number(input.bonusOtdMin ?? 0)) {
    throw new PayrollValidationError('bonusOtdMax must be greater than or equal to bonusOtdMin.')
  }

  if (Number(input.bonusRpaMax ?? 0) < Number(input.bonusRpaMin ?? 0)) {
    throw new PayrollValidationError('bonusRpaMax must be greater than or equal to bonusRpaMin.')
  }

  const resolvedAfpSplitRates = resolveChileAfpSplitRates({
    totalRate: input.afpRate ?? null,
    cotizacionRate: input.afpCotizacionRate ?? null,
    comisionRate: input.afpComisionRate ?? null
  })

  return withGreenhousePostgresTransaction(async client => {
    const [versionRow] = await queryRows<PgCompensationRow>(
      `
        ${COMPENSATION_BASE_SELECT}
        WHERE cv.version_id = $1
        LIMIT 1
      `,
      [versionId],
      client
    )

    if (!versionRow) {
      throw new PayrollValidationError('Compensation version not found.', 404)
    }

    const existingVersion = mapCompensationVersion(versionRow)

    const memberContract = await resolveMemberContractForCompensation({
      memberId: existingVersion.memberId,
      contractType: input.contractType,
      scheduleRequired: input.scheduleRequired,
      deelContractId: input.deelContractId,
      client
    })

    const resolvedRemoteAllowance = contractAllowsRemoteAllowance(memberContract.contractType)
      ? Number(input.remoteAllowance ?? 0)
      : 0

    if (existingVersion.effectiveFrom !== effectiveFrom) {
      throw new PayrollValidationError(
        'Changing the effective date requires creating a new compensation version.',
        409,
        { versionId }
      )
    }

    const usedStatuses = await queryRows<{ status: string | null }>(
      `
        SELECT DISTINCT p.status
        FROM greenhouse_payroll.payroll_entries AS e
        INNER JOIN greenhouse_payroll.payroll_periods AS p
          ON p.period_id = e.period_id
        WHERE e.compensation_version_id = $1
      `,
      [versionId],
      client
    )

    if (
      isCompensationVersionLockedByPayroll(
        usedStatuses.map(row =>
          row.status === 'approved' || row.status === 'exported' || row.status === 'calculated'
            ? row.status
            : 'draft'
        )
      )
    ) {
      throw new PayrollValidationError(
        getCompensationVersionLockedMessage(),
        409,
        { versionId }
      )
    }

    await syncMemberContractForCompensation({
      memberId: existingVersion.memberId,
      contractType: memberContract.contractType,
      payRegime: memberContract.payRegime,
      payrollVia: memberContract.payrollVia,
      scheduleRequired: memberContract.scheduleRequired,
      deelContractId: memberContract.deelContractId,
      client
    })

    await client.query(
      `
        UPDATE greenhouse_payroll.compensation_versions
        SET
          pay_regime = $1,
          currency = $2,
          base_salary = $3,
          remote_allowance = $4,
          colacion_amount = $5,
          movilizacion_amount = $6,
          fixed_bonus_label = $7,
          fixed_bonus_amount = $8,
          bonus_otd_min = $9,
          bonus_otd_max = $10,
          bonus_rpa_min = $11,
          bonus_rpa_max = $12,
          gratificacion_legal_mode = $13,
          afp_name = $14,
          afp_rate = $15,
          afp_cotizacion_rate = $16,
          afp_comision_rate = $17,
          health_system = $18,
          health_plan_uf = $19,
          unemployment_rate = $20,
          contract_type = $21,
          has_apv = $22,
          apv_amount = $23,
          change_reason = $24,
          desired_net_clp = $25
        WHERE version_id = $26
      `,
      [
        memberContract.payRegime,
        input.currency,
        Number(input.baseSalary),
        resolvedRemoteAllowance,
        Number(input.colacionAmount ?? 0),
        Number(input.movilizacionAmount ?? 0),
        normalizeNullableString(input.fixedBonusLabel),
        Number(input.fixedBonusAmount ?? 0),
        Number(input.bonusOtdMin ?? 0),
        Number(input.bonusOtdMax ?? 0),
        Number(input.bonusRpaMin ?? 0),
        Number(input.bonusRpaMax ?? 0),
        normalizeGratificacionLegalMode(input.gratificacionLegalMode, memberContract.payRegime),
        normalizeNullableString(input.afpName),
        input.afpRate ?? null,
        resolvedAfpSplitRates?.cotizacionRate ?? null,
        resolvedAfpSplitRates?.comisionRate ?? null,
        input.healthSystem ?? null,
        input.healthPlanUf ?? null,
        input.unemploymentRate ?? (memberContract.contractType === 'plazo_fijo' ? 0.03 : 0.006),
        memberContract.contractType,
        Boolean(input.hasApv),
        Number(input.apvAmount ?? 0),
        input.changeReason.trim(),
        input.desiredNetClp ?? null,
        versionId
      ]
    )

    await publishPayrollOutboxEvent({
      eventType: 'compensation_version.updated',
      aggregateType: 'compensation_version',
      aggregateId: versionId,
      payload: {
        versionId,
        memberId: existingVersion.memberId,
        effectiveFrom,
        payRegime: memberContract.payRegime,
        currency: input.currency,
        baseSalary: Number(input.baseSalary),
        updatedBy: normalizeNullableString(actorEmail)
      },
      client
    })

    const [updatedRow] = await queryRows<PgCompensationRow>(
      `
        ${COMPENSATION_BASE_SELECT}
        WHERE cv.version_id = $1
        LIMIT 1
      `,
      [versionId],
      client
    )

    if (!updatedRow) {
      throw new PayrollValidationError('Unable to read updated compensation version.', 500)
    }

    return mapCompensationVersion(updatedRow)
  })
}

// ---------------------------------------------------------------------------
// Period queries
// ---------------------------------------------------------------------------

export const pgListPayrollPeriods = async () => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgPeriodRow>(
    `
      SELECT *
      FROM greenhouse_payroll.payroll_periods
      ORDER BY year DESC, month DESC
    `
  )

  return rows.map(mapPeriod)
}

export const pgGetPayrollPeriod = async (periodId: string) => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<PgPeriodRow>(
    `SELECT * FROM greenhouse_payroll.payroll_periods WHERE period_id = $1 LIMIT 1`,
    [periodId]
  )

  return row ? mapPeriod(row) : null
}

export const pgCreatePayrollPeriod = async (input: CreatePayrollPeriodInput) => {
  await assertPayrollPostgresReady()

  if (!Number.isInteger(input.year) || input.year < 2024) {
    throw new PayrollValidationError('year must be a valid integer.')
  }

  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new PayrollValidationError('month must be between 1 and 12.')
  }

  if (input.ufValue !== undefined && input.ufValue !== null && (!Number.isFinite(input.ufValue) || input.ufValue < 0)) {
    throw new PayrollValidationError('ufValue must be a non-negative number when provided.')
  }

  const periodId = buildPeriodId(input.year, input.month)
  const existing = await pgGetPayrollPeriod(periodId)

  const resolvedUfValue = await resolvePayrollPeriodUfValue({
    year: input.year,
    month: input.month,
    ufValue: input.ufValue
  })

  const normalizedTaxTableVersion = normalizeNullableString(input.taxTableVersion)

  const resolvedTaxTableVersion = await resolvePayrollTaxTableVersion({
    year: input.year,
    month: input.month,
    requestedVersion: normalizedTaxTableVersion
  })

  if (existing) {
    throw new PayrollValidationError('Payroll period already exists.', 409)
  }

  if (normalizedTaxTableVersion && !resolvedTaxTableVersion) {
    throw new PayrollValidationError(
      `taxTableVersion is not available for ${input.year}-${String(input.month).padStart(2, '0')}. Leave it empty to auto-resolve or sync Chile tax tables first.`
    )
  }

  return withGreenhousePostgresTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO greenhouse_payroll.payroll_periods (
          period_id, year, month, status, uf_value, tax_table_version, notes
        )
        VALUES ($1, $2, $3, 'draft', $4, $5, $6)
      `,
      [
        periodId, input.year, input.month,
        resolvedUfValue,
        resolvedTaxTableVersion,
        normalizeNullableString(input.notes)
      ]
    )

    await publishPayrollOutboxEvent({
      eventType: 'payroll_period.created',
      aggregateType: 'payroll_period',
      aggregateId: periodId,
      payload: { periodId, year: input.year, month: input.month },
      client
    })

    return periodId
  })
}

export const pgUpdatePayrollPeriod = async (periodId: string, input: UpdatePayrollPeriodInput) => {
  await assertPayrollPostgresReady()

  const current = await pgGetPayrollPeriod(periodId)

  if (!current) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (!canEditPayrollPeriodMetadata(current.status)) {
    throw new PayrollValidationError('Exported payroll periods cannot be updated.', 409)
  }

  const nextYear = input.year ?? current.year
  const nextMonth = input.month ?? current.month

  const nextUfValue = await resolvePayrollPeriodUfValue({
    year: nextYear,
    month: nextMonth,
    ufValue: input.ufValue === undefined ? current.ufValue : input.ufValue
  })

  const nextPeriodId = buildPeriodId(nextYear, nextMonth)
  const identityChanged = nextPeriodId !== current.periodId
  const currentCanonicalTaxTableVersion = buildPayrollTaxTableVersion(current.year, current.month)

  const shouldAutoMigrateTaxTable =
    input.taxTableVersion === undefined &&
    identityChanged &&
    (current.taxTableVersion == null || current.taxTableVersion === currentCanonicalTaxTableVersion)

  const requestedTaxTableVersion = normalizeNullableString(input.taxTableVersion)

  const nextTaxTableVersion =
    input.taxTableVersion !== undefined
      ? await resolvePayrollTaxTableVersion({
          year: nextYear,
          month: nextMonth,
          requestedVersion: requestedTaxTableVersion
        })
      : shouldAutoMigrateTaxTable
        ? await resolvePayrollTaxTableVersion({
            year: nextYear,
            month: nextMonth,
            requestedVersion: null
          })
        : current.taxTableVersion

  if (requestedTaxTableVersion && !nextTaxTableVersion) {
    throw new PayrollValidationError(
      `taxTableVersion is not available for ${nextYear}-${String(nextMonth).padStart(2, '0')}. Leave it empty to auto-resolve or sync Chile tax tables first.`
    )
  }

  const nextNotes = input.notes === undefined ? current.notes : normalizeNullableString(input.notes)

  if (!Number.isInteger(nextYear) || nextYear < 2024) {
    throw new PayrollValidationError('year must be a valid integer.')
  }

  if (!Number.isInteger(nextMonth) || nextMonth < 1 || nextMonth > 12) {
    throw new PayrollValidationError('month must be between 1 and 12.')
  }

  if (nextUfValue !== undefined && nextUfValue !== null && (!Number.isFinite(nextUfValue) || nextUfValue < 0)) {
    throw new PayrollValidationError('ufValue must be a non-negative number when provided.')
  }

    const requiresReset = doesPayrollPeriodUpdateRequireReset({
      currentYear: current.year,
      currentMonth: current.month,
      currentUfValue: current.ufValue,
    currentTaxTableVersion: current.taxTableVersion,
    nextYear,
    nextMonth,
    nextUfValue: nextUfValue ?? null,
      nextTaxTableVersion
    })

    const nextStatus = requiresReset ? 'draft' : current.status
    const nextCalculatedAt = requiresReset ? null : current.calculatedAt
    const nextCalculatedBy = requiresReset ? null : current.calculatedBy
    const nextApprovedAt = requiresReset ? null : current.approvedAt
    const nextApprovedBy = requiresReset ? null : current.approvedBy

    return withGreenhousePostgresTransaction(async client => {
      if (identityChanged) {
        const [existing] = await queryRows<{ period_id: string }>(
        `
          SELECT period_id
          FROM greenhouse_payroll.payroll_periods
          WHERE period_id = $1
          LIMIT 1
        `,
        [nextPeriodId],
        client
      )

      if (existing) {
        throw new PayrollValidationError('Payroll period already exists.', 409)
      }
    }

    if (requiresReset) {
      await client.query(
        `
          DELETE FROM greenhouse_payroll.payroll_entries
          WHERE period_id = $1
        `,
        [periodId]
      )
    }

    await client.query(
      `
        UPDATE greenhouse_payroll.payroll_periods
        SET
          period_id = $1,
          year = $2,
          month = $3,
          status = $4,
          calculated_at = $5,
          calculated_by_user_id = $6,
          approved_at = $7,
          approved_by_user_id = $8,
          uf_value = $9,
          tax_table_version = $10,
          notes = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE period_id = $12
      `,
      [
        nextPeriodId,
        nextYear,
        nextMonth,
        nextStatus,
        nextCalculatedAt,
        nextCalculatedBy,
        nextApprovedAt,
        nextApprovedBy,
        nextUfValue ?? null,
        nextTaxTableVersion,
        nextNotes,
        periodId
      ]
    )

    const [updatedRow] = await queryRows<PgPeriodRow>(
      `
        SELECT *
        FROM greenhouse_payroll.payroll_periods
        WHERE period_id = $1
        LIMIT 1
      `,
      [nextPeriodId],
      client
    )

    const updated = updatedRow ? mapPeriod(updatedRow) : null

    if (!updated) {
      throw new PayrollValidationError('Unable to read updated payroll period.', 500)
    }

    await publishPayrollOutboxEvent({
      eventType: 'payroll_period.updated',
      aggregateType: 'payroll_period',
      aggregateId: updated.periodId,
      payload: {
        periodId: updated.periodId,
        previousPeriodId: periodId,
        year: updated.year,
        month: updated.month,
        status: updated.status
      },
      client
    })

    return updated
  })
}

export const pgSetPeriodCalculated = async (periodId: string, actorEmail: string | null) => {
  await assertPayrollPostgresReady()

  let actorUserId: string | null = null

  if (actorEmail) {
    const [actorRow] = await runGreenhousePostgresQuery<{ user_id: string }>(
      `SELECT user_id FROM greenhouse_core.client_users WHERE email = $1 LIMIT 1`,
      [actorEmail]
    )

    actorUserId = actorRow?.user_id ?? null
  }

  await withGreenhousePostgresTransaction(async client => {
    const current = await queryRows<PgPeriodRow>(
      `
        SELECT *
        FROM greenhouse_payroll.payroll_periods
        WHERE period_id = $1
        LIMIT 1
      `,
      [periodId],
      client
    )

    const currentPeriod = current[0] ? mapPeriod(current[0]) : null

    if (!currentPeriod) {
      throw new PayrollValidationError('Payroll period not found.', 404)
    }

    if (!canSetPayrollPeriodCalculated(currentPeriod.status)) {
      throw new PayrollValidationError(
        'Payroll periods can only be calculated from draft, calculated, approved, or reopened states.',
        409
      )
    }

    const result = await client.query<PgPeriodRow>(
      `
        UPDATE greenhouse_payroll.payroll_periods
        SET
          status = 'calculated',
          calculated_at = CURRENT_TIMESTAMP,
          calculated_by_user_id = $1,
          approved_at = NULL,
          approved_by_user_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE period_id = $2
        RETURNING *
      `,
      [actorUserId, periodId]
    )

    const updated = result.rows[0] ? mapPeriod(result.rows[0]) : null

    if (!updated) {
      throw new PayrollValidationError('Payroll period not found.', 404)
    }

    await publishPayrollOutboxEvent({
      eventType: 'payroll_period.calculated',
      aggregateType: 'payroll_period',
      aggregateId: updated.periodId,
      payload: {
        periodId: updated.periodId,
        year: updated.year,
        month: updated.month,
        status: updated.status
      },
      client
    })
  })
}

export const pgSetPeriodApproved = async (periodId: string, actorEmail: string | null) => {
  await assertPayrollPostgresReady()

  let actorUserId: string | null = null

  if (actorEmail) {
    const [actorRow] = await runGreenhousePostgresQuery<{ user_id: string }>(
      `SELECT user_id FROM greenhouse_core.client_users WHERE email = $1 LIMIT 1`,
      [actorEmail]
    )

    actorUserId = actorRow?.user_id ?? null
  }

  await withGreenhousePostgresTransaction(async client => {
    const current = await queryRows<PgPeriodRow>(
      `
        SELECT *
        FROM greenhouse_payroll.payroll_periods
        WHERE period_id = $1
        LIMIT 1
      `,
      [periodId],
      client
    )

    const currentPeriod = current[0] ? mapPeriod(current[0]) : null

    if (!currentPeriod) {
      throw new PayrollValidationError('Payroll period not found.', 404)
    }

    if (!canSetPayrollPeriodApproved(currentPeriod.status)) {
      throw new PayrollValidationError('Only calculated payroll periods can be approved.', 409)
    }

    const result = await client.query<PgPeriodRow>(
      `
        UPDATE greenhouse_payroll.payroll_periods
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by_user_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE period_id = $2
        RETURNING *
      `,
      [actorUserId, periodId]
    )

    const updated = result.rows[0] ? mapPeriod(result.rows[0]) : null

    if (!updated) {
      throw new PayrollValidationError('Payroll period not found.', 404)
    }

    await publishPayrollOutboxEvent({
      eventType: 'payroll_period.approved',
      aggregateType: 'payroll_period',
      aggregateId: updated.periodId,
      payload: {
        periodId: updated.periodId,
        year: updated.year,
        month: updated.month,
        status: updated.status
      },
      client
    })
  })
}

export const pgSetPeriodExported = async (periodId: string) => {
  await assertPayrollPostgresReady()

  await withGreenhousePostgresTransaction(async client => {
    const current = await queryRows<PgPeriodRow>(
      `
        SELECT *
        FROM greenhouse_payroll.payroll_periods
        WHERE period_id = $1
        LIMIT 1
      `,
      [periodId],
      client
    )

    const currentPeriod = current[0] ? mapPeriod(current[0]) : null

    if (!currentPeriod) {
      throw new PayrollValidationError('Payroll period not found.', 404)
    }

    if (!canSetPayrollPeriodExported(currentPeriod.status)) {
      throw new PayrollValidationError('Only approved payroll periods can be exported.', 409)
    }

    const result = await client.query<PgPeriodRow>(
      `
        UPDATE greenhouse_payroll.payroll_periods
        SET
          status = 'exported',
          exported_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE period_id = $1
          AND status = 'approved'
        RETURNING *
      `,
      [periodId]
    )

    const updated = result.rows[0] ? mapPeriod(result.rows[0]) : null

    if (!updated) {
      return
    }

    await publishPayrollOutboxEvent({
      eventType: 'payroll_period.exported',
      aggregateType: 'payroll_period',
      aggregateId: updated.periodId,
      payload: {
        periodId: updated.periodId,
        year: updated.year,
        month: updated.month,
        status: updated.status
      },
      client
    })
  })
}

// ---------------------------------------------------------------------------
// Entry queries
// ---------------------------------------------------------------------------

const ENTRY_BASE_SELECT = `
  SELECT
    e.entry_id,
    e.period_id,
    e.member_id,
    m.display_name,
    m.primary_email,
    m.avatar_url,
    e.compensation_version_id,
    e.pay_regime,
    e.payroll_via,
    e.deel_contract_id,
    e.currency,
    e.base_salary,
    e.remote_allowance,
    e.colacion_amount,
    e.movilizacion_amount,
    e.fixed_bonus_label,
    e.fixed_bonus_amount,
    e.member_display_name,
    e.kpi_otd_percent,
    e.kpi_rpa_avg,
    e.kpi_otd_qualifies,
    e.kpi_rpa_qualifies,
    e.kpi_tasks_completed,
    e.kpi_data_source,
    e.bonus_otd_amount,
    e.bonus_rpa_amount,
    e.bonus_other_amount,
    e.bonus_other_description,
    e.gross_total,
    cv.bonus_otd_min,
    cv.bonus_otd_max,
    cv.bonus_rpa_min,
    cv.bonus_rpa_max,
    e.chile_afp_name,
    e.chile_afp_rate,
    e.chile_afp_amount,
    e.chile_afp_cotizacion_amount,
    e.chile_afp_comision_amount,
    e.chile_gratificacion_legal,
    e.chile_colacion_amount,
    e.chile_movilizacion_amount,
    e.chile_health_system,
    e.chile_health_amount,
    e.chile_health_obligatoria_amount,
    e.chile_health_voluntaria_amount,
    e.chile_employer_sis_amount,
    e.chile_employer_cesantia_amount,
    e.chile_employer_mutual_amount,
    e.chile_employer_total_cost,
    e.chile_unemployment_rate,
    e.chile_unemployment_amount,
    e.chile_taxable_base,
    e.chile_tax_amount,
    e.sii_retention_rate,
    e.sii_retention_amount,
    e.chile_apv_amount,
    e.chile_uf_value,
    e.chile_total_deductions,
    e.net_total_calculated,
    e.net_total_override,
    e.net_total,
    e.manual_override,
    e.manual_override_note,
    e.bonus_otd_proration_factor,
    e.bonus_rpa_proration_factor,
    e.working_days_in_period,
    e.days_present,
    e.days_absent,
    e.days_on_leave,
    e.days_on_unpaid_leave,
    e.adjusted_base_salary,
    e.adjusted_remote_allowance,
    e.adjusted_colacion_amount,
    e.adjusted_movilizacion_amount,
    e.adjusted_fixed_bonus_amount,
    e.version,
    e.is_active,
    e.superseded_by,
    e.reopen_audit_id,
    e.created_at,
    e.updated_at
  FROM greenhouse_payroll.payroll_entries AS e
  INNER JOIN greenhouse_core.members AS m ON m.member_id = e.member_id
  LEFT JOIN greenhouse_payroll.compensation_versions AS cv ON cv.version_id = e.compensation_version_id
`

// TASK-410 — list endpoints return only active versions. Reliquidated v1
// rows (is_active=false) stay in the DB for audit/history but should not
// appear in the default period or member listings.
export const pgGetPayrollEntries = async (periodId: string) => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgEntryRow>(
    `
      ${ENTRY_BASE_SELECT}
      WHERE e.period_id = $1
        AND e.is_active = TRUE
      ORDER BY m.display_name ASC
    `,
    [periodId]
  )

  return rows.map(mapEntry)
}

// TASK-410 — entry-by-id stays version-agnostic because admin surfaces
// (history drawer, audit view) need to look up superseded v1 rows by their
// original entry_id. Callers that only want the active version should use
// `pgGetActivePayrollEntryForMember` below.
export const pgGetPayrollEntryById = async (entryId: string) => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<PgEntryRow>(
    `
      ${ENTRY_BASE_SELECT}
      WHERE e.entry_id = $1
      LIMIT 1
    `,
    [entryId]
  )

  return row ? mapEntry(row) : null
}

// TASK-410 — resolves "the currently active entry for this period+member".
// Used by flows that want the authoritative current row regardless of which
// version it is (v1 original, or v2 post-reliquidation).
export const pgGetActivePayrollEntryForMember = async (
  periodId: string,
  memberId: string
) => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<PgEntryRow>(
    `
      ${ENTRY_BASE_SELECT}
      WHERE e.period_id = $1
        AND e.member_id = $2
        AND e.is_active = TRUE
      LIMIT 1
    `,
    [periodId, memberId]
  )

  return row ? mapEntry(row) : null
}

export const pgGetMemberPayrollEntries = async (memberId: string) => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgEntryRow>(
    `
      ${ENTRY_BASE_SELECT}
      INNER JOIN greenhouse_payroll.payroll_periods AS p ON p.period_id = e.period_id
      WHERE e.member_id = $1
        AND e.is_active = TRUE
        AND p.status IN ('approved', 'exported', 'reopened')
      ORDER BY p.year DESC, p.month DESC
    `,
    [memberId]
  )

  return rows.map(mapEntry)
}

// TASK-410 — metadata for every version of an entry (for admin history
// drawer). Reads only the columns needed by the UI (not the full entry) so
// the query stays cheap even on large periods.
export interface PayrollEntryVersionMetadata {
  entryId: string
  periodId: string
  memberId: string
  version: number
  isActive: boolean
  supersededBy: string | null
  reopenAuditId: string | null
  grossTotal: number
  netTotal: number
  createdAt: string | null
  updatedAt: string | null
}

export const pgGetPayrollEntryVersions = async (
  periodId: string,
  memberId: string
): Promise<PayrollEntryVersionMetadata[]> => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<{
    entry_id: string
    period_id: string
    member_id: string
    version: number | string
    is_active: boolean
    superseded_by: string | null
    reopen_audit_id: string | null
    gross_total: string | number
    net_total: string | number
    created_at: Date | string
    updated_at: Date | string
  }>(
    `
      SELECT entry_id, period_id, member_id, version, is_active, superseded_by,
             reopen_audit_id, gross_total, net_total, created_at, updated_at
      FROM greenhouse_payroll.payroll_entries
      WHERE period_id = $1
        AND member_id = $2
      ORDER BY version DESC, created_at DESC
    `,
    [periodId, memberId]
  )

  return rows.map(row => ({
    entryId: row.entry_id,
    periodId: row.period_id,
    memberId: row.member_id,
    version: Number(row.version ?? 1),
    isActive: Boolean(row.is_active),
    supersededBy: row.superseded_by ?? null,
    reopenAuditId: row.reopen_audit_id ?? null,
    grossTotal: Number(row.gross_total ?? 0),
    netTotal: Number(row.net_total ?? 0),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
  }))
}

// TASK-410 — supersede options allow the recalculate path to create a v2
// entry (linked to a reopen audit row) while still reusing the full INSERT
// statement for payroll_entries. When `supersede.version` is set, the INSERT
// writes the version/is_active/reopen_audit_id columns explicitly and the
// outbox event type is elevated to `payroll_entry.reliquidated`. Callers
// must pass a transaction-bound `client` so the mark-v1-inactive UPDATE
// and the v2 INSERT share the same transaction.
interface PgUpsertPayrollEntryOptions {
  client?: PoolClient
  supersede?: {
    version: number
    isActive: boolean
    reopenAuditId: string | null
    previousEntryId: string
    previousGrossTotal: number
    previousNetTotal: number
    deltaGross: number
    deltaNet: number
    auditReason: string
    operationalYear: number
    operationalMonth: number
  }
}

export const pgUpsertPayrollEntry = async (
  entry: PayrollEntry,
  options: PgUpsertPayrollEntryOptions = {}
) => {
  await assertPayrollPostgresReady()

  const runWithClient = async (client: PoolClient) => {
    // Get member display name for snapshot
    const [memberRow] = await queryRows<{ display_name: string | null }>(
      `SELECT display_name FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
      [entry.memberId],
      client
    )

    await client.query(
      `
        INSERT INTO greenhouse_payroll.payroll_entries (
          entry_id, period_id, member_id, compensation_version_id,
          pay_regime, payroll_via, deel_contract_id, currency, base_salary, remote_allowance, colacion_amount, movilizacion_amount, fixed_bonus_label, fixed_bonus_amount,
          member_display_name,
          kpi_otd_percent, kpi_rpa_avg, kpi_otd_qualifies, kpi_rpa_qualifies,
          kpi_tasks_completed, kpi_data_source,
          bonus_otd_amount, bonus_rpa_amount, bonus_other_amount, bonus_other_description,
          gross_total,
          chile_gratificacion_legal,
          chile_colacion_amount, chile_movilizacion_amount,
          chile_afp_name, chile_afp_rate, chile_afp_amount, chile_afp_cotizacion_amount, chile_afp_comision_amount,
          chile_health_system, chile_health_amount, chile_health_obligatoria_amount, chile_health_voluntaria_amount,
          chile_employer_sis_amount, chile_employer_cesantia_amount, chile_employer_mutual_amount, chile_employer_total_cost,
          chile_unemployment_rate, chile_unemployment_amount,
          chile_taxable_base, chile_tax_amount, sii_retention_rate, sii_retention_amount, chile_apv_amount, chile_uf_value,
          chile_total_deductions,
          net_total_calculated, net_total_override, net_total,
          manual_override, manual_override_note,
          bonus_otd_proration_factor, bonus_rpa_proration_factor,
          working_days_in_period, days_present, days_absent,
          days_on_leave, days_on_unpaid_leave,
          adjusted_base_salary, adjusted_remote_allowance, adjusted_colacion_amount, adjusted_movilizacion_amount, adjusted_fixed_bonus_amount
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15,
          $16, $17, $18, $19,
          $20, $21,
          $22, $23, $24, $25,
          $26,
          $27, $28, $29, $30,
          $31, $32, $33, $34,
          $35, $36,
          $37, $38,
          $39, $40, $41, $42,
          $43, $44, $45, $46,
          $47, $48, $49, $50,
          $51, $52, $53, $54,
          $55,
          $56, $57, $58,
          $59, $60,
          $61, $62, $63, $64, $65, $66, $67, $68
        )
        ON CONFLICT (entry_id) DO UPDATE SET
          period_id = EXCLUDED.period_id,
          member_id = EXCLUDED.member_id,
          compensation_version_id = EXCLUDED.compensation_version_id,
          pay_regime = EXCLUDED.pay_regime,
          payroll_via = EXCLUDED.payroll_via,
          deel_contract_id = EXCLUDED.deel_contract_id,
          currency = EXCLUDED.currency,
          base_salary = EXCLUDED.base_salary,
          remote_allowance = EXCLUDED.remote_allowance,
          colacion_amount = EXCLUDED.colacion_amount,
          movilizacion_amount = EXCLUDED.movilizacion_amount,
          fixed_bonus_label = EXCLUDED.fixed_bonus_label,
          fixed_bonus_amount = EXCLUDED.fixed_bonus_amount,
          member_display_name = EXCLUDED.member_display_name,
          kpi_otd_percent = EXCLUDED.kpi_otd_percent,
          kpi_rpa_avg = EXCLUDED.kpi_rpa_avg,
          kpi_otd_qualifies = EXCLUDED.kpi_otd_qualifies,
          kpi_rpa_qualifies = EXCLUDED.kpi_rpa_qualifies,
          kpi_tasks_completed = EXCLUDED.kpi_tasks_completed,
          kpi_data_source = EXCLUDED.kpi_data_source,
          bonus_otd_amount = EXCLUDED.bonus_otd_amount,
          bonus_rpa_amount = EXCLUDED.bonus_rpa_amount,
          bonus_other_amount = EXCLUDED.bonus_other_amount,
          bonus_other_description = EXCLUDED.bonus_other_description,
          gross_total = EXCLUDED.gross_total,
          chile_gratificacion_legal = EXCLUDED.chile_gratificacion_legal,
          chile_afp_name = EXCLUDED.chile_afp_name,
          chile_afp_rate = EXCLUDED.chile_afp_rate,
          chile_afp_amount = EXCLUDED.chile_afp_amount,
          chile_afp_cotizacion_amount = EXCLUDED.chile_afp_cotizacion_amount,
          chile_afp_comision_amount = EXCLUDED.chile_afp_comision_amount,
          chile_health_system = EXCLUDED.chile_health_system,
          chile_health_amount = EXCLUDED.chile_health_amount,
          chile_health_obligatoria_amount = EXCLUDED.chile_health_obligatoria_amount,
          chile_health_voluntaria_amount = EXCLUDED.chile_health_voluntaria_amount,
          chile_employer_sis_amount = EXCLUDED.chile_employer_sis_amount,
          chile_employer_cesantia_amount = EXCLUDED.chile_employer_cesantia_amount,
          chile_employer_mutual_amount = EXCLUDED.chile_employer_mutual_amount,
          chile_employer_total_cost = EXCLUDED.chile_employer_total_cost,
          chile_unemployment_rate = EXCLUDED.chile_unemployment_rate,
          chile_unemployment_amount = EXCLUDED.chile_unemployment_amount,
          chile_taxable_base = EXCLUDED.chile_taxable_base,
          chile_tax_amount = EXCLUDED.chile_tax_amount,
          sii_retention_rate = EXCLUDED.sii_retention_rate,
          sii_retention_amount = EXCLUDED.sii_retention_amount,
          chile_apv_amount = EXCLUDED.chile_apv_amount,
          chile_uf_value = EXCLUDED.chile_uf_value,
          chile_total_deductions = EXCLUDED.chile_total_deductions,
          net_total_calculated = EXCLUDED.net_total_calculated,
          net_total_override = EXCLUDED.net_total_override,
          net_total = EXCLUDED.net_total,
          manual_override = EXCLUDED.manual_override,
          manual_override_note = EXCLUDED.manual_override_note,
          bonus_otd_proration_factor = EXCLUDED.bonus_otd_proration_factor,
          bonus_rpa_proration_factor = EXCLUDED.bonus_rpa_proration_factor,
          working_days_in_period = EXCLUDED.working_days_in_period,
          days_present = EXCLUDED.days_present,
          days_absent = EXCLUDED.days_absent,
          days_on_leave = EXCLUDED.days_on_leave,
          days_on_unpaid_leave = EXCLUDED.days_on_unpaid_leave,
          adjusted_base_salary = EXCLUDED.adjusted_base_salary,
          adjusted_remote_allowance = EXCLUDED.adjusted_remote_allowance,
          adjusted_colacion_amount = EXCLUDED.adjusted_colacion_amount,
          adjusted_movilizacion_amount = EXCLUDED.adjusted_movilizacion_amount,
          adjusted_fixed_bonus_amount = EXCLUDED.adjusted_fixed_bonus_amount,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        entry.entryId, entry.periodId, entry.memberId, entry.compensationVersionId,
        entry.payRegime, entry.payrollVia, entry.deelContractId, entry.currency, entry.baseSalary, entry.remoteAllowance, entry.colacionAmount, entry.movilizacionAmount, entry.fixedBonusLabel, entry.fixedBonusAmount,
        memberRow?.display_name ?? entry.memberName,
        entry.kpiOtdPercent, entry.kpiRpaAvg, entry.kpiOtdQualifies, entry.kpiRpaQualifies,
        entry.kpiTasksCompleted, entry.kpiDataSource,
        entry.bonusOtdAmount, entry.bonusRpaAmount, entry.bonusOtherAmount, entry.bonusOtherDescription,
        entry.grossTotal,
        entry.chileGratificacionLegalAmount,
        entry.chileColacionAmount, entry.chileMovilizacionAmount,
        entry.chileAfpName, entry.chileAfpRate, entry.chileAfpAmount, entry.chileAfpCotizacionAmount, entry.chileAfpComisionAmount,
        entry.chileHealthSystem, entry.chileHealthAmount, entry.chileHealthObligatoriaAmount, entry.chileHealthVoluntariaAmount,
        entry.chileEmployerSisAmount, entry.chileEmployerCesantiaAmount, entry.chileEmployerMutualAmount, entry.chileEmployerTotalCost,
        entry.chileUnemploymentRate, entry.chileUnemploymentAmount,
        entry.chileTaxableBase, entry.chileTaxAmount, entry.siiRetentionRate, entry.siiRetentionAmount, entry.chileApvAmount, entry.chileUfValue,
        entry.chileTotalDeductions,
        entry.netTotalCalculated, entry.netTotalOverride, entry.netTotal,
        entry.manualOverride, entry.manualOverrideNote,
        entry.bonusOtdProrationFactor, entry.bonusRpaProrationFactor,
        entry.workingDaysInPeriod, entry.daysPresent, entry.daysAbsent,
        entry.daysOnLeave, entry.daysOnUnpaidLeave,
        entry.adjustedBaseSalary, entry.adjustedRemoteAllowance, entry.adjustedColacionAmount,
        entry.adjustedMovilizacionAmount, entry.adjustedFixedBonusAmount
      ]
    )

    // TASK-410 — when operating in supersede mode, explicitly set version /
    // is_active / reopen_audit_id on the newly inserted row. The caller is
    // responsible for having marked v1 as is_active=false in the same TX so
    // the partial unique index (period_id, member_id WHERE is_active) stays
    // satisfied at commit time.
    if (options.supersede) {
      await client.query(
        `
          UPDATE greenhouse_payroll.payroll_entries
          SET version = $2,
              is_active = $3,
              reopen_audit_id = $4
          WHERE entry_id = $1
        `,
        [
          entry.entryId,
          options.supersede.version,
          options.supersede.isActive,
          options.supersede.reopenAuditId
        ]
      )
    }

    // Emit the canonical upserted event for every write path so downstream
    // consumers (projections, person 360, cost attribution) still react.
    await publishPayrollOutboxEvent({
      eventType: 'payroll_entry.upserted',
      aggregateType: 'payroll_entry',
      aggregateId: entry.entryId,
      payload: {
        entryId: entry.entryId,
        periodId: entry.periodId,
        year: toFinitePeriodNumber(entry.periodId.split('-')[0]),
        month: toFinitePeriodNumber(entry.periodId.split('-')[1]),
        memberId: entry.memberId,
        netTotal: entry.netTotal,
        grossTotal: entry.grossTotal
      },
      client
    })

    // TASK-410 — in supersede mode, also emit the dedicated reliquidated
    // event so the finance delta consumer (TASK-411) can apply the delta
    // expense without double-counting. Delta=0 still emits for audit trail.
    if (options.supersede) {
      await publishPayrollOutboxEvent({
        eventType: 'payroll_entry.reliquidated',
        aggregateType: 'payroll_entry',
        aggregateId: entry.entryId,
        payload: {
          entryId: entry.entryId,
          periodId: entry.periodId,
          operationalYear: options.supersede.operationalYear,
          operationalMonth: options.supersede.operationalMonth,
          memberId: entry.memberId,
          version: options.supersede.version,
          previousVersion: options.supersede.version - 1,
          previousEntryId: options.supersede.previousEntryId,
          previousGrossTotal: options.supersede.previousGrossTotal,
          previousNetTotal: options.supersede.previousNetTotal,
          newGrossTotal: entry.grossTotal,
          newNetTotal: entry.netTotal,
          deltaGross: options.supersede.deltaGross,
          deltaNet: options.supersede.deltaNet,
          currency: entry.currency,
          reopenAuditId: options.supersede.reopenAuditId,
          reason: options.supersede.auditReason
        },
        client
      })
    }
  }

  if (options.client) {
    return runWithClient(options.client)
  }

  return withGreenhousePostgresTransaction(runWithClient)
}

export const pgDeleteStalePayrollEntries = async ({
  periodId,
  keepMemberIds
}: {
  periodId: string
  keepMemberIds: string[]
}) => {
  await assertPayrollPostgresReady()

  if (keepMemberIds.length === 0) {
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_payroll.payroll_entries WHERE period_id = $1`,
      [periodId]
    )

    return
  }

  await runGreenhousePostgresQuery(
    `
      DELETE FROM greenhouse_payroll.payroll_entries
      WHERE period_id = $1
        AND NOT (member_id = ANY($2::text[]))
    `,
    [periodId, keepMemberIds]
  )
}

// ---------------------------------------------------------------------------
// Member queries
// ---------------------------------------------------------------------------

export const pgGetPayrollMemberSummary = async (memberId: string): Promise<PayrollMemberSummary | null> => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<PgMemberRow>(
    `
      SELECT m.member_id, m.display_name, m.primary_email, m.avatar_url, m.active
      FROM greenhouse_core.members AS m
          WHERE m.member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  return row ? mapMemberSummary(row) : null
}

export const pgListPayrollCompensationMembers = async (): Promise<PayrollCompensationMember[]> => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgCompensationMemberRow>(
    `
      WITH compensation_counts AS (
        SELECT member_id, COUNT(*) AS compensation_version_count
        FROM greenhouse_payroll.compensation_versions
        GROUP BY member_id
      ),
      current_compensation AS (
        SELECT DISTINCT ON (cv.member_id)
          cv.member_id,
          cv.version_id AS current_version_id,
          cv.effective_from AS current_effective_from,
          cv.contract_type AS current_contract_type,
          cv.pay_regime AS current_pay_regime,
          m.payroll_via AS current_payroll_via,
          m.daily_required AS current_daily_required,
          m.deel_contract_id AS current_deel_contract_id,
          m.contract_end_date,
          cv.currency AS current_currency
        FROM greenhouse_payroll.compensation_versions AS cv
        INNER JOIN greenhouse_core.members AS m ON m.member_id = cv.member_id
        WHERE cv.effective_from <= CURRENT_DATE
          AND (cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE)
        ORDER BY cv.member_id, cv.effective_from DESC, cv.version DESC
      )
      SELECT
        m.member_id,
        m.display_name,
        m.primary_email,
        m.avatar_url,
        m.active,
        cc.compensation_version_count,
        cur.current_version_id,
        cur.current_effective_from,
        cur.current_contract_type,
        cur.current_pay_regime,
        cur.current_payroll_via,
        cur.current_daily_required,
        cur.current_deel_contract_id,
        cur.contract_end_date,
        cur.current_currency
      FROM greenhouse_core.members AS m
          LEFT JOIN compensation_counts AS cc ON cc.member_id = m.member_id
      LEFT JOIN current_compensation AS cur ON cur.member_id = m.member_id
      WHERE m.active = TRUE
      ORDER BY m.display_name ASC
    `
  )

  return rows.map(mapCompensationMember)
}

export const listPayrollSocialSecurityInstitutionsFromPostgres = async (): Promise<string[]> => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<{ institution: string }>(
    `
      SELECT DISTINCT institution
      FROM (
        SELECT NULLIF(BTRIM(afp_name), '') AS institution
        FROM greenhouse_payroll.compensation_versions
        WHERE pay_regime = 'chile'
          AND afp_name IS NOT NULL

        UNION ALL

        SELECT
          CASE
            WHEN LOWER(BTRIM(health_system)) = 'fonasa' THEN 'Fonasa'
            WHEN LOWER(BTRIM(health_system)) = 'isapre' THEN 'Isapre'
            ELSE NULL
          END AS institution
        FROM greenhouse_payroll.compensation_versions
        WHERE pay_regime = 'chile'
      ) AS payroll_institutions
      WHERE institution IS NOT NULL
      ORDER BY institution ASC
    `
  )

  return rows.map(row => row.institution)
}

// ---------------------------------------------------------------------------
// Bonus config
// ---------------------------------------------------------------------------

export const pgGetActiveBonusConfig = async (effectiveDate?: string) => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<{
    config_id: string
    otd_threshold: number | string
    rpa_threshold: number | string
    otd_floor: number | string | null
    rpa_full_payout_threshold: number | string | null
    rpa_soft_band_end: number | string | null
    rpa_soft_band_floor_factor: number | string | null
    effective_from: string | Date
    }>(
    `
      SELECT * FROM greenhouse_payroll.payroll_bonus_config
      WHERE effective_from <= COALESCE($1::date, CURRENT_DATE)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    [effectiveDate ?? null]
  )

  return row
    ? {
        configId: row.config_id,
        otdThreshold: toNumber(row.otd_threshold),
        rpaThreshold: toNumber(row.rpa_threshold),
        otdFloor: row.otd_floor != null ? toNumber(row.otd_floor) : 70,
        rpaFullPayoutThreshold:
          row.rpa_full_payout_threshold != null ? toNumber(row.rpa_full_payout_threshold) : 1.7,
        rpaSoftBandEnd: row.rpa_soft_band_end != null ? toNumber(row.rpa_soft_band_end) : 2,
        rpaSoftBandFloorFactor:
          row.rpa_soft_band_floor_factor != null ? toNumber(row.rpa_soft_band_floor_factor) : 0.8,
        effectiveFrom: toPgDateString(row.effective_from)
      }
    : null
}

// ---------------------------------------------------------------------------
// Compensation overview (aggregated read model)
// ---------------------------------------------------------------------------

export const pgGetCompensationOverview = async (): Promise<PayrollCompensationOverview> => {
  const [compensationsResult, membersResult] = await Promise.allSettled([
    pgGetCurrentCompensation(),
    pgListPayrollCompensationMembers()
  ])

  const compensations = compensationsResult.status === 'fulfilled' ? compensationsResult.value : []

  if (compensationsResult.status === 'rejected') {
    captureWithDomain(compensationsResult.reason, 'payroll', {
      level: 'error',
      extra: { stage: 'pg_load_current_compensations' }
    })
  }

  let members = membersResult.status === 'fulfilled' ? membersResult.value : []

  if (membersResult.status === 'rejected') {
    captureWithDomain(membersResult.reason, 'payroll', {
      level: 'error',
      extra: { stage: 'pg_load_compensation_members' }
    })
  }

  // Merge current compensation into members
  const currentByMember = new Map(compensations.map(c => [c.memberId, c]))

  members = members.map(member => {
    const current = currentByMember.get(member.memberId)

    if (!current) return member

    return {
      ...member,
      hasCurrentCompensation: true,
      hasCompensationHistory: member.hasCompensationHistory || true,
      compensationVersionCount: Math.max(member.compensationVersionCount, 1),
      currentCompensationVersionId: current.versionId,
      currentCompensationEffectiveFrom: current.effectiveFrom,
      currentPayRegime: current.payRegime,
      currentCurrency: current.currency
    }
  })

  const eligibleMembers = members.filter(m => !m.hasCurrentCompensation)

  return {
    compensations,
    eligibleMembers,
    members,
    summary: {
      activeMembers: members.length,
      activeCompensations: compensations.length,
      eligibleMembers: eligibleMembers.length
    }
  }
}
