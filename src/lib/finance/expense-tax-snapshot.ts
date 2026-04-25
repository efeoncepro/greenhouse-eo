import 'server-only'

import { parsePersistedTaxSnapshot } from '@/lib/finance/pricing/quotation-tax-snapshot'
import { FinanceValidationError, roundCurrency } from '@/lib/finance/shared'
import {
  computeChileTaxSnapshot,
  resolveChileTaxCode,
  type ChileTaxCodeId,
  type ChileTaxSnapshot,
  type TaxCodeRecord,
  type TaxRecoverability
} from '@/lib/tax/chile'

export const EXPENSE_TAX_CODES = [
  'cl_input_vat_credit_19',
  'cl_input_vat_non_recoverable_19',
  'cl_vat_exempt',
  'cl_vat_non_billable'
] as const

export type ExpenseTaxCode = (typeof EXPENSE_TAX_CODES)[number]

export interface ExpenseTaxSnapshotColumns {
  taxCode: ExpenseTaxCode
  taxRecoverability: TaxRecoverability
  taxRateSnapshot: number | null
  taxAmountSnapshot: number
  taxSnapshot: ChileTaxSnapshot
  isTaxExempt: boolean
  taxSnapshotFrozenAt: string
  recoverableTaxAmount: number
  nonRecoverableTaxAmount: number
  effectiveCostAmount: number
}

export interface ExpenseTaxWriteFields extends ExpenseTaxSnapshotColumns {
  taxRate: number
  taxAmount: number
  totalAmount: number
  recoverableTaxAmountClp: number
  nonRecoverableTaxAmountClp: number
  effectiveCostAmountClp: number
}

export interface BuildExpenseTaxSnapshotInput {
  subtotal: number
  exchangeRateToClp: number
  taxCode?: string | null
  taxRate?: number | null
  taxAmount?: number | null
  totalAmount?: number | null
  dteTypeCode?: string | null
  exemptAmount?: number | null
  vatUnrecoverableAmount?: number | null
  vatCommonUseAmount?: number | null
  vatFixedAssetsAmount?: number | null
  sourceSnapshot?: ChileTaxSnapshot | null
  spaceId?: string | null
  issuedAt?: Date | string
}

const TAX_RECOVERABLE_CODE: ExpenseTaxCode = 'cl_input_vat_credit_19'
const TAX_NON_RECOVERABLE_CODE: ExpenseTaxCode = 'cl_input_vat_non_recoverable_19'
const TAX_EXEMPT_CODE: ExpenseTaxCode = 'cl_vat_exempt'
const TAX_NON_BILLABLE_CODE: ExpenseTaxCode = 'cl_vat_non_billable'

const STATIC_EXPENSE_TAX_RECORDS: Record<ExpenseTaxCode, TaxCodeRecord> = {
  cl_input_vat_credit_19: {
    id: 'cl_input_vat_credit_19',
    taxCode: 'cl_input_vat_credit_19',
    jurisdiction: 'CL',
    kind: 'vat_input_credit',
    rate: 0.19,
    recoverability: 'full',
    labelEs: 'IVA credito fiscal 19%',
    labelEn: 'Input VAT credit 19%',
    description: 'Canonical Chile input VAT 19% with fiscal credit.',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-532-static-fallback' }
  },
  cl_input_vat_non_recoverable_19: {
    id: 'cl_input_vat_non_recoverable_19',
    taxCode: 'cl_input_vat_non_recoverable_19',
    jurisdiction: 'CL',
    kind: 'vat_input_non_recoverable',
    rate: 0.19,
    recoverability: 'none',
    labelEs: 'IVA no recuperable 19%',
    labelEn: 'Input VAT non-recoverable 19%',
    description: 'Canonical Chile input VAT 19% without fiscal credit.',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-532-static-fallback' }
  },
  cl_vat_exempt: {
    id: 'cl_vat_exempt',
    taxCode: 'cl_vat_exempt',
    jurisdiction: 'CL',
    kind: 'vat_exempt',
    rate: null,
    recoverability: 'not_applicable',
    labelEs: 'IVA exento',
    labelEn: 'VAT exempt',
    description: 'Canonical Chile exempt purchase tax.',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-532-static-fallback' }
  },
  cl_vat_non_billable: {
    id: 'cl_vat_non_billable',
    taxCode: 'cl_vat_non_billable',
    jurisdiction: 'CL',
    kind: 'vat_non_billable',
    rate: null,
    recoverability: 'not_applicable',
    labelEs: 'No afecto a IVA',
    labelEn: 'Non-billable VAT',
    description: 'Canonical Chile non-billable purchase tax.',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-532-static-fallback' }
  }
}

const toRoundedNullable = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? roundCurrency(parsed) : null
}

const isExpenseTaxCode = (value: unknown): value is ExpenseTaxCode =>
  typeof value === 'string' && (EXPENSE_TAX_CODES as readonly string[]).includes(value)

const normalizeExplicitExpenseTaxCode = (value: unknown): ExpenseTaxCode | null => {
  if (value === 'cl_vat_19') return TAX_RECOVERABLE_CODE
  if (isExpenseTaxCode(value)) return value

  return null
}

const inferExpenseTaxCode = ({
  taxCode,
  taxRate,
  taxAmount,
  totalAmount,
  subtotal,
  dteTypeCode,
  exemptAmount,
  vatUnrecoverableAmount,
  vatCommonUseAmount
}: {
  taxCode?: string | null
  taxRate?: number | null
  taxAmount?: number | null
  totalAmount?: number | null
  subtotal: number
  dteTypeCode?: string | null
  exemptAmount?: number | null
  vatUnrecoverableAmount?: number | null
  vatCommonUseAmount?: number | null
}): ExpenseTaxCode => {
  const explicit = normalizeExplicitExpenseTaxCode(taxCode)

  if (explicit) return explicit

  const roundedRate = toRoundedNullable(taxRate)
  const roundedTaxAmount = toRoundedNullable(taxAmount) ?? 0
  const roundedTotalAmount = toRoundedNullable(totalAmount)
  const roundedExemptAmount = toRoundedNullable(exemptAmount) ?? 0
  const roundedVatUnrecoverable = toRoundedNullable(vatUnrecoverableAmount) ?? 0
  const roundedVatCommonUse = toRoundedNullable(vatCommonUseAmount) ?? 0

  const inferredTaxDelta =
    roundedTotalAmount !== null ? roundCurrency(roundedTotalAmount - roundCurrency(subtotal)) : null

  if (dteTypeCode === '34' || roundedExemptAmount > 0) {
    return TAX_EXEMPT_CODE
  }

  if (roundedVatUnrecoverable > 0 || roundedVatCommonUse > 0) {
    if ((roundedTaxAmount > 0 && roundedVatUnrecoverable < roundedTaxAmount) || roundedVatCommonUse > 0) {
      return TAX_RECOVERABLE_CODE
    }

    return TAX_NON_RECOVERABLE_CODE
  }

  if (roundedTaxAmount > 0) return TAX_RECOVERABLE_CODE
  if (roundedRate !== null && Math.abs(roundedRate - 0.19) < 0.0001) return TAX_RECOVERABLE_CODE
  if (inferredTaxDelta !== null && inferredTaxDelta > 0) return TAX_RECOVERABLE_CODE

  return TAX_NON_BILLABLE_CODE
}

const resolveStaticExpenseTaxRecord = (taxCode: ExpenseTaxCode): TaxCodeRecord =>
  STATIC_EXPENSE_TAX_RECORDS[taxCode]

const cloneRecordWithRecoverability = (
  record: TaxCodeRecord,
  recoverability: TaxRecoverability,
  metadata: Record<string, unknown>
): TaxCodeRecord => ({
  ...record,
  recoverability,
  metadata: {
    ...record.metadata,
    ...metadata
  }
})

const deriveRecoverability = ({
  taxAmount,
  vatUnrecoverableAmount,
  vatCommonUseAmount,
  record
}: {
  taxAmount: number
  vatUnrecoverableAmount: number
  vatCommonUseAmount: number
  record: TaxCodeRecord
}): TaxRecoverability => {
  if (record.kind === 'vat_exempt' || record.kind === 'vat_non_billable') {
    return 'not_applicable'
  }

  if (vatUnrecoverableAmount >= taxAmount && taxAmount > 0) {
    return 'none'
  }

  if ((vatUnrecoverableAmount > 0 && vatUnrecoverableAmount < taxAmount) || vatCommonUseAmount > 0) {
    return 'partial'
  }

  if (record.kind === 'vat_input_non_recoverable') {
    return 'none'
  }

  return record.recoverability
}

const deriveTaxBuckets = ({
  subtotal,
  taxAmount,
  taxRecoverability,
  vatUnrecoverableAmount
}: {
  subtotal: number
  taxAmount: number
  taxRecoverability: TaxRecoverability
  vatUnrecoverableAmount: number
}) => {
  const normalizedTaxAmount = roundCurrency(taxAmount)
  const normalizedVatUnrecoverable = Math.min(normalizedTaxAmount, roundCurrency(vatUnrecoverableAmount))

  const nonRecoverableTaxAmount =
    taxRecoverability === 'none'
      ? normalizedTaxAmount
      : taxRecoverability === 'partial'
        ? normalizedVatUnrecoverable
        : 0

  const recoverableTaxAmount =
    taxRecoverability === 'not_applicable'
      ? 0
      : Math.max(0, roundCurrency(normalizedTaxAmount - nonRecoverableTaxAmount))

  return {
    recoverableTaxAmount,
    nonRecoverableTaxAmount,
    effectiveCostAmount: roundCurrency(subtotal + nonRecoverableTaxAmount)
  }
}

const buildInheritedExpenseTaxSnapshot = (
  input: BuildExpenseTaxSnapshotInput,
  sourceSnapshot: ChileTaxSnapshot
): ExpenseTaxSnapshotColumns => {
  const subtotal = roundCurrency(input.subtotal)
  const vatUnrecoverableAmount = Math.max(0, toRoundedNullable(input.vatUnrecoverableAmount) ?? 0)
  const vatCommonUseAmount = Math.max(0, toRoundedNullable(input.vatCommonUseAmount) ?? 0)
  const taxRecoverability = sourceSnapshot.recoverability
  const taxAmountSnapshot = roundCurrency(sourceSnapshot.taxAmount)

  const { recoverableTaxAmount, nonRecoverableTaxAmount, effectiveCostAmount } = deriveTaxBuckets({
    subtotal,
    taxAmount: taxAmountSnapshot,
    taxRecoverability,
    vatUnrecoverableAmount
  })

  const taxSnapshot: ChileTaxSnapshot = {
    ...sourceSnapshot,
    taxableAmount: subtotal,
    taxAmount: taxAmountSnapshot,
    totalAmount: roundCurrency(subtotal + taxAmountSnapshot),
    metadata: {
      ...sourceSnapshot.metadata,
      inheritedIntoExpense: true,
      vatUnrecoverableAmount,
      vatCommonUseAmount,
      recoverableTaxAmount,
      nonRecoverableTaxAmount,
      effectiveCostAmount
    }
  }

  const normalizedTaxCode = normalizeExplicitExpenseTaxCode(sourceSnapshot.taxCode) ?? TAX_RECOVERABLE_CODE

  return {
    taxCode: normalizedTaxCode,
    taxRecoverability,
    taxRateSnapshot: sourceSnapshot.rate,
    taxAmountSnapshot,
    taxSnapshot,
    isTaxExempt: sourceSnapshot.kind === 'vat_exempt' || sourceSnapshot.kind === 'vat_non_billable',
    taxSnapshotFrozenAt: sourceSnapshot.frozenAt,
    recoverableTaxAmount,
    nonRecoverableTaxAmount,
    effectiveCostAmount
  }
}

export const buildExpenseTaxSnapshot = async (
  input: BuildExpenseTaxSnapshotInput
): Promise<ExpenseTaxSnapshotColumns> => {
  const subtotal = roundCurrency(input.subtotal)

  if (subtotal < 0) {
    throw new FinanceValidationError('subtotal must be a non-negative number.')
  }

  if (input.sourceSnapshot) {
    return buildInheritedExpenseTaxSnapshot(input, input.sourceSnapshot)
  }

  const resolvedTaxCode = inferExpenseTaxCode({
    taxCode: input.taxCode,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    subtotal,
    dteTypeCode: input.dteTypeCode,
    exemptAmount: input.exemptAmount,
    vatUnrecoverableAmount: input.vatUnrecoverableAmount,
    vatCommonUseAmount: input.vatCommonUseAmount
  })

  let baseRecord = resolveStaticExpenseTaxRecord(resolvedTaxCode)

  if (input.spaceId != null) {
    try {
      baseRecord = await resolveChileTaxCode(resolvedTaxCode, {
        spaceId: input.spaceId ?? null,
        at: input.issuedAt
      })
    } catch {
      // Keep the canonical static fallback for the 4 Chile purchase VAT codes when
      // the tax catalog is unavailable in tests or degraded local runtimes.
      baseRecord = resolveStaticExpenseTaxRecord(resolvedTaxCode)
    }
  }

  const vatUnrecoverableAmount = Math.max(0, toRoundedNullable(input.vatUnrecoverableAmount) ?? 0)
  const vatCommonUseAmount = Math.max(0, toRoundedNullable(input.vatCommonUseAmount) ?? 0)
  const vatFixedAssetsAmount = Math.max(0, toRoundedNullable(input.vatFixedAssetsAmount) ?? 0)

  const taxRecoverability = deriveRecoverability({
    taxAmount: roundCurrency(toRoundedNullable(input.taxAmount) ?? subtotal * (baseRecord.rate ?? 0)),
    vatUnrecoverableAmount,
    vatCommonUseAmount,
    record: baseRecord
  })

  const record = cloneRecordWithRecoverability(baseRecord, taxRecoverability, {
    vatUnrecoverableAmount,
    vatCommonUseAmount,
    vatFixedAssetsAmount
  })

  const taxSnapshot = computeChileTaxSnapshot({
    code: record,
    netAmount: subtotal,
    issuedAt: input.issuedAt
  })

  const { recoverableTaxAmount, nonRecoverableTaxAmount, effectiveCostAmount } = deriveTaxBuckets({
    subtotal,
    taxAmount: taxSnapshot.taxAmount,
    taxRecoverability,
    vatUnrecoverableAmount
  })

  return {
    taxCode: resolvedTaxCode,
    taxRecoverability,
    taxRateSnapshot: taxSnapshot.rate,
    taxAmountSnapshot: taxSnapshot.taxAmount,
    taxSnapshot: {
      ...taxSnapshot,
      metadata: {
        ...taxSnapshot.metadata,
        vatUnrecoverableAmount,
        vatCommonUseAmount,
        vatFixedAssetsAmount,
        recoverableTaxAmount,
        nonRecoverableTaxAmount,
        effectiveCostAmount
      }
    },
    isTaxExempt: record.kind === 'vat_exempt' || record.kind === 'vat_non_billable',
    taxSnapshotFrozenAt: taxSnapshot.frozenAt,
    recoverableTaxAmount,
    nonRecoverableTaxAmount,
    effectiveCostAmount
  }
}

export const buildExpenseTaxWriteFields = async (
  input: BuildExpenseTaxSnapshotInput
): Promise<ExpenseTaxWriteFields> => {
  const snapshotColumns = await buildExpenseTaxSnapshot(input)
  const providedTaxAmount = toRoundedNullable(input.taxAmount)
  const providedTotalAmount = toRoundedNullable(input.totalAmount)
  const expectedTaxAmount = roundCurrency(snapshotColumns.taxAmountSnapshot)
  const expectedTotalAmount = roundCurrency(snapshotColumns.taxSnapshot.totalAmount)
  const exchangeRateToClp = roundCurrency(input.exchangeRateToClp)

  if (!Number.isFinite(exchangeRateToClp) || exchangeRateToClp <= 0) {
    throw new FinanceValidationError('exchangeRateToClp must be a positive number.')
  }

  if (providedTaxAmount !== null && Math.abs(providedTaxAmount - expectedTaxAmount) > 1) {
    throw new FinanceValidationError(
      `taxAmount does not match the resolved expense tax snapshot (${expectedTaxAmount}).`
    )
  }

  if (providedTotalAmount !== null && Math.abs(providedTotalAmount - expectedTotalAmount) > 1) {
    throw new FinanceValidationError(
      `totalAmount does not match the resolved expense tax snapshot (${expectedTotalAmount}).`
    )
  }

  return {
    ...snapshotColumns,
    taxRate: snapshotColumns.taxRateSnapshot ?? 0,
    taxAmount: expectedTaxAmount,
    totalAmount: expectedTotalAmount,
    recoverableTaxAmountClp: roundCurrency(snapshotColumns.recoverableTaxAmount * exchangeRateToClp),
    nonRecoverableTaxAmountClp: roundCurrency(snapshotColumns.nonRecoverableTaxAmount * exchangeRateToClp),
    effectiveCostAmountClp: roundCurrency(snapshotColumns.effectiveCostAmount * exchangeRateToClp)
  }
}

export const parsePersistedExpenseTaxSnapshot = (raw: unknown): ChileTaxSnapshot | null =>
  parsePersistedTaxSnapshot(raw)

export const serializeExpenseTaxSnapshot = (snapshot: ChileTaxSnapshot): string =>
  JSON.stringify(snapshot)

export const resolveExpenseTaxRecordFromSnapshot = async (
  snapshot: ChileTaxSnapshot | null | undefined,
  fallbackTaxCode?: string | null
): Promise<TaxCodeRecord | null> => {
  const resolvedTaxCode = normalizeExplicitExpenseTaxCode(snapshot?.taxCode ?? fallbackTaxCode)

  if (!resolvedTaxCode) return null

  return resolveChileTaxCode(resolvedTaxCode as ChileTaxCodeId, {
    at: snapshot?.effectiveFrom ?? undefined
  })
}
