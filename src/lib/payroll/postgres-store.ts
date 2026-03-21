import 'server-only'

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
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  PayrollValidationError,
  assertPayrollDateString,
  buildPeriodId,
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
  doesPayrollPeriodUpdateRequireReset
} from '@/lib/payroll/period-lifecycle'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'

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
  bonus_otd_min: number | string
  bonus_otd_max: number | string
  bonus_rpa_min: number | string
  bonus_rpa_max: number | string
  afp_name: string | null
  afp_rate: number | string | null
  health_system: string | null
  health_plan_uf: number | string | null
  unemployment_rate: number | string | null
  contract_type: string
  has_apv: boolean
  apv_amount: number | string
  effective_from: string | Date
  effective_to: string | Date | null
  is_current: boolean
  change_reason: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
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
  currency: string
  base_salary: number | string
  remote_allowance: number | string
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
  chile_afp_name: string | null
  chile_afp_rate: number | string | null
  chile_afp_amount: number | string | null
  chile_health_system: string | null
  chile_health_amount: number | string | null
  chile_unemployment_rate: number | string | null
  chile_unemployment_amount: number | string | null
  chile_taxable_base: number | string | null
  chile_tax_amount: number | string | null
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
  current_pay_regime: string | null
  current_currency: string | null
}

// ---------------------------------------------------------------------------
// Schema readiness check (replicated from Leave store pattern)
// ---------------------------------------------------------------------------

const PAYROLL_REQUIRED_TABLES = [
  'greenhouse_core.members',
  'greenhouse_core.client_users',
  'greenhouse_payroll.compensation_versions',
  'greenhouse_payroll.payroll_periods',
  'greenhouse_payroll.payroll_entries',
  'greenhouse_payroll.payroll_bonus_config'
] as const

let payrollStoreReadyPromise: Promise<void> | null = null
let payrollStoreReadyAt = 0

const PAYROLL_STORE_READY_TTL_MS = 60_000

export const isPayrollPostgresEnabled = () => isGreenhousePostgresConfigured()

export const assertPayrollPostgresReady = async () => {
  if (!isPayrollPostgresEnabled()) {
    throw new PayrollValidationError(
      'Payroll Postgres store is not configured in this environment.',
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
    const missing = PAYROLL_REQUIRED_TABLES.filter(t => !existing.has(t))

    if (missing.length > 0) {
      throw new PayrollValidationError(
        `Payroll Postgres schema is not ready. Missing tables: ${missing.join(', ')}. Run setup-postgres-payroll.sql first.`,
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

  return {
    versionId: row.version_id,
    memberId: row.member_id,
    memberName: row.display_name || 'Sin nombre',
    memberEmail: row.primary_email || '',
    memberAvatarUrl: normalizeNullableString(row.avatar_url) || resolveAvatarPath({ name: row.display_name, email: row.primary_email }),
    notionUserId: null,
    version: toNumber(row.version),
    payRegime: row.pay_regime === 'international' ? 'international' : 'chile',
    currency: row.currency === 'USD' ? 'USD' : 'CLP',
    baseSalary: toNumber(row.base_salary),
    remoteAllowance: toNumber(row.remote_allowance),
    bonusOtdMin: toNumber(row.bonus_otd_min),
    bonusOtdMax: toNumber(row.bonus_otd_max),
    bonusRpaMin: toNumber(row.bonus_rpa_min),
    bonusRpaMax: toNumber(row.bonus_rpa_max),
    afpName: normalizeNullableString(row.afp_name),
    afpRate: toNullableNumber(row.afp_rate),
    healthSystem: row.health_system === 'isapre' ? 'isapre' : row.health_system === 'fonasa' ? 'fonasa' : null,
    healthPlanUf: toNullableNumber(row.health_plan_uf),
    unemploymentRate: toNumber(row.unemployment_rate),
    contractType: row.contract_type === 'plazo_fijo' ? 'plazo_fijo' : 'indefinido',
    hasApv: Boolean(row.has_apv),
    apvAmount: toNumber(row.apv_amount),
    effectiveFrom,
    effectiveTo,
    isCurrent: effectiveFrom ? isCurrentCompensationWindow(effectiveFrom, effectiveTo) : Boolean(row.is_current),
    changeReason: normalizeNullableString(row.change_reason),
    createdBy: normalizeNullableString(row.created_by_user_id),
    createdAt: toPgTimestampString(row.created_at)
  }
}

const mapPeriod = (row: PgPeriodRow): PayrollPeriod => ({
  periodId: row.period_id,
  year: toNumber(row.year),
  month: toNumber(row.month),
  status: row.status === 'approved' || row.status === 'exported' || row.status === 'calculated' ? row.status : 'draft',
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
  memberAvatarUrl: normalizeNullableString(row.avatar_url) || resolveAvatarPath({ name: row.display_name || row.member_display_name, email: row.primary_email }),
  compensationVersionId: row.compensation_version_id,
  payRegime: row.pay_regime === 'international' ? 'international' : 'chile',
  currency: row.currency === 'USD' ? 'USD' : 'CLP',
  baseSalary: toNumber(row.base_salary),
  remoteAllowance: toNumber(row.remote_allowance),
  kpiOtdPercent: toNullableNumber(row.kpi_otd_percent),
  kpiRpaAvg: toNullableNumber(row.kpi_rpa_avg),
  kpiOtdQualifies: normalizeBoolean(row.kpi_otd_qualifies),
  kpiRpaQualifies: normalizeBoolean(row.kpi_rpa_qualifies),
  kpiTasksCompleted: toNullableNumber(row.kpi_tasks_completed),
  kpiDataSource: row.kpi_data_source === 'manual' ? 'manual' : row.kpi_data_source === 'ico' ? 'ico' : 'notion_ops',
  bonusOtdAmount: toNumber(row.bonus_otd_amount),
  bonusRpaAmount: toNumber(row.bonus_rpa_amount),
  bonusOtherAmount: toNumber(row.bonus_other_amount),
  bonusOtherDescription: normalizeNullableString(row.bonus_other_description),
  grossTotal: toNumber(row.gross_total),
  bonusOtdMin: toNumber(row.bonus_otd_min),
  bonusOtdMax: toNumber(row.bonus_otd_max),
  bonusRpaMin: toNumber(row.bonus_rpa_min),
  bonusRpaMax: toNumber(row.bonus_rpa_max),
  chileAfpName: normalizeNullableString(row.chile_afp_name),
  chileAfpRate: toNullableNumber(row.chile_afp_rate),
  chileAfpAmount: toNullableNumber(row.chile_afp_amount),
  chileHealthSystem: normalizeNullableString(row.chile_health_system),
  chileHealthAmount: toNullableNumber(row.chile_health_amount),
  chileUnemploymentRate: toNullableNumber(row.chile_unemployment_rate),
  chileUnemploymentAmount: toNullableNumber(row.chile_unemployment_amount),
  chileTaxableBase: toNullableNumber(row.chile_taxable_base),
  chileTaxAmount: toNullableNumber(row.chile_tax_amount),
  chileApvAmount: toNullableNumber(row.chile_apv_amount),
  chileUfValue: toNullableNumber(row.chile_uf_value),
  chileTotalDeductions: toNullableNumber(row.chile_total_deductions),
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
  createdAt: toPgTimestampString(row.created_at),
  updatedAt: toPgTimestampString(row.updated_at)
})

const mapMemberSummary = (row: PgMemberRow): PayrollMemberSummary => ({
  memberId: row.member_id,
  memberName: row.display_name || 'Sin nombre',
  memberEmail: row.primary_email || '',
  memberAvatarUrl: normalizeNullableString(row.avatar_url) || resolveAvatarPath({ name: row.display_name, email: row.primary_email }),
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
    currentPayRegime: row.current_pay_regime === 'chile' || row.current_pay_regime === 'international' ? row.current_pay_regime : null,
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
    cv.bonus_otd_min,
    cv.bonus_otd_max,
    cv.bonus_rpa_min,
    cv.bonus_rpa_max,
    cv.afp_name,
    cv.afp_rate,
    cv.health_system,
    cv.health_plan_uf,
    cv.unemployment_rate,
    cv.contract_type,
    cv.has_apv,
    cv.apv_amount,
    cv.effective_from,
    cv.effective_to,
    cv.is_current,
    cv.change_reason,
    cv.created_by_user_id,
    cv.created_at
  FROM greenhouse_payroll.compensation_versions AS cv
  INNER JOIN greenhouse_core.members AS m ON m.member_id = cv.member_id
`

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
        cv.member_id,
        m.display_name,
        m.primary_email,
        m.avatar_url,
        cv.version,
        cv.pay_regime,
        cv.currency,
        cv.base_salary,
        cv.remote_allowance,
        cv.bonus_otd_min,
        cv.bonus_otd_max,
        cv.bonus_rpa_min,
        cv.bonus_rpa_max,
        cv.afp_name,
        cv.afp_rate,
        cv.health_system,
        cv.health_plan_uf,
        cv.unemployment_rate,
        cv.contract_type,
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
  parsePayrollNumber(input.bonusOtdMin ?? 0, 'bonusOtdMin', { min: 0 })
  parsePayrollNumber(input.bonusOtdMax ?? 0, 'bonusOtdMax', { min: 0 })
  parsePayrollNumber(input.bonusRpaMin ?? 0, 'bonusRpaMin', { min: 0 })
  parsePayrollNumber(input.bonusRpaMax ?? 0, 'bonusRpaMax', { min: 0 })
  parsePayrollNumber(input.apvAmount ?? 0, 'apvAmount', { min: 0 })

  if (input.afpRate !== undefined && input.afpRate !== null) {
    parsePayrollNumber(input.afpRate, 'afpRate', { min: 0, max: 1 })
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
          base_salary, remote_allowance,
          bonus_otd_min, bonus_otd_max, bonus_rpa_min, bonus_rpa_max,
          afp_name, afp_rate, health_system, health_plan_uf,
          unemployment_rate, contract_type, has_apv, apv_amount,
          effective_from, effective_to, is_current,
          change_reason, created_by_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20::date, $21, $22,
          $23, $24
        )
      `,
      [
        versionId, input.memberId, nextVersion, input.payRegime, input.currency,
        Number(input.baseSalary), Number(input.remoteAllowance ?? 0),
        Number(input.bonusOtdMin ?? 0), Number(input.bonusOtdMax ?? 0),
        Number(input.bonusRpaMin ?? 0), Number(input.bonusRpaMax ?? 0),
        normalizeNullableString(input.afpName), input.afpRate ?? null,
        input.healthSystem ?? null, input.healthPlanUf ?? null,
        input.unemploymentRate ?? (input.contractType === 'plazo_fijo' ? 0.03 : 0.006),
        input.contractType ?? 'indefinido', Boolean(input.hasApv), Number(input.apvAmount ?? 0),
        effectiveFrom, nextEffectiveTo, isCurrent,
        input.changeReason.trim(), actorUserId
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
        payRegime: input.payRegime,
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
  parsePayrollNumber(input.bonusOtdMin ?? 0, 'bonusOtdMin', { min: 0 })
  parsePayrollNumber(input.bonusOtdMax ?? 0, 'bonusOtdMax', { min: 0 })
  parsePayrollNumber(input.bonusRpaMin ?? 0, 'bonusRpaMin', { min: 0 })
  parsePayrollNumber(input.bonusRpaMax ?? 0, 'bonusRpaMax', { min: 0 })
  parsePayrollNumber(input.apvAmount ?? 0, 'apvAmount', { min: 0 })

  if (input.afpRate !== undefined && input.afpRate !== null) {
    parsePayrollNumber(input.afpRate, 'afpRate', { min: 0, max: 1 })
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

    await client.query(
      `
        UPDATE greenhouse_payroll.compensation_versions
        SET
          pay_regime = $1,
          currency = $2,
          base_salary = $3,
          remote_allowance = $4,
          bonus_otd_min = $5,
          bonus_otd_max = $6,
          bonus_rpa_min = $7,
          bonus_rpa_max = $8,
          afp_name = $9,
          afp_rate = $10,
          health_system = $11,
          health_plan_uf = $12,
          unemployment_rate = $13,
          contract_type = $14,
          has_apv = $15,
          apv_amount = $16,
          change_reason = $17
        WHERE version_id = $18
      `,
      [
        input.payRegime,
        input.currency,
        Number(input.baseSalary),
        Number(input.remoteAllowance ?? 0),
        Number(input.bonusOtdMin ?? 0),
        Number(input.bonusOtdMax ?? 0),
        Number(input.bonusRpaMin ?? 0),
        Number(input.bonusRpaMax ?? 0),
        normalizeNullableString(input.afpName),
        input.afpRate ?? null,
        input.healthSystem ?? null,
        input.healthPlanUf ?? null,
        input.unemploymentRate ?? (input.contractType === 'plazo_fijo' ? 0.03 : 0.006),
        input.contractType ?? 'indefinido',
        Boolean(input.hasApv),
        Number(input.apvAmount ?? 0),
        input.changeReason.trim(),
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
        payRegime: input.payRegime,
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

  if (existing) {
    throw new PayrollValidationError('Payroll period already exists.', 409)
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
        input.ufValue ?? null,
        normalizeNullableString(input.taxTableVersion),
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
  const nextUfValue = input.ufValue ?? current.ufValue

  const nextTaxTableVersion =
    input.taxTableVersion === undefined ? current.taxTableVersion : normalizeNullableString(input.taxTableVersion)

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

  const nextPeriodId = buildPeriodId(nextYear, nextMonth)
  const identityChanged = nextPeriodId !== current.periodId

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
        requiresReset ? 'draft' : current.status,
        requiresReset ? null : current.calculatedAt,
        requiresReset ? null : current.calculatedBy,
        requiresReset ? null : current.approvedAt,
        requiresReset ? null : current.approvedBy,
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

  await runGreenhousePostgresQuery(
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
    `,
    [actorUserId, periodId]
  )
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

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_payroll.payroll_periods
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by_user_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE period_id = $2
    `,
    [actorUserId, periodId]
  )
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
    e.currency,
    e.base_salary,
    e.remote_allowance,
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
    e.chile_health_system,
    e.chile_health_amount,
    e.chile_unemployment_rate,
    e.chile_unemployment_amount,
    e.chile_taxable_base,
    e.chile_tax_amount,
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
    e.created_at,
    e.updated_at
  FROM greenhouse_payroll.payroll_entries AS e
  INNER JOIN greenhouse_core.members AS m ON m.member_id = e.member_id
  LEFT JOIN greenhouse_payroll.compensation_versions AS cv ON cv.version_id = e.compensation_version_id
`

export const pgGetPayrollEntries = async (periodId: string) => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgEntryRow>(
    `
      ${ENTRY_BASE_SELECT}
      WHERE e.period_id = $1
      ORDER BY m.display_name ASC
    `,
    [periodId]
  )

  return rows.map(mapEntry)
}

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

export const pgGetMemberPayrollEntries = async (memberId: string) => {
  await assertPayrollPostgresReady()

  const rows = await runGreenhousePostgresQuery<PgEntryRow>(
    `
      ${ENTRY_BASE_SELECT}
      INNER JOIN greenhouse_payroll.payroll_periods AS p ON p.period_id = e.period_id
      WHERE e.member_id = $1
        AND p.status IN ('approved', 'exported')
      ORDER BY p.year DESC, p.month DESC
    `,
    [memberId]
  )

  return rows.map(mapEntry)
}

export const pgUpsertPayrollEntry = async (entry: PayrollEntry) => {
  await assertPayrollPostgresReady()

  return withGreenhousePostgresTransaction(async (client) => {
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
          pay_regime, currency, base_salary, remote_allowance,
          member_display_name,
          kpi_otd_percent, kpi_rpa_avg, kpi_otd_qualifies, kpi_rpa_qualifies,
          kpi_tasks_completed, kpi_data_source,
          bonus_otd_amount, bonus_rpa_amount, bonus_other_amount, bonus_other_description,
          gross_total,
          chile_afp_name, chile_afp_rate, chile_afp_amount,
          chile_health_system, chile_health_amount,
          chile_unemployment_rate, chile_unemployment_amount,
          chile_taxable_base, chile_tax_amount, chile_apv_amount, chile_uf_value,
          chile_total_deductions,
          net_total_calculated, net_total_override, net_total,
          manual_override, manual_override_note,
          bonus_otd_proration_factor, bonus_rpa_proration_factor,
          working_days_in_period, days_present, days_absent,
          days_on_leave, days_on_unpaid_leave,
          adjusted_base_salary, adjusted_remote_allowance
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9,
          $10, $11, $12, $13,
          $14, $15,
          $16, $17, $18, $19,
          $20,
          $21, $22, $23,
          $24, $25,
          $26, $27,
          $28, $29, $30, $31,
          $32,
          $33, $34, $35,
          $36, $37,
          $38, $39,
          $40, $41, $42,
          $43, $44,
          $45, $46
        )
        ON CONFLICT (entry_id) DO UPDATE SET
          period_id = EXCLUDED.period_id,
          member_id = EXCLUDED.member_id,
          compensation_version_id = EXCLUDED.compensation_version_id,
          pay_regime = EXCLUDED.pay_regime,
          currency = EXCLUDED.currency,
          base_salary = EXCLUDED.base_salary,
          remote_allowance = EXCLUDED.remote_allowance,
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
          chile_afp_name = EXCLUDED.chile_afp_name,
          chile_afp_rate = EXCLUDED.chile_afp_rate,
          chile_afp_amount = EXCLUDED.chile_afp_amount,
          chile_health_system = EXCLUDED.chile_health_system,
          chile_health_amount = EXCLUDED.chile_health_amount,
          chile_unemployment_rate = EXCLUDED.chile_unemployment_rate,
          chile_unemployment_amount = EXCLUDED.chile_unemployment_amount,
          chile_taxable_base = EXCLUDED.chile_taxable_base,
          chile_tax_amount = EXCLUDED.chile_tax_amount,
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
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        entry.entryId, entry.periodId, entry.memberId, entry.compensationVersionId,
        entry.payRegime, entry.currency, entry.baseSalary, entry.remoteAllowance,
        memberRow?.display_name ?? entry.memberName,
        entry.kpiOtdPercent, entry.kpiRpaAvg, entry.kpiOtdQualifies, entry.kpiRpaQualifies,
        entry.kpiTasksCompleted, entry.kpiDataSource,
        entry.bonusOtdAmount, entry.bonusRpaAmount, entry.bonusOtherAmount, entry.bonusOtherDescription,
        entry.grossTotal,
        entry.chileAfpName, entry.chileAfpRate, entry.chileAfpAmount,
        entry.chileHealthSystem, entry.chileHealthAmount,
        entry.chileUnemploymentRate, entry.chileUnemploymentAmount,
        entry.chileTaxableBase, entry.chileTaxAmount, entry.chileApvAmount, entry.chileUfValue,
        entry.chileTotalDeductions,
        entry.netTotalCalculated, entry.netTotalOverride, entry.netTotal,
        entry.manualOverride, entry.manualOverrideNote,
        entry.bonusOtdProrationFactor, entry.bonusRpaProrationFactor,
        entry.workingDaysInPeriod, entry.daysPresent, entry.daysAbsent,
        entry.daysOnLeave, entry.daysOnUnpaidLeave,
        entry.adjustedBaseSalary, entry.adjustedRemoteAllowance
      ]
    )

    await publishPayrollOutboxEvent({
      eventType: 'payroll_entry.upserted',
      aggregateType: 'payroll_entry',
      aggregateId: entry.entryId,
      payload: {
        entryId: entry.entryId,
        periodId: entry.periodId,
        memberId: entry.memberId,
        netTotal: entry.netTotal,
        grossTotal: entry.grossTotal
      },
      client
    })
  })
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
        SELECT DISTINCT ON (member_id)
          member_id,
          version_id AS current_version_id,
          effective_from AS current_effective_from,
          pay_regime AS current_pay_regime,
          currency AS current_currency
        FROM greenhouse_payroll.compensation_versions
        WHERE effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY member_id, effective_from DESC, version DESC
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
        cur.current_pay_regime,
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

// ---------------------------------------------------------------------------
// Bonus config
// ---------------------------------------------------------------------------

export const pgGetActiveBonusConfig = async () => {
  await assertPayrollPostgresReady()

  const [row] = await runGreenhousePostgresQuery<{
    config_id: string
    otd_threshold: number | string
    rpa_threshold: number | string
    otd_floor: number | string | null
    effective_from: string | Date
  }>(
    `
      SELECT * FROM greenhouse_payroll.payroll_bonus_config
      WHERE effective_from <= CURRENT_DATE
      ORDER BY effective_from DESC
      LIMIT 1
    `
  )

  return row
    ? {
        configId: row.config_id,
        otdThreshold: toNumber(row.otd_threshold),
        rpaThreshold: toNumber(row.rpa_threshold),
        otdFloor: row.otd_floor != null ? toNumber(row.otd_floor) : 70,
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
    console.error('Unable to load current payroll compensations from Postgres.', compensationsResult.reason)
  }

  let members = membersResult.status === 'fulfilled' ? membersResult.value : []

  if (membersResult.status === 'rejected') {
    console.error('Unable to load payroll compensation members from Postgres.', membersResult.reason)
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
