import {
  normalizeString,
  toDateString,
  toNumber,
  toTimestampString
} from '@/lib/finance/shared'

import type {
  PaymentInstrumentAccountRow,
  PaymentInstrumentRecord,
  PaymentInstrumentSafeRecord,
  PaymentInstrumentSensitiveField
} from './types'

const SENSITIVE_FIELDS: PaymentInstrumentSensitiveField[] = ['accountNumberFull', 'providerIdentifier']

export const maskSensitiveValue = (value: string | null | undefined) => {
  const normalized = normalizeString(value)

  if (!normalized) return null

  if (normalized.length <= 4) {
    return '••••'
  }

  return `•••• ${normalized.slice(-4)}`
}

export const mapPaymentInstrumentAccountRow = (
  row: PaymentInstrumentAccountRow
): PaymentInstrumentRecord => ({
  accountId: normalizeString(row.account_id),
  spaceId: row.space_id ? normalizeString(row.space_id) : null,
  accountName: normalizeString(row.account_name),
  bankName: normalizeString(row.bank_name),
  accountNumber: row.account_number ? normalizeString(row.account_number) : null,
  accountNumberFull: row.account_number_full ? normalizeString(row.account_number_full) : null,
  currency: normalizeString(row.currency),
  accountType: normalizeString(row.account_type),
  country: normalizeString(row.country_code) || 'CL',
  isActive: Boolean(row.is_active),
  openingBalance: toNumber(row.opening_balance),
  openingBalanceDate: toDateString(row.opening_balance_date as string | { value?: string } | null),
  notes: row.notes ? normalizeString(row.notes) : null,
  instrumentCategory: normalizeString(row.instrument_category) || 'bank_account',
  providerSlug: row.provider_slug ? normalizeString(row.provider_slug) : null,
  providerIdentifier: row.provider_identifier ? normalizeString(row.provider_identifier) : null,
  cardLastFour: row.card_last_four ? normalizeString(row.card_last_four) : null,
  cardNetwork: row.card_network ? normalizeString(row.card_network) : null,
  creditLimit: row.credit_limit != null ? toNumber(row.credit_limit) : null,
  responsibleUserId: row.responsible_user_id ? normalizeString(row.responsible_user_id) : null,
  defaultFor: Array.isArray(row.default_for) ? row.default_for : [],
  displayOrder: toNumber(row.display_order),
  metadataJson: typeof row.metadata_json === 'object' && row.metadata_json
    ? row.metadata_json as Record<string, unknown>
    : {},
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

export const serializePaymentInstrumentSafe = (
  record: PaymentInstrumentRecord
): PaymentInstrumentSafeRecord => ({
  ...record,
  accountNumber: maskSensitiveValue(record.accountNumber),
  accountNumberFull: null,
  providerIdentifier: maskSensitiveValue(record.providerIdentifier),
  sensitiveFields: {
    accountNumberFull: {
      available: Boolean(record.accountNumberFull),
      maskedValue: maskSensitiveValue(record.accountNumberFull)
    },
    providerIdentifier: {
      available: Boolean(record.providerIdentifier),
      maskedValue: maskSensitiveValue(record.providerIdentifier)
    }
  }
})

export const serializePaymentInstrumentAuditSnapshot = (record: PaymentInstrumentRecord | null) => {
  if (!record) return null

  const safe = serializePaymentInstrumentSafe(record)

  return SENSITIVE_FIELDS.reduce<Record<string, unknown>>((snapshot, field) => {
    snapshot[field] = safe.sensitiveFields[field]

    return snapshot
  }, {
    accountId: safe.accountId,
    spaceId: safe.spaceId,
    accountName: safe.accountName,
    bankName: safe.bankName,
    currency: safe.currency,
    accountType: safe.accountType,
    country: safe.country,
    isActive: safe.isActive,
    instrumentCategory: safe.instrumentCategory,
    providerSlug: safe.providerSlug,
    cardLastFour: safe.cardLastFour,
    cardNetwork: safe.cardNetwork,
    creditLimit: safe.creditLimit,
    responsibleUserId: safe.responsibleUserId,
    defaultFor: safe.defaultFor,
    displayOrder: safe.displayOrder,
    metadataJson: safe.metadataJson,
    updatedAt: safe.updatedAt
  })
}
