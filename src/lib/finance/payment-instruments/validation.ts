import {
  DEFAULT_FOR_OPTIONS,
  INSTRUMENT_CATEGORIES,
  getProvider,
  type InstrumentCategory
} from '@/config/payment-instruments'
import {
  ACCOUNT_TYPES,
  FinanceValidationError,
  assertValidCurrency,
  normalizeString,
  toNullableNumber,
  toNumber,
  type AccountType,
  type FinanceCurrency
} from '@/lib/finance/shared'

const SECRET_KEY_PATTERN = /(token|secret|password|credential|webhook|bearer|api[_-]?key|private[_-]?key)/i
const VALID_CARD_NETWORKS = new Set(['visa', 'mastercard', 'amex', 'diners', 'discover'])
const DEFAULT_FOR_VALUES = new Set(DEFAULT_FOR_OPTIONS.map(option => option.value))

export type PaymentInstrumentUpdateInput = {
  accountName?: string
  bankName?: string
  currency?: FinanceCurrency
  accountType?: AccountType
  country?: string
  isActive?: boolean
  openingBalance?: number
  openingBalanceDate?: string | null
  accountNumber?: string | null
  accountNumberFull?: string | null
  notes?: string | null
  instrumentCategory?: InstrumentCategory
  providerSlug?: string | null
  providerIdentifier?: string | null
  cardLastFour?: string | null
  cardNetwork?: string | null
  creditLimit?: number | null
  responsibleUserId?: string | null
  defaultFor?: string[]
  displayOrder?: number
  metadataJson?: Record<string, string | number | boolean | null>
}

export const sanitizeMetadataJson = (value: unknown) => {
  if (value === undefined) return undefined

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new FinanceValidationError('metadataJson debe ser un objeto simple.', 422)
  }

  const entries = Object.entries(value as Record<string, unknown>)

  if (entries.length > 30) {
    throw new FinanceValidationError('metadataJson no puede tener mas de 30 campos.', 422)
  }

  return entries.reduce<Record<string, string | number | boolean | null>>((acc, [rawKey, rawValue]) => {
    const key = normalizeString(rawKey)

    if (!key || SECRET_KEY_PATTERN.test(key)) {
      throw new FinanceValidationError('metadataJson no puede contener claves sensibles.', 422)
    }

    if (rawValue == null) {
      acc[key] = null

      return acc
    }

    if (!['string', 'number', 'boolean'].includes(typeof rawValue)) {
      throw new FinanceValidationError('metadataJson solo acepta valores simples.', 422)
    }

    if (typeof rawValue === 'string' && rawValue.length > 500) {
      throw new FinanceValidationError('metadataJson contiene un valor demasiado largo.', 422)
    }

    acc[key] = rawValue as string | number | boolean

    return acc
  }, {})
}

export const validateProviderForInstrument = ({
  providerSlug,
  instrumentCategory,
  currency
}: {
  providerSlug: string | null
  instrumentCategory: string
  currency?: string
}) => {
  if (!providerSlug) return

  const provider = getProvider(providerSlug)

  if (!provider) {
    throw new FinanceValidationError('Proveedor no reconocido para el instrumento.', 422)
  }

  if (provider.category !== instrumentCategory) {
    throw new FinanceValidationError('El proveedor no corresponde a la categoria del instrumento.', 422)
  }

  if (currency && provider.currencies && !provider.currencies.includes(currency)) {
    throw new FinanceValidationError('La moneda no esta soportada por el proveedor seleccionado.', 422)
  }
}

export const parsePaymentInstrumentUpdate = (body: Record<string, unknown>): PaymentInstrumentUpdateInput => {
  const updates: PaymentInstrumentUpdateInput = {}

  if (body.accountName !== undefined) updates.accountName = normalizeString(body.accountName)
  if (body.bankName !== undefined) updates.bankName = normalizeString(body.bankName)

  if (body.currency !== undefined) {
    updates.currency = assertValidCurrency(normalizeString(body.currency))
  }

  if (body.accountType !== undefined) {
    const accountType = normalizeString(body.accountType)

    if (!ACCOUNT_TYPES.includes(accountType as AccountType)) {
      throw new FinanceValidationError(`accountType debe ser uno de: ${ACCOUNT_TYPES.join(', ')}`, 422)
    }

    updates.accountType = accountType as AccountType
  }

  if (body.instrumentCategory !== undefined) {
    const instrumentCategory = normalizeString(body.instrumentCategory)

    if (!INSTRUMENT_CATEGORIES.includes(instrumentCategory as InstrumentCategory)) {
      throw new FinanceValidationError(`instrumentCategory debe ser uno de: ${INSTRUMENT_CATEGORIES.join(', ')}`, 422)
    }

    updates.instrumentCategory = instrumentCategory as InstrumentCategory
  }

  if (body.country !== undefined) updates.country = normalizeString(body.country) || 'CL'
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive)
  if (body.openingBalance !== undefined) updates.openingBalance = toNumber(body.openingBalance)
  if (body.openingBalanceDate !== undefined) updates.openingBalanceDate = body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null
  if (body.accountNumber !== undefined) updates.accountNumber = body.accountNumber ? normalizeString(body.accountNumber) : null
  if (body.accountNumberFull !== undefined) updates.accountNumberFull = body.accountNumberFull ? normalizeString(body.accountNumberFull) : null
  if (body.notes !== undefined) updates.notes = body.notes ? normalizeString(body.notes) : null
  if (body.providerSlug !== undefined) updates.providerSlug = body.providerSlug ? normalizeString(body.providerSlug) : null
  if (body.providerIdentifier !== undefined) updates.providerIdentifier = body.providerIdentifier ? normalizeString(body.providerIdentifier) : null

  if (body.cardLastFour !== undefined) {
    const cardLastFour = body.cardLastFour ? normalizeString(body.cardLastFour) : null

    if (cardLastFour && !/^\d{4}$/.test(cardLastFour)) {
      throw new FinanceValidationError('cardLastFour debe tener exactamente 4 digitos.', 422)
    }

    updates.cardLastFour = cardLastFour
  }

  if (body.cardNetwork !== undefined) {
    const cardNetwork = body.cardNetwork ? normalizeString(body.cardNetwork).toLowerCase() : null

    if (cardNetwork && !VALID_CARD_NETWORKS.has(cardNetwork)) {
      throw new FinanceValidationError('cardNetwork no es una red valida.', 422)
    }

    updates.cardNetwork = cardNetwork
  }

  if (body.creditLimit !== undefined) {
    const creditLimit = toNullableNumber(body.creditLimit)

    if (creditLimit != null && creditLimit < 0) {
      throw new FinanceValidationError('creditLimit no puede ser negativo.', 422)
    }

    updates.creditLimit = creditLimit
  }

  if (body.responsibleUserId !== undefined) updates.responsibleUserId = body.responsibleUserId ? normalizeString(body.responsibleUserId) : null

  if (body.defaultFor !== undefined) {
    if (!Array.isArray(body.defaultFor)) {
      throw new FinanceValidationError('defaultFor debe ser una lista.', 422)
    }

    const values = body.defaultFor.map(item => normalizeString(item)).filter(Boolean)
    const invalid = values.find(item => !DEFAULT_FOR_VALUES.has(item as (typeof DEFAULT_FOR_OPTIONS)[number]['value']))

    if (invalid) {
      throw new FinanceValidationError(`defaultFor contiene un valor no valido: ${invalid}.`, 422)
    }

    updates.defaultFor = Array.from(new Set(values))
  }

  if (body.displayOrder !== undefined) updates.displayOrder = toNumber(body.displayOrder)
  if (body.metadataJson !== undefined) updates.metadataJson = sanitizeMetadataJson(body.metadataJson)

  validateProviderForInstrument({
    providerSlug: updates.providerSlug ?? null,
    instrumentCategory: updates.instrumentCategory ?? normalizeString(body.currentInstrumentCategory) ?? 'bank_account',
    currency: updates.currency
  })

  return updates
}

export const validateReason = (value: unknown, label = 'reason') => {
  const reason = normalizeString(value)

  if (reason.length < 8) {
    throw new FinanceValidationError(`${label} debe explicar el motivo con al menos 8 caracteres.`, 422)
  }

  if (reason.length > 500) {
    throw new FinanceValidationError(`${label} no puede superar 500 caracteres.`, 422)
  }

  return reason
}
