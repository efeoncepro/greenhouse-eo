import 'server-only'

import type { MemberPayrollHistory, PayrollEntry } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { getCompensationHistoryByMember } from '@/lib/payroll/get-compensation'
import { getPayrollMemberSummary } from '@/lib/payroll/get-payroll-members'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import {
  PayrollValidationError,
  normalizeBoolean,
  normalizeNullableString,
  runPayrollQuery,
  toNullableNumber,
  toNumber,
  toTimestampString
} from '@/lib/payroll/shared'
import {
  isPayrollPostgresEnabled,
  pgGetPayrollEntries,
  pgGetPayrollEntryById,
  pgGetMemberPayrollEntries,
  pgGetPayrollMemberSummary
} from '@/lib/payroll/postgres-store'

type PayrollEntryRow = {
  entry_id: string | null
  period_id: string | null
  member_id: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  compensation_version_id: string | null
  pay_regime: string | null
  currency: string | null
  base_salary: number | string | null
  remote_allowance: number | string | null
  kpi_otd_percent: number | string | null
  kpi_rpa_avg: number | string | null
  kpi_otd_qualifies: boolean | null
  kpi_rpa_qualifies: boolean | null
  kpi_tasks_completed: number | string | null
  kpi_data_source: string | null
  bonus_otd_amount: number | string | null
  bonus_rpa_amount: number | string | null
  bonus_other_amount: number | string | null
  bonus_other_description: string | null
  gross_total: number | string | null
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
  net_total: number | string | null
  manual_override: boolean | null
  manual_override_note: string | null
  created_at: { value?: string } | string | null
  updated_at: { value?: string } | string | null
}

const getProjectId = () => getBigQueryProjectId()

const normalizePayrollEntry = (row: PayrollEntryRow): PayrollEntry => ({
  entryId: String(row.entry_id || ''),
  periodId: String(row.period_id || ''),
  memberId: String(row.member_id || ''),
  memberName: String(row.display_name || 'Sin nombre'),
  memberEmail: String(row.email || ''),
  memberAvatarUrl: normalizeNullableString(row.avatar_url),
  compensationVersionId: String(row.compensation_version_id || ''),
  payRegime: row.pay_regime === 'international' ? 'international' : 'chile',
  currency: row.currency === 'USD' ? 'USD' : 'CLP',
  baseSalary: toNumber(row.base_salary),
  remoteAllowance: toNumber(row.remote_allowance),
  kpiOtdPercent: toNullableNumber(row.kpi_otd_percent),
  kpiRpaAvg: toNullableNumber(row.kpi_rpa_avg),
  kpiOtdQualifies: normalizeBoolean(row.kpi_otd_qualifies),
  kpiRpaQualifies: normalizeBoolean(row.kpi_rpa_qualifies),
  kpiTasksCompleted: toNullableNumber(row.kpi_tasks_completed),
  kpiDataSource: row.kpi_data_source === 'manual' ? 'manual' : 'notion_ops',
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
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const buildBaseEntryQuery = (projectId: string) => `
  SELECT
    e.entry_id,
    e.period_id,
    e.member_id,
    m.display_name,
    m.email,
    m.avatar_url,
    e.compensation_version_id,
    e.pay_regime,
    e.currency,
    e.base_salary,
    e.remote_allowance,
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
    e.created_at,
    e.updated_at
  FROM \`${projectId}.greenhouse.payroll_entries\` AS e
  INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
    ON m.member_id = e.member_id
  LEFT JOIN \`${projectId}.greenhouse.compensation_versions\` AS cv
    ON cv.version_id = e.compensation_version_id
`

export const getPayrollEntries = async (periodId: string) => {
  if (isPayrollPostgresEnabled()) {
    return pgGetPayrollEntries(periodId)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()
  const baseEntryQuery = buildBaseEntryQuery(projectId)

  const rows = await runPayrollQuery<PayrollEntryRow>(
    `
      ${baseEntryQuery}
      WHERE e.period_id = @periodId
      ORDER BY m.display_name ASC
    `,
    { periodId }
  )

  return rows.map(normalizePayrollEntry)
}

export const getPayrollEntryById = async (entryId: string) => {
  if (isPayrollPostgresEnabled()) {
    return pgGetPayrollEntryById(entryId)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()
  const baseEntryQuery = buildBaseEntryQuery(projectId)

  const [row] = await runPayrollQuery<PayrollEntryRow>(
    `
      ${baseEntryQuery}
      WHERE e.entry_id = @entryId
      LIMIT 1
    `,
    { entryId }
  )

  return row ? normalizePayrollEntry(row) : null
}

export const getMemberPayrollHistory = async (memberId: string): Promise<MemberPayrollHistory> => {
  if (isPayrollPostgresEnabled()) {
    const member = await pgGetPayrollMemberSummary(memberId)

    if (!member) {
      return {
        memberId,
        member: null,
        entries: [],
        compensationHistory: await getCompensationHistoryByMember(memberId)
      }
    }

    const entries = await pgGetMemberPayrollEntries(memberId)

    return {
      memberId,
      member,
      entries,
      compensationHistory: await getCompensationHistoryByMember(memberId)
    }
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()
  const baseEntryQuery = buildBaseEntryQuery(projectId)
  const member = await getPayrollMemberSummary(memberId)

  if (!member) {
    throw new PayrollValidationError('Payroll member not found.', 404)
  }

  const rows = await runPayrollQuery<PayrollEntryRow>(
    `
      ${baseEntryQuery}
      INNER JOIN \`${projectId}.greenhouse.payroll_periods\` AS p
        ON p.period_id = e.period_id
      WHERE e.member_id = @memberId
        AND p.status IN ('approved', 'exported')
      ORDER BY p.year DESC, p.month DESC
    `,
    { memberId }
  )

  if (rows.length === 0) {
    const history = await getCompensationHistoryByMember(memberId)

    return {
      memberId,
      member,
      entries: [],
      compensationHistory: history
    }
  }

  return {
    memberId,
    member,
    entries: rows.map(normalizePayrollEntry),
    compensationHistory: await getCompensationHistoryByMember(memberId)
  }
}

export const assertPayrollEntryFound = async (entryId: string) => {
  const entry = await getPayrollEntryById(entryId)

  if (!entry) {
    throw new PayrollValidationError('Payroll entry not found.', 404)
  }

  return entry
}
