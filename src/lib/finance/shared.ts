import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export class FinanceValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'FinanceValidationError'
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

export const roundCurrency = (value: number) => Math.round(value * 100) / 100

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

export type FinanceCurrency = 'CLP' | 'USD'

export const VALID_CURRENCIES: FinanceCurrency[] = ['CLP', 'USD']

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

export const ACCOUNT_TYPES = ['checking', 'savings', 'paypal', 'wise', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const PAYMENT_METHODS = ['transfer', 'credit_card', 'paypal', 'wise', 'check', 'cash', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const EXPENSE_TYPES = ['supplier', 'payroll', 'social_security', 'tax', 'miscellaneous'] as const
export type ExpenseType = (typeof EXPENSE_TYPES)[number]

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'written_off'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const EXPENSE_PAYMENT_STATUSES = ['pending', 'scheduled', 'paid', 'overdue', 'cancelled'] as const
export type ExpensePaymentStatus = (typeof EXPENSE_PAYMENT_STATUSES)[number]

export const SERVICE_LINES = ['globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'] as const
export type ServiceLine = (typeof SERVICE_LINES)[number]

export const SUPPLIER_CATEGORIES = [
  'software', 'infrastructure', 'professional_services', 'media',
  'creative', 'hr_services', 'office', 'legal_accounting', 'other'
] as const
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number]

export const TAX_ID_TYPES = ['RUT', 'NIT', 'RFC', 'RUC', 'EIN', 'OTHER'] as const
export type TaxIdType = (typeof TAX_ID_TYPES)[number]

export const CONTACT_ROLES = ['procurement', 'accounts_payable', 'finance_director', 'controller', 'other'] as const
export type ContactRole = (typeof CONTACT_ROLES)[number]

export const runFinanceQuery = async <T>(query: string, params?: Record<string, unknown>): Promise<T[]> => {
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({ query, params })

  return rows as T[]
}

export const getFinanceProjectId = () => getBigQueryProjectId()
