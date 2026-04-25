import 'server-only'

import {
  ChileTaxCodeNotFoundError,
  computeChileTaxSnapshot,
  resolveChileTaxCode,
  type ChileTaxCodeId,
  type ChileTaxSnapshot,
  type TaxCodeRecord
} from '@/lib/tax/chile'

// TASK-530: thin wrapper over the Chile tax foundation that the quotation
// pricing orchestrator and the canonical store use to build, serialise and
// validate tax snapshots.
//
// Why a dedicated module:
//   - The builder/UI only needs to know `(netAmount, taxCode)` without
//     reaching into the Chile catalogue directly.
//   - Default resolution (`cl_vat_19` when nothing is set) lives in one
//     place so every write path agrees.
//   - Serialisation convention (JSONB payload + header columns) is shared
//     by the header upsert and the line-item inserts.

/** Default tax code applied when the operator does not pick one explicitly. */
export const DEFAULT_QUOTE_TAX_CODE: ChileTaxCodeId = 'cl_vat_19'

// Re-export the client-safe default rate so downstream modules have one
// import surface. The concrete value lives in quotation-tax-constants.
export { DEFAULT_CHILE_IVA_RATE } from './quotation-tax-constants'

/** Canonical tax codes a quote can reference. */
export const QUOTE_TAX_CODES: readonly ChileTaxCodeId[] = [
  'cl_vat_19',
  'cl_vat_exempt',
  'cl_vat_non_billable'
] as const

export type QuoteTaxCode = (typeof QUOTE_TAX_CODES)[number]

export const isQuoteTaxCode = (value: unknown): value is QuoteTaxCode =>
  typeof value === 'string' && (QUOTE_TAX_CODES as readonly string[]).includes(value)

export interface QuotationTaxSnapshotInput {

  /** Net amount (subtotal) in the quote's currency. Non-negative. */
  netAmount: number

  /** Canonical code; defaults to `cl_vat_19` when undefined/null. */
  taxCode?: QuoteTaxCode | string | null

  /** Optional space scope for tenant-specific overrides in the catalogue. */
  spaceId?: string | null

  /** When the quote is being issued (controls effective-dating). */
  issuedAt?: Date | string
}

export interface QuotationTaxSnapshotResult {
  snapshot: ChileTaxSnapshot

  /** Convenience mirror of `snapshot.taxCode` — already normalized. */
  taxCode: string

  /** `true` when `kind ∈ {vat_exempt, vat_non_billable}` — driven by the code. */
  isTaxExempt: boolean

  /** Snapshot.rate — null for exempt/non-billable. */
  rateSnapshot: number | null

  /** Snapshot.taxAmount — always rounded to 2 decimals. */
  taxAmountSnapshot: number

  /** Raw `TaxCodeRecord` returned by the catalogue — useful for labels. */
  record: TaxCodeRecord
}

const resolveTaxCodeId = (value: QuotationTaxSnapshotInput['taxCode']): string => {
  if (value && typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed) return trimmed
  }

  return DEFAULT_QUOTE_TAX_CODE
}

/**
 * Resolves the tax code and computes the snapshot for a quote. Caller owns
 * the resulting `ChileTaxSnapshot` — persist it verbatim in
 * `quotations.tax_snapshot_json` (and mirror columns).
 */
export const buildQuotationTaxSnapshot = async (
  input: QuotationTaxSnapshotInput
): Promise<QuotationTaxSnapshotResult> => {
  const taxCode = resolveTaxCodeId(input.taxCode)

  const record = await resolveChileTaxCode(taxCode, {
    spaceId: input.spaceId ?? null,
    at: input.issuedAt
  })

  const snapshot = computeChileTaxSnapshot({
    code: record,
    netAmount: input.netAmount,
    issuedAt: input.issuedAt
  })

  const isTaxExempt =
    record.kind === 'vat_exempt' || record.kind === 'vat_non_billable'

  return {
    snapshot,
    taxCode: snapshot.taxCode,
    isTaxExempt,
    rateSnapshot: snapshot.rate,
    taxAmountSnapshot: snapshot.taxAmount,
    record
  }
}

/** Same as {@link buildQuotationTaxSnapshot} but never throws — returns null on missing catalogue rows. */
export const tryBuildQuotationTaxSnapshot = async (
  input: QuotationTaxSnapshotInput
): Promise<QuotationTaxSnapshotResult | null> => {
  try {
    return await buildQuotationTaxSnapshot(input)
  } catch (error) {
    if (error instanceof ChileTaxCodeNotFoundError) return null
    throw error
  }
}

/**
 * Deserialize a persisted snapshot (JSONB column → TS object). Returns null
 * when the payload is missing/invalid so readers can gracefully fall back to
 * legacy `tax_rate`/`tax_amount` columns during the migration window.
 */
export const parsePersistedTaxSnapshot = (raw: unknown): ChileTaxSnapshot | null => {
  if (!raw || typeof raw !== 'object') return null

  const candidate = raw as Record<string, unknown>

  if (candidate.version !== '1') return null
  if (typeof candidate.taxCode !== 'string') return null
  if (typeof candidate.jurisdiction !== 'string') return null
  if (typeof candidate.kind !== 'string') return null
  if (typeof candidate.labelEs !== 'string') return null
  if (typeof candidate.effectiveFrom !== 'string') return null
  if (typeof candidate.frozenAt !== 'string') return null

  return {
    version: '1',
    taxCode: candidate.taxCode,
    jurisdiction: candidate.jurisdiction,
    kind: candidate.kind as ChileTaxSnapshot['kind'],
    rate: typeof candidate.rate === 'number' ? candidate.rate : null,
    recoverability: (candidate.recoverability ?? 'not_applicable') as ChileTaxSnapshot['recoverability'],
    labelEs: candidate.labelEs,
    effectiveFrom: candidate.effectiveFrom,
    frozenAt: candidate.frozenAt,
    taxableAmount: Number(candidate.taxableAmount ?? 0),
    taxAmount: Number(candidate.taxAmount ?? 0),
    totalAmount: Number(candidate.totalAmount ?? 0),
    metadata: (candidate.metadata && typeof candidate.metadata === 'object'
      ? (candidate.metadata as Record<string, unknown>)
      : {})
  }
}

/** Serialise a snapshot for JSONB storage. Just a helper to keep call sites tidy. */
export const serializeQuotationTaxSnapshot = (snapshot: ChileTaxSnapshot): string =>
  JSON.stringify(snapshot)
