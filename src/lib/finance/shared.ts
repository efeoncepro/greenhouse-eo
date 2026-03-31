import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import {
  TAX_ID_TYPES,
  VALID_CURRENCIES,
  type FinanceCurrency,
  type TaxIdType
} from '@/lib/finance/contracts'

export {
  ACCOUNT_TYPES,
  ALLOCATION_METHODS,
  CONTACT_ROLES,
  COST_CATEGORIES,
  DIRECT_OVERHEAD_KINDS,
  DIRECT_OVERHEAD_SCOPES,
  EXPENSE_PAYMENT_STATUSES,
  EXPENSE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SERVICE_LINES,
  SOCIAL_SECURITY_TYPES,
  SUPPLIER_CATEGORIES,
  TAX_ID_TYPES,
  TAX_TYPES,
  VALID_CURRENCIES
} from '@/lib/finance/contracts'

export type {
  AccountType,
  AllocationMethodValue,
  ContactRole,
  CostCategoryValue,
  DirectOverheadKind,
  DirectOverheadScope,
  ExpensePaymentStatus,
  ExpenseType,
  FinanceCurrency,
  PaymentMethod,
  PaymentStatus,
  ServiceLine,
  SocialSecurityType,
  SupplierCategory,
  TaxIdType,
  TaxType
} from '@/lib/finance/contracts'

export class FinanceValidationError extends Error {
  statusCode: number
  details?: unknown
  code?: string

  constructor(message: string, statusCode = 400, details?: unknown, code?: string) {
    super(message)
    this.name = 'FinanceValidationError'
    this.statusCode = statusCode
    this.details = details
    this.code = code
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

  if (value && typeof value === 'object') {
    // BigQuery NUMERIC columns return Big.js instances with valueOf/toNumber
    if (typeof (value as Record<string, unknown>).valueOf === 'function') {
      const primitive = (value as { valueOf: () => unknown }).valueOf()

      if (typeof primitive === 'number') {
        return Number.isFinite(primitive) ? primitive : 0
      }

      if (typeof primitive === 'string') {
        const parsed = Number(primitive)

        return Number.isFinite(parsed) ? parsed : 0
      }
    }

    // BigQueryTimestamp / BigQueryDate with { value: ... }
    if ('value' in value) {
      return toNumber((value as { value?: unknown }).value)
    }
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

export const toDateString = (value: { value?: string } | string | Date | null) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

export const toTimestampString = (value: { value?: string } | string | Date | null) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

export const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const roundDecimal = (value: number, decimals: number) => {
  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}

export const invertExchangeRate = ({
  rate,
  decimals = 6
}: {
  rate: number
  decimals?: number
}) => {
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0
  }

  return roundDecimal(1 / rate, decimals)
}

export const normalizeString = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim()
  }

  return value ? String(value).trim() : ''
}

export const normalizeBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1) return true
  if (value === 'false' || value === 0) return false

  return false
}

export const assertValidCurrency = (currency: string): FinanceCurrency => {
  const upper = currency.toUpperCase().trim()

  if (!VALID_CURRENCIES.includes(upper as FinanceCurrency)) {
    throw new FinanceValidationError(`Invalid currency: ${currency}. Must be CLP or USD.`)
  }

  return upper as FinanceCurrency
}

export const assertPositiveAmount = (value: number, fieldName: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new FinanceValidationError(`${fieldName} must be a non-negative number.`)
  }

  return roundCurrency(value)
}

export const assertNonEmptyString = (value: unknown, fieldName: string): string => {
  const s = normalizeString(value)

  if (!s) {
    throw new FinanceValidationError(`${fieldName} is required.`)
  }

  return s
}

export const assertDateString = (value: unknown, fieldName: string): string => {
  const s = normalizeString(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new FinanceValidationError(`${fieldName} must be a valid date (YYYY-MM-DD).`)
  }

  return s
}

export const assertValidTaxIdType = (taxIdType: unknown): TaxIdType => {
  const upper = normalizeString(taxIdType).toUpperCase()

  if (!TAX_ID_TYPES.includes(upper as TaxIdType)) {
    throw new FinanceValidationError(`Invalid taxIdType: ${normalizeString(taxIdType)}.`)
  }

  return upper as TaxIdType
}

export const runFinanceQuery = async <T>(query: string, params?: Record<string, unknown>): Promise<T[]> => {
  const bigQuery = getBigQueryClient()

  // BigQuery throws on null params when it cannot infer the type.
  // Replace null/undefined with empty string — the normalisation layer
  // already treats '' and null identically on read.
  const safeParams = params
    ? Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value ?? ''])
      )
    : undefined

  const [rows] = await bigQuery.query({ query, params: safeParams })

  return rows as T[]
}

export const getFinanceProjectId = () => getBigQueryProjectId()

export const getLatestExchangeRate = async ({
  fromCurrency,
  toCurrency
}: {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
}) => {
  const { getLatestStoredExchangeRatePair, syncDailyUsdClpExchangeRate } = await import('@/lib/finance/exchange-rates')

  const latest = await getLatestStoredExchangeRatePair({ fromCurrency, toCurrency })

  if (latest && latest.rate > 0) {
    return latest.rate
  }

  const supportsAutoSync =
    (fromCurrency === 'USD' && toCurrency === 'CLP') ||
    (fromCurrency === 'CLP' && toCurrency === 'USD')

  if (!supportsAutoSync) {
    return null
  }

  const syncResult = await syncDailyUsdClpExchangeRate()

  if (!syncResult.synced) {
    return null
  }

  const synced = await getLatestStoredExchangeRatePair({ fromCurrency, toCurrency })

  return synced && synced.rate > 0 ? synced.rate : null
}

const EXCHANGE_RATE_STALE_DAYS = 7

export const resolveExchangeRateToClp = async ({
  currency,
  requestedRate
}: {
  currency: FinanceCurrency
  requestedRate?: unknown
}) => {
  const normalizedRequestedRate = toNumber(requestedRate)

  if (currency === 'CLP') {
    return 1
  }

  if (normalizedRequestedRate > 0) {
    return roundCurrency(normalizedRequestedRate)
  }

  const latestRate = await getLatestExchangeRate({ fromCurrency: currency, toCurrency: 'CLP' })

  if (!latestRate) {
    throw new FinanceValidationError(`Missing ${currency}/CLP exchange rate. Provide exchangeRateToClp or register a rate first.`, 409)
  }

  return roundCurrency(latestRate)
}

/**
 * Check if the latest stored exchange rate is stale (older than EXCHANGE_RATE_STALE_DAYS).
 * Returns null if no rate exists, or a staleness report.
 */
export const checkExchangeRateStaleness = async (
  fromCurrency: FinanceCurrency = 'USD',
  toCurrency: FinanceCurrency = 'CLP'
): Promise<{ isStale: boolean; rateDateIso: string | null; ageDays: number; thresholdDays: number } | null> => {
  try {
    const { getLatestFinanceExchangeRateFromPostgres } = await import('@/lib/finance/postgres-store')

    const latest = await getLatestFinanceExchangeRateFromPostgres({ fromCurrency, toCurrency })

    if (!latest) return null

    const rateDate = new Date(latest.rateDate)
    const ageDays = Math.floor((Date.now() - rateDate.getTime()) / 86_400_000)

    return {
      isStale: ageDays > EXCHANGE_RATE_STALE_DAYS,
      rateDateIso: latest.rateDate,
      ageDays,
      thresholdDays: EXCHANGE_RATE_STALE_DAYS
    }
  } catch {
    return null
  }
}

export const buildMonthlySequenceId = async ({
  tableName,
  idColumn,
  prefix,
  period
}: {
  tableName: string
  idColumn: string
  prefix: string
  period: string
}) => {
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<{ next_seq: unknown }>(`
    SELECT COALESCE(MAX(CAST(REGEXP_EXTRACT(${idColumn}, @sequencePattern) AS INT64)), 0) + 1 AS next_seq
    FROM \`${projectId}.greenhouse.${tableName}\`
    WHERE REGEXP_CONTAINS(${idColumn}, @idPattern)
  `, {
    sequencePattern: `^${prefix}-${period}-(\\d{3})$`,
    idPattern: `^${prefix}-${period}-\\d{3}$`
  })

  const nextSeq = Math.max(1, Math.trunc(toNumber(rows[0]?.next_seq)))

  return `${prefix}-${period}-${String(nextSeq).padStart(3, '0')}`
}
