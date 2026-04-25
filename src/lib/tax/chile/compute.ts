import type {
  ChileTaxAmounts,
  ChileTaxSnapshot,
  TaxComputeInput,
  TaxSnapshotInput
} from './types'

export class ChileTaxComputeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChileTaxComputeError'
  }
}

function roundTo2(value: number): number {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

function assertNonNegative(amount: number, field: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ChileTaxComputeError(`${field} must be a finite non-negative number, received: ${String(amount)}`)
  }

  return amount
}

/**
 * Applies the tax code to a net amount and returns `{ taxableAmount, taxAmount, totalAmount }`.
 *
 * Rules:
 * - Output VAT with a rate (e.g. `cl_vat_19`) → tax = net × rate, total = net + tax.
 * - Input VAT (credit or non-recoverable) behaves the same numerically; recoverability
 *   lives in the catalog and must be read from there — this function does not infer it.
 * - Exempt / non-billable (rate IS NULL) → tax = 0, total = net.
 *
 * Amounts are rounded to 2 decimals (Chilean invoicing standard for peso).
 */
export function computeChileTaxAmounts({ code, netAmount }: TaxComputeInput): ChileTaxAmounts {
  assertNonNegative(netAmount, 'netAmount')

  const taxableAmount = roundTo2(netAmount)

  if (code.rate === null) {
    return { taxableAmount, taxAmount: 0, totalAmount: taxableAmount }
  }

  if (!Number.isFinite(code.rate) || code.rate < 0) {
    throw new ChileTaxComputeError(
      `Tax code "${code.taxCode}" has an invalid rate: ${String(code.rate)}`
    )
  }

  const taxAmount = roundTo2(taxableAmount * code.rate)
  const totalAmount = roundTo2(taxableAmount + taxAmount)

  return { taxableAmount, taxAmount, totalAmount }
}

function resolveIssuedAt(issuedAt?: Date | string): string {
  if (!issuedAt) return new Date().toISOString()
  if (issuedAt instanceof Date) return issuedAt.toISOString()

  return new Date(issuedAt).toISOString()
}

/**
 * Freezes a tax snapshot at issuance. Downstream aggregates (quotations,
 * invoices, expenses) must persist the snapshot verbatim so that re-renders
 * and audits reproduce the exact figures the user saw when the document was
 * issued, even if the catalog evolves later.
 */
export function computeChileTaxSnapshot({
  code,
  netAmount,
  issuedAt
}: TaxSnapshotInput): ChileTaxSnapshot {
  const amounts = computeChileTaxAmounts({ code, netAmount })

  return {
    version: '1',
    taxCode: code.taxCode,
    jurisdiction: code.jurisdiction,
    kind: code.kind,
    rate: code.rate,
    recoverability: code.recoverability,
    labelEs: code.labelEs,
    effectiveFrom: code.effectiveFrom,
    frozenAt: resolveIssuedAt(issuedAt),
    taxableAmount: amounts.taxableAmount,
    taxAmount: amounts.taxAmount,
    totalAmount: amounts.totalAmount,
    metadata: code.metadata
  }
}

/**
 * Re-validates a pre-persisted snapshot against the expected net amount.
 * Returns `null` when the snapshot matches (within 1 peso rounding tolerance);
 * returns a descriptive error string when the figures drift.
 *
 * Use this in audit pipelines (TASK-533 VAT ledger) to flag snapshots that
 * stopped agreeing with their own math — typically caused by legacy rows or
 * failed migrations.
 */
export function validateChileTaxSnapshot(snapshot: ChileTaxSnapshot): string | null {
  const recomputed = computeChileTaxAmounts({
    code: {
      id: '',
      taxCode: snapshot.taxCode,
      jurisdiction: snapshot.jurisdiction,
      kind: snapshot.kind,
      rate: snapshot.rate,
      recoverability: snapshot.recoverability,
      labelEs: snapshot.labelEs,
      labelEn: null,
      description: null,
      effectiveFrom: snapshot.effectiveFrom,
      effectiveTo: null,
      spaceId: null,
      metadata: snapshot.metadata
    },
    netAmount: snapshot.taxableAmount
  })

  const diffs: string[] = []

  if (Math.abs(recomputed.taxAmount - snapshot.taxAmount) > 1) {
    diffs.push(`taxAmount expected=${recomputed.taxAmount} got=${snapshot.taxAmount}`)
  }

  if (Math.abs(recomputed.totalAmount - snapshot.totalAmount) > 1) {
    diffs.push(`totalAmount expected=${recomputed.totalAmount} got=${snapshot.totalAmount}`)
  }

  return diffs.length > 0 ? diffs.join('; ') : null
}
