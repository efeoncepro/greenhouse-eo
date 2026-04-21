import { describe, expect, it } from 'vitest'

import {
  ChileTaxComputeError,
  computeChileTaxAmounts,
  computeChileTaxSnapshot,
  validateChileTaxSnapshot
} from './compute'

import type { ChileTaxSnapshot, TaxCodeRecord } from './types'

const buildCode = (overrides: Partial<TaxCodeRecord> = {}): TaxCodeRecord => ({
  id: 'test-id',
  taxCode: 'cl_vat_19',
  jurisdiction: 'CL',
  kind: 'vat_output',
  rate: 0.19,
  recoverability: 'not_applicable',
  labelEs: 'IVA 19%',
  labelEn: null,
  description: null,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  spaceId: null,
  metadata: { sii_bucket: 'debito_fiscal' },
  ...overrides
})

describe('computeChileTaxAmounts', () => {
  it('applies 19% VAT and rounds to 2 decimals', () => {
    const result = computeChileTaxAmounts({ code: buildCode(), netAmount: 1000 })

    expect(result).toEqual({ taxableAmount: 1000, taxAmount: 190, totalAmount: 1190 })
  })

  it('handles cl_vat_exempt with NULL rate (tax = 0, total = net)', () => {
    const result = computeChileTaxAmounts({
      code: buildCode({ taxCode: 'cl_vat_exempt', kind: 'vat_exempt', rate: null }),
      netAmount: 1000
    })

    expect(result).toEqual({ taxableAmount: 1000, taxAmount: 0, totalAmount: 1000 })
  })

  it('handles cl_vat_non_billable with NULL rate', () => {
    const result = computeChileTaxAmounts({
      code: buildCode({ taxCode: 'cl_vat_non_billable', kind: 'vat_non_billable', rate: null }),
      netAmount: 2500
    })

    expect(result).toEqual({ taxableAmount: 2500, taxAmount: 0, totalAmount: 2500 })
  })

  it('handles zero net amount', () => {
    const result = computeChileTaxAmounts({ code: buildCode(), netAmount: 0 })

    expect(result).toEqual({ taxableAmount: 0, taxAmount: 0, totalAmount: 0 })
  })

  it('rounds to 2 decimals (banker-free, Math.round semantics)', () => {
    const result = computeChileTaxAmounts({
      code: buildCode(),
      netAmount: 100.015
    })

    expect(result.taxableAmount).toBe(100.02)
    expect(result.taxAmount).toBe(19)
    expect(result.totalAmount).toBe(119.02)
  })

  it('numerically equivalent for input VAT credit and non-recoverable at same rate', () => {
    const credit = computeChileTaxAmounts({
      code: buildCode({
        taxCode: 'cl_input_vat_credit_19',
        kind: 'vat_input_credit',
        recoverability: 'full'
      }),
      netAmount: 5000
    })

    const nonRecoverable = computeChileTaxAmounts({
      code: buildCode({
        taxCode: 'cl_input_vat_non_recoverable_19',
        kind: 'vat_input_non_recoverable',
        recoverability: 'none'
      }),
      netAmount: 5000
    })

    expect(credit).toEqual(nonRecoverable)
    expect(credit.taxAmount).toBe(950)
  })

  it('rejects negative net amount', () => {
    expect(() => computeChileTaxAmounts({ code: buildCode(), netAmount: -1 })).toThrow(
      ChileTaxComputeError
    )
  })

  it('rejects NaN net amount', () => {
    expect(() => computeChileTaxAmounts({ code: buildCode(), netAmount: Number.NaN })).toThrow(
      ChileTaxComputeError
    )
  })

  it('rejects negative rate on the catalog record', () => {
    expect(() =>
      computeChileTaxAmounts({ code: buildCode({ rate: -0.19 }), netAmount: 1000 })
    ).toThrow(ChileTaxComputeError)
  })
})

describe('computeChileTaxSnapshot', () => {
  it('freezes the snapshot shape with amounts + frozenAt', () => {
    const code = buildCode()
    const issuedAt = new Date('2026-04-21T10:00:00Z')

    const snapshot = computeChileTaxSnapshot({ code, netAmount: 2000, issuedAt })

    expect(snapshot).toEqual<ChileTaxSnapshot>({
      version: '1',
      taxCode: 'cl_vat_19',
      jurisdiction: 'CL',
      kind: 'vat_output',
      rate: 0.19,
      recoverability: 'not_applicable',
      labelEs: 'IVA 19%',
      effectiveFrom: '2026-01-01',
      frozenAt: '2026-04-21T10:00:00.000Z',
      taxableAmount: 2000,
      taxAmount: 380,
      totalAmount: 2380,
      metadata: { sii_bucket: 'debito_fiscal' }
    })
  })

  it('defaults frozenAt to now when issuedAt is omitted', () => {
    const before = Date.now()
    const snapshot = computeChileTaxSnapshot({ code: buildCode(), netAmount: 100 })
    const after = Date.now()
    const frozen = new Date(snapshot.frozenAt).getTime()

    expect(frozen).toBeGreaterThanOrEqual(before)
    expect(frozen).toBeLessThanOrEqual(after)
  })

  it('produces exempt snapshot with zero tax', () => {
    const code = buildCode({ taxCode: 'cl_vat_exempt', kind: 'vat_exempt', rate: null })

    const snapshot = computeChileTaxSnapshot({ code, netAmount: 5000 })

    expect(snapshot.taxAmount).toBe(0)
    expect(snapshot.totalAmount).toBe(5000)
    expect(snapshot.rate).toBeNull()
  })
})

describe('validateChileTaxSnapshot', () => {
  it('returns null when the snapshot is internally consistent', () => {
    const snapshot = computeChileTaxSnapshot({ code: buildCode(), netAmount: 1000 })

    expect(validateChileTaxSnapshot(snapshot)).toBeNull()
  })

  it('flags drift when taxAmount is tampered with', () => {
    const snapshot = computeChileTaxSnapshot({ code: buildCode(), netAmount: 1000 })
    const tampered = { ...snapshot, taxAmount: 500 }

    const result = validateChileTaxSnapshot(tampered)

    expect(result).toContain('taxAmount')
  })

  it('flags drift when totalAmount is tampered with', () => {
    const snapshot = computeChileTaxSnapshot({ code: buildCode(), netAmount: 1000 })
    const tampered = { ...snapshot, totalAmount: 9999 }

    const result = validateChileTaxSnapshot(tampered)

    expect(result).toContain('totalAmount')
  })

  it('tolerates 1-peso rounding drift', () => {
    const snapshot = computeChileTaxSnapshot({ code: buildCode(), netAmount: 1000 })
    const withSubPesoDrift = { ...snapshot, taxAmount: snapshot.taxAmount + 0.49 }

    expect(validateChileTaxSnapshot(withSubPesoDrift)).toBeNull()
  })
})
