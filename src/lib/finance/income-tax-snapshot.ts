import 'server-only'

import {
  QUOTE_TAX_CODE_LABELS,
  QUOTE_TAX_CODE_RATES,
  isQuoteTaxCodeValue,
  type QuoteTaxCodeValue
} from '@/lib/finance/pricing/quotation-tax-constants'
import { parsePersistedTaxSnapshot } from '@/lib/finance/pricing/quotation-tax-snapshot'
import { FinanceValidationError, roundCurrency } from '@/lib/finance/shared'
import {
  computeChileTaxSnapshot,
  resolveChileTaxCode,
  type ChileTaxSnapshot,
  type TaxCodeRecord
} from '@/lib/tax/chile'

export type IncomeTaxCode = QuoteTaxCodeValue

export interface IncomeTaxSnapshotColumns {
  taxCode: IncomeTaxCode
  taxRateSnapshot: number | null
  taxAmountSnapshot: number
  taxSnapshot: ChileTaxSnapshot
  isTaxExempt: boolean
  taxSnapshotFrozenAt: string
}

export interface IncomeTaxWriteFields extends IncomeTaxSnapshotColumns {
  taxRate: number
  taxAmount: number
  totalAmount: number
}

export interface BuildIncomeTaxSnapshotInput {
  subtotal: number
  taxCode?: string | null
  taxRate?: number | null
  taxAmount?: number | null
  totalAmount?: number | null
  dteTypeCode?: string | null
  exemptAmount?: number | null
  sourceSnapshot?: ChileTaxSnapshot | null
  spaceId?: string | null
  issuedAt?: Date | string
}

const TAX_OUTPUT_CODE: IncomeTaxCode = 'cl_vat_19'
const TAX_EXEMPT_CODE: IncomeTaxCode = 'cl_vat_exempt'

const STATIC_INCOME_TAX_RECORDS: Record<IncomeTaxCode, TaxCodeRecord> = {
  cl_vat_19: {
    id: 'cl_vat_19',
    taxCode: 'cl_vat_19',
    jurisdiction: 'CL',
    kind: 'vat_output',
    rate: QUOTE_TAX_CODE_RATES.cl_vat_19,
    recoverability: 'not_applicable',
    labelEs: QUOTE_TAX_CODE_LABELS.cl_vat_19,
    labelEn: 'VAT 19%',
    description: 'Canonical Chile output VAT 19%',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-531-static-fallback' }
  },
  cl_vat_exempt: {
    id: 'cl_vat_exempt',
    taxCode: 'cl_vat_exempt',
    jurisdiction: 'CL',
    kind: 'vat_exempt',
    rate: QUOTE_TAX_CODE_RATES.cl_vat_exempt,
    recoverability: 'not_applicable',
    labelEs: QUOTE_TAX_CODE_LABELS.cl_vat_exempt,
    labelEn: 'VAT Exempt',
    description: 'Canonical Chile VAT exempt output',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-531-static-fallback' }
  },
  cl_vat_non_billable: {
    id: 'cl_vat_non_billable',
    taxCode: 'cl_vat_non_billable',
    jurisdiction: 'CL',
    kind: 'vat_non_billable',
    rate: QUOTE_TAX_CODE_RATES.cl_vat_non_billable,
    recoverability: 'not_applicable',
    labelEs: QUOTE_TAX_CODE_LABELS.cl_vat_non_billable,
    labelEn: 'Non-billable VAT',
    description: 'Canonical Chile non-billable output',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    spaceId: null,
    metadata: { source: 'task-531-static-fallback' }
  }
}

const toRoundedNullable = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? roundCurrency(parsed) : null
}

const inferIncomeTaxCode = ({
  taxCode,
  taxRate,
  taxAmount,
  totalAmount,
  subtotal,
  dteTypeCode,
  exemptAmount
}: {
  taxCode?: string | null
  taxRate?: number | null
  taxAmount?: number | null
  totalAmount?: number | null
  subtotal: number
  dteTypeCode?: string | null
  exemptAmount?: number | null
}): IncomeTaxCode | null => {
  if (taxCode && isQuoteTaxCodeValue(taxCode)) {
    return taxCode
  }

  const roundedRate = toRoundedNullable(taxRate)
  const roundedTaxAmount = toRoundedNullable(taxAmount) ?? 0
  const roundedTotalAmount = toRoundedNullable(totalAmount)
  const roundedExemptAmount = toRoundedNullable(exemptAmount) ?? 0

  const inferredTaxDelta =
    roundedTotalAmount !== null ? roundCurrency(roundedTotalAmount - roundCurrency(subtotal)) : null

  if (roundedTaxAmount > 0) return TAX_OUTPUT_CODE
  if (roundedRate !== null && Math.abs(roundedRate - 0.19) < 0.0001) return TAX_OUTPUT_CODE
  if (inferredTaxDelta !== null && inferredTaxDelta > 0) return TAX_OUTPUT_CODE

  if (dteTypeCode === '34') return TAX_EXEMPT_CODE
  if (roundedExemptAmount > 0) return TAX_EXEMPT_CODE
  if (roundedRate === 0) return TAX_EXEMPT_CODE

  return null
}

const buildInheritedIncomeTaxSnapshot = (
  subtotal: number,
  sourceSnapshot: ChileTaxSnapshot
): IncomeTaxSnapshotColumns => {
  const taxableAmount = roundCurrency(subtotal)
  const appliesVat = sourceSnapshot.kind === 'vat_output' && sourceSnapshot.rate !== null

  const taxAmountSnapshot = appliesVat
    ? roundCurrency(taxableAmount * (sourceSnapshot.rate ?? 0))
    : 0

  const taxSnapshot: ChileTaxSnapshot = {
    ...sourceSnapshot,
    taxableAmount,
    taxAmount: taxAmountSnapshot,
    totalAmount: roundCurrency(taxableAmount + taxAmountSnapshot),
    metadata: {
      ...sourceSnapshot.metadata,
      inheritedIntoIncome: true,
      inheritedFromFrozenSource: true
    }
  }

  const taxCode = isQuoteTaxCodeValue(sourceSnapshot.taxCode)
    ? sourceSnapshot.taxCode
    : TAX_OUTPUT_CODE

  return {
    taxCode,
    taxRateSnapshot: sourceSnapshot.rate,
    taxAmountSnapshot,
    taxSnapshot,
    isTaxExempt: sourceSnapshot.kind === 'vat_exempt' || sourceSnapshot.kind === 'vat_non_billable',
    taxSnapshotFrozenAt: sourceSnapshot.frozenAt
  }
}

export const buildIncomeTaxSnapshot = async (
  input: BuildIncomeTaxSnapshotInput
): Promise<IncomeTaxSnapshotColumns> => {
  const subtotal = roundCurrency(input.subtotal)

  if (subtotal < 0) {
    throw new FinanceValidationError('subtotal must be a non-negative number.')
  }

  if (input.sourceSnapshot) {
    return buildInheritedIncomeTaxSnapshot(subtotal, input.sourceSnapshot)
  }

  const resolvedTaxCode = inferIncomeTaxCode({
    taxCode: input.taxCode,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    subtotal,
    dteTypeCode: input.dteTypeCode,
    exemptAmount: input.exemptAmount
  })

  if (!resolvedTaxCode) {
    throw new FinanceValidationError(
      'income tax requires an explicit taxCode or enough legacy tax inputs to infer one.'
    )
  }

  const record =
    input.spaceId == null && resolvedTaxCode in STATIC_INCOME_TAX_RECORDS
      ? STATIC_INCOME_TAX_RECORDS[resolvedTaxCode]
      : await resolveChileTaxCode(resolvedTaxCode, {
        spaceId: input.spaceId ?? null,
        at: input.issuedAt
      })

  const taxSnapshot = computeChileTaxSnapshot({
    code: record,
    netAmount: subtotal,
    issuedAt: input.issuedAt
  })

  return {
    taxCode: record.taxCode as IncomeTaxCode,
    taxRateSnapshot: taxSnapshot.rate,
    taxAmountSnapshot: taxSnapshot.taxAmount,
    taxSnapshot,
    isTaxExempt: record.kind === 'vat_exempt' || record.kind === 'vat_non_billable',
    taxSnapshotFrozenAt: taxSnapshot.frozenAt
  }
}

export const buildIncomeTaxWriteFields = async (
  input: BuildIncomeTaxSnapshotInput
): Promise<IncomeTaxWriteFields> => {
  const snapshotColumns = await buildIncomeTaxSnapshot(input)
  const providedTaxAmount = toRoundedNullable(input.taxAmount)
  const providedTotalAmount = toRoundedNullable(input.totalAmount)
  const expectedTaxAmount = roundCurrency(snapshotColumns.taxAmountSnapshot)
  const expectedTotalAmount = roundCurrency(snapshotColumns.taxSnapshot.totalAmount)

  if (providedTaxAmount !== null && Math.abs(providedTaxAmount - expectedTaxAmount) > 1) {
    throw new FinanceValidationError(
      `taxAmount does not match the resolved tax snapshot (${expectedTaxAmount}).`
    )
  }

  if (providedTotalAmount !== null && Math.abs(providedTotalAmount - expectedTotalAmount) > 1) {
    throw new FinanceValidationError(
      `totalAmount does not match the resolved tax snapshot (${expectedTotalAmount}).`
    )
  }

  return {
    ...snapshotColumns,
    taxRate: snapshotColumns.taxRateSnapshot ?? 0,
    taxAmount: expectedTaxAmount,
    totalAmount: expectedTotalAmount
  }
}

export const parsePersistedIncomeTaxSnapshot = (raw: unknown): ChileTaxSnapshot | null =>
  parsePersistedTaxSnapshot(raw)

export const serializeIncomeTaxSnapshot = (snapshot: ChileTaxSnapshot): string =>
  JSON.stringify(snapshot)

export const resolveIncomeTaxRecordFromSnapshot = async (
  snapshot: ChileTaxSnapshot | null | undefined,
  fallbackTaxCode?: string | null
): Promise<TaxCodeRecord | null> => {
  const resolvedTaxCode = snapshot?.taxCode ?? (fallbackTaxCode && isQuoteTaxCodeValue(fallbackTaxCode) ? fallbackTaxCode : null)

  if (!resolvedTaxCode) return null

  return resolveChileTaxCode(resolvedTaxCode, {
    at: snapshot?.effectiveFrom ?? undefined
  })
}
