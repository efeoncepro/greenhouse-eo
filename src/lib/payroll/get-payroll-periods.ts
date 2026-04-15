import 'server-only'

import type { CreatePayrollPeriodInput, PayrollPeriod, UpdatePayrollPeriodInput } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import {
  buildPayrollQueryTypes,
  PayrollValidationError,
  buildPeriodId,
  normalizeNullableString,
  runPayrollQuery,
  toNullableNumber,
  toNumber,
  toTimestampString
} from '@/lib/payroll/shared'
import {
  canEditPayrollPeriodMetadata,
  doesPayrollPeriodUpdateRequireReset
} from '@/lib/payroll/period-lifecycle'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import {
  isPayrollPostgresEnabled,
  pgListPayrollPeriods,
  pgGetPayrollPeriod,
  pgCreatePayrollPeriod,
  pgUpdatePayrollPeriod
} from '@/lib/payroll/postgres-store'

const PAYROLL_PERIOD_MUTATION_TYPES = {
  calculatedAt: 'TIMESTAMP',
  calculatedBy: 'STRING',
  approvedAt: 'TIMESTAMP',
  approvedBy: 'STRING',
  ufValue: 'FLOAT64',
  taxTableVersion: 'STRING',
  notes: 'STRING'
} as const

type PayrollPeriodRow = {
  period_id: string | null
  year: number | string | null
  month: number | string | null
  status: string | null
  calculated_at: { value?: string } | string | null
  calculated_by: string | null
  approved_at: { value?: string } | string | null
  approved_by: string | null
  exported_at: { value?: string } | string | null
  uf_value: number | string | null
  tax_table_version: string | null
  notes: string | null
  created_at: { value?: string } | string | null
}

const getProjectId = () => getBigQueryProjectId()

const buildPayrollPeriodIndicatorDate = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}-31`

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
    periodDate: buildPayrollPeriodIndicatorDate(year, month)
  })

  return snapshot?.value ?? null
}

const normalizePayrollPeriod = (row: PayrollPeriodRow): PayrollPeriod => ({
  periodId: String(row.period_id || ''),
  year: toNumber(row.year),
  month: toNumber(row.month),
  status:
    row.status === 'approved' ||
    row.status === 'exported' ||
    row.status === 'calculated' ||
    row.status === 'reopened'
      ? row.status
      : 'draft',
  calculatedAt: toTimestampString(row.calculated_at),
  calculatedBy: row.calculated_by || null,
  approvedAt: toTimestampString(row.approved_at),
  approvedBy: row.approved_by || null,
  exportedAt: toTimestampString(row.exported_at),
  ufValue: toNullableNumber(row.uf_value),
  taxTableVersion: row.tax_table_version || null,
  notes: row.notes || null,
  createdAt: toTimestampString(row.created_at)
})

export const listPayrollPeriods = async () => {
  if (isPayrollPostgresEnabled()) {
    return pgListPayrollPeriods()
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const rows = await runPayrollQuery<PayrollPeriodRow>(
    `
      SELECT *
      FROM \`${projectId}.greenhouse.payroll_periods\`
      ORDER BY year DESC, month DESC
    `
  )

  return rows.map(normalizePayrollPeriod)
}

export const getPayrollPeriod = async (periodId: string) => {
  if (isPayrollPostgresEnabled()) {
    return pgGetPayrollPeriod(periodId)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const [row] = await runPayrollQuery<PayrollPeriodRow>(
    `
      SELECT *
      FROM \`${projectId}.greenhouse.payroll_periods\`
      WHERE period_id = @periodId
      LIMIT 1
    `,
    { periodId }
  )

  return row ? normalizePayrollPeriod(row) : null
}

export const createPayrollPeriod = async (input: CreatePayrollPeriodInput) => {
  const resolvedUfValue = await resolvePayrollPeriodUfValue({
    year: input.year,
    month: input.month,
    ufValue: input.ufValue
  })

  if (isPayrollPostgresEnabled()) {
    const periodId = await pgCreatePayrollPeriod({
      ...input,
      ufValue: resolvedUfValue
    })

    const created = await pgGetPayrollPeriod(periodId)

    if (!created) {
      throw new PayrollValidationError('Unable to read newly created payroll period.', 500)
    }

    return created
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

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
  const existing = await getPayrollPeriod(periodId)

  if (existing) {
    throw new PayrollValidationError('Payroll period already exists.', 409)
  }

  const createParams = {
    periodId,
    year: input.year,
    month: input.month,
    ufValue: resolvedUfValue,
    taxTableVersion: normalizeNullableString(input.taxTableVersion),
    notes: normalizeNullableString(input.notes)
  }

  await runPayrollQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.payroll_periods\` (
        period_id,
        year,
        month,
        status,
        uf_value,
        tax_table_version,
        notes,
        created_at
      )
      VALUES (
        @periodId,
        @year,
        @month,
        'draft',
        @ufValue,
        @taxTableVersion,
        @notes,
        CURRENT_TIMESTAMP()
      )
    `,
    createParams,
    buildPayrollQueryTypes(createParams, PAYROLL_PERIOD_MUTATION_TYPES)
  )

  const created = await getPayrollPeriod(periodId)

  if (!created) {
    throw new PayrollValidationError('Unable to read newly created payroll period.', 500)
  }

  return created
}

export const updatePayrollPeriod = async (periodId: string, input: UpdatePayrollPeriodInput) => {
  const current = await getPayrollPeriod(periodId)

  if (!current) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  const resolvedYear = input.year ?? current.year
  const resolvedMonth = input.month ?? current.month

  const resolvedUfValue = await resolvePayrollPeriodUfValue({
    year: resolvedYear,
    month: resolvedMonth,
    ufValue: input.ufValue === undefined ? current.ufValue : input.ufValue
  })

  if (isPayrollPostgresEnabled()) {
    const updated = await pgUpdatePayrollPeriod(periodId, {
      ...input,
      year: resolvedYear,
      month: resolvedMonth,
      ufValue: resolvedUfValue
    })

    if (!updated) {
      throw new PayrollValidationError('Unable to read updated payroll period.', 500)
    }

    return updated
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  if (!canEditPayrollPeriodMetadata(current.status)) {
    throw new PayrollValidationError('Exported payroll periods cannot be updated.', 409)
  }

  const nextYear = resolvedYear
  const nextMonth = resolvedMonth
  const nextUfValue = resolvedUfValue

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

  if (identityChanged) {
    const existing = await getPayrollPeriod(nextPeriodId)

    if (existing) {
      throw new PayrollValidationError('Payroll period already exists.', 409)
    }
  }

  const updateParams = {
    currentPeriodId: periodId,
    nextPeriodId,
    year: nextYear,
    month: nextMonth,
    ufValue: nextUfValue ?? null,
    taxTableVersion: nextTaxTableVersion,
    notes: nextNotes,
    status: requiresReset ? 'draft' : current.status,
    calculatedAt: requiresReset ? null : current.calculatedAt,
    calculatedBy: requiresReset ? null : current.calculatedBy,
    approvedAt: requiresReset ? null : current.approvedAt,
    approvedBy: requiresReset ? null : current.approvedBy
  }

  if (requiresReset) {
    await runPayrollQuery(
      `
        DELETE FROM \`${projectId}.greenhouse.payroll_entries\`
        WHERE period_id = @currentPeriodId
      `,
      { currentPeriodId: periodId }
    )
  }

  await runPayrollQuery(
    `
      UPDATE \`${projectId}.greenhouse.payroll_periods\`
      SET
        period_id = @nextPeriodId,
        year = @year,
        month = @month,
        status = @status,
        calculated_at = @calculatedAt,
        calculated_by = @calculatedBy,
        approved_at = @approvedAt,
        approved_by = @approvedBy,
        uf_value = @ufValue,
        tax_table_version = @taxTableVersion,
        notes = @notes
      WHERE period_id = @currentPeriodId
    `,
    updateParams,
    buildPayrollQueryTypes(updateParams, PAYROLL_PERIOD_MUTATION_TYPES)
  )

  const updated = await getPayrollPeriod(nextPeriodId)

  if (!updated) {
    throw new PayrollValidationError('Unable to read updated payroll period.', 500)
  }

  return updated
}
