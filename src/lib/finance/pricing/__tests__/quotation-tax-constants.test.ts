import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CHILE_IVA_RATE,
  QUOTE_TAX_CODE_LABELS,
  QUOTE_TAX_CODE_RATES,
  QUOTE_TAX_CODE_VALUES,
  isQuoteTaxCodeValue,
  previewChileTaxAmounts
} from '../quotation-tax-constants'

describe('quotation-tax-constants', () => {
  it('exposes the three canonical Chile tax codes', () => {
    expect(QUOTE_TAX_CODE_VALUES).toEqual([
      'cl_vat_19',
      'cl_vat_exempt',
      'cl_vat_non_billable'
    ])
  })

  it('keeps the default IVA rate at 0.19 (CL seed v1)', () => {
    expect(DEFAULT_CHILE_IVA_RATE).toBe(0.19)
  })

  it('has null rates for exempt and non-billable, 0.19 for cl_vat_19', () => {
    expect(QUOTE_TAX_CODE_RATES.cl_vat_19).toBe(0.19)
    expect(QUOTE_TAX_CODE_RATES.cl_vat_exempt).toBeNull()
    expect(QUOTE_TAX_CODE_RATES.cl_vat_non_billable).toBeNull()
  })

  it('provides Spanish labels for every code', () => {
    expect(QUOTE_TAX_CODE_LABELS.cl_vat_19).toBe('IVA 19%')
    expect(QUOTE_TAX_CODE_LABELS.cl_vat_exempt).toBe('IVA Exento')
    expect(QUOTE_TAX_CODE_LABELS.cl_vat_non_billable).toBe('No Afecto a IVA')
  })

  describe('isQuoteTaxCodeValue', () => {
    it('recognises canonical codes', () => {
      expect(isQuoteTaxCodeValue('cl_vat_19')).toBe(true)
      expect(isQuoteTaxCodeValue('cl_vat_exempt')).toBe(true)
      expect(isQuoteTaxCodeValue('cl_vat_non_billable')).toBe(true)
    })

    it('rejects anything else', () => {
      expect(isQuoteTaxCodeValue('other')).toBe(false)
      expect(isQuoteTaxCodeValue(null)).toBe(false)
      expect(isQuoteTaxCodeValue(undefined)).toBe(false)
      expect(isQuoteTaxCodeValue(19)).toBe(false)
    })
  })

  describe('previewChileTaxAmounts', () => {
    it('applies 19% VAT by default', () => {
      expect(previewChileTaxAmounts(100_000)).toEqual({
        taxableAmount: 100_000,
        taxAmount: 19_000,
        totalAmount: 119_000
      })
    })

    it('respects cl_vat_exempt → zero tax, total equals net', () => {
      expect(previewChileTaxAmounts(250_000, 'cl_vat_exempt')).toEqual({
        taxableAmount: 250_000,
        taxAmount: 0,
        totalAmount: 250_000
      })
    })

    it('respects cl_vat_non_billable → zero tax, total equals net', () => {
      expect(previewChileTaxAmounts(1_234_567, 'cl_vat_non_billable')).toEqual({
        taxableAmount: 1_234_567,
        taxAmount: 0,
        totalAmount: 1_234_567
      })
    })

    it('rounds to 2 decimals', () => {
      const result = previewChileTaxAmounts(99.995, 'cl_vat_19')

      expect(result.taxableAmount).toBe(100)
      expect(result.taxAmount).toBeCloseTo(19, 2)
      expect(result.totalAmount).toBeCloseTo(119, 2)
    })

    it('returns zeros for negative / non-finite inputs (defensive)', () => {
      expect(previewChileTaxAmounts(-10)).toEqual({ taxableAmount: 0, taxAmount: 0, totalAmount: 0 })
      expect(previewChileTaxAmounts(Number.NaN)).toEqual({ taxableAmount: 0, taxAmount: 0, totalAmount: 0 })
    })
  })
})
