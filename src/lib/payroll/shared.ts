import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const payrollCompletedStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']

export class PayrollValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'PayrollValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

export const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const toDateString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

export const toTimestampString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

export const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const normalizeNullableString = (value: unknown) => {
  const normalized = normalizeString(value)

  return normalized || null
}

export const normalizeBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'

  return Boolean(value)
}

export const buildPayrollQueryTypes = (
  params: Record<string, unknown>,
  columnTypes: Record<string, string>
) => {
  const types: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === null && columnTypes[key]) {
      types[key] = columnTypes[key]
    }
  }

  return Object.keys(types).length > 0 ? types : undefined
}

export const parsePayrollNumber = (
  value: unknown,
  fieldName: string,
  {
    allowNull = false,
    integer = false,
    min,
    max
  }: {
    allowNull?: boolean
    integer?: boolean
    min?: number
    max?: number
  } = {}
) => {
  if (value === undefined || value === '' || (value === null && allowNull)) {
    return null
  }

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(parsed)) {
    throw new PayrollValidationError(`${fieldName} must be a valid number.`)
  }

  if (integer && !Number.isInteger(parsed)) {
    throw new PayrollValidationError(`${fieldName} must be an integer.`)
  }

  if (min !== undefined && parsed < min) {
    throw new PayrollValidationError(`${fieldName} must be greater than or equal to ${min}.`)
  }

  if (max !== undefined && parsed > max) {
    throw new PayrollValidationError(`${fieldName} must be less than or equal to ${max}.`)
  }

  return parsed
}

export const assertPayrollDateString = (value: unknown, fieldName: string) => {
  const normalized = normalizeString(value)

  if (!normalized) {
    throw new PayrollValidationError(`${fieldName} is required.`)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new PayrollValidationError(`${fieldName} must use YYYY-MM-DD format.`)
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new PayrollValidationError(`${fieldName} must be a valid calendar date.`)
  }

  return normalized
}

export const runPayrollQuery = async <T>(
  query: string,
  params: Record<string, unknown> = {},
  types?: Record<string, string>
) => {
  const [rows] = await getBigQueryClient().query({
    query,
    params,
    types
  })

  return rows as T[]
}

const isMissingBigQueryEntityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''

  return code === '404' || /not found: table/i.test(message) || /dataset .* was not found/i.test(message)
}

export const getTableColumns = async (dataset: string, tableName: string) => {
  const projectId = getBigQueryProjectId()

  try {
    const rows = await runPayrollQuery<{ column_name: string | null }>(
      `
        SELECT column_name
        FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = @tableName
      `,
      { tableName }
    )

    return new Set(rows.map(row => row.column_name || '').filter(Boolean))
  } catch (error) {
    if (isMissingBigQueryEntityError(error)) {
      return new Set<string>()
    }

    throw error
  }
}

export const buildPeriodId = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

export const getPeriodRangeFromId = (periodId: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(periodId)

  if (!match) {
    throw new PayrollValidationError('Invalid period id format. Expected YYYY-MM.')
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new PayrollValidationError('Invalid period id components.')
  }

  const start = new Date(Date.UTC(year, month - 1, 1))
  const endExclusive = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month, 0))

  return {
    periodId,
    year,
    month,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    periodEndExclusive: endExclusive.toISOString().slice(0, 10)
  }
}

export const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return ''
  }

  const normalized = String(value)

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }

  return normalized
}
