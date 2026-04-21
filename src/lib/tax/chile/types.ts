/**
 * Chile tax code types — TASK-529 Chile Tax Code Foundation.
 *
 * Contracts consumed by downstream aggregates (quotations in TASK-530, income
 * in TASK-531, expenses in TASK-532, VAT ledger in TASK-533). Persist the
 * snapshot shape; never re-derive from the catalog at read time.
 */

export const CHILE_TAX_CODE_IDS = [
  'cl_vat_19',
  'cl_vat_exempt',
  'cl_vat_non_billable',
  'cl_input_vat_credit_19',
  'cl_input_vat_non_recoverable_19'
] as const

export type ChileTaxCodeId = (typeof CHILE_TAX_CODE_IDS)[number]

export const TAX_CODE_KINDS = [
  'vat_output',
  'vat_input_credit',
  'vat_input_non_recoverable',
  'vat_exempt',
  'vat_non_billable'
] as const

export type TaxCodeKind = (typeof TAX_CODE_KINDS)[number]

export const TAX_RECOVERABILITY_VALUES = ['full', 'partial', 'none', 'not_applicable'] as const

export type TaxRecoverability = (typeof TAX_RECOVERABILITY_VALUES)[number]

export interface TaxCodeRecord {
  id: string
  taxCode: string
  jurisdiction: string
  kind: TaxCodeKind
  rate: number | null
  recoverability: TaxRecoverability
  labelEs: string
  labelEn: string | null
  description: string | null
  effectiveFrom: string
  effectiveTo: string | null
  spaceId: string | null
  metadata: Record<string, unknown>
}

export interface ChileTaxAmounts {
  taxableAmount: number
  taxAmount: number
  totalAmount: number
}

export interface ChileTaxSnapshot {
  version: '1'
  taxCode: string
  jurisdiction: string
  kind: TaxCodeKind
  rate: number | null
  recoverability: TaxRecoverability
  labelEs: string
  effectiveFrom: string
  frozenAt: string
  taxableAmount: number
  taxAmount: number
  totalAmount: number
  metadata: Record<string, unknown>
}

export interface TaxCodeLookupContext {
  spaceId?: string | null
  at?: Date | string
}

export interface TaxComputeInput {
  code: TaxCodeRecord
  netAmount: number
}

export interface TaxSnapshotInput extends TaxComputeInput {
  issuedAt?: Date | string
}
