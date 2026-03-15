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

const PAYROLL_PERIOD_MUTATION_TYPES = {
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

const normalizePayrollPeriod = (row: PayrollPeriodRow): PayrollPeriod => ({
  periodId: String(row.period_id || ''),
  year: toNumber(row.year),
  month: toNumber(row.month),
  status: row.status === 'approved' || row.status === 'exported' || row.status === 'calculated' ? row.status : 'draft',
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
    ufValue: input.ufValue ?? null,
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
  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const current = await getPayrollPeriod(periodId)

  if (!current) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (current.status !== 'draft') {
    throw new PayrollValidationError('Only draft payroll periods can be updated.', 409)
  }

  if (input.ufValue !== undefined && input.ufValue !== null && (!Number.isFinite(input.ufValue) || input.ufValue < 0)) {
    throw new PayrollValidationError('ufValue must be a non-negative number when provided.')
  }

  const updateParams = {
    periodId,
    ufValue: input.ufValue ?? current.ufValue,
    taxTableVersion:
      input.taxTableVersion === undefined ? current.taxTableVersion : normalizeNullableString(input.taxTableVersion),
    notes: input.notes === undefined ? current.notes : normalizeNullableString(input.notes)
  }

  await runPayrollQuery(
    `
      UPDATE \`${projectId}.greenhouse.payroll_periods\`
      SET
        uf_value = @ufValue,
        tax_table_version = @taxTableVersion,
        notes = @notes
      WHERE period_id = @periodId
    `,
    updateParams,
    buildPayrollQueryTypes(updateParams, PAYROLL_PERIOD_MUTATION_TYPES)
  )

  const updated = await getPayrollPeriod(periodId)

  if (!updated) {
    throw new PayrollValidationError('Unable to read updated payroll period.', 500)
  }

  return updated
}
