import { describe, expect, it } from 'vitest'

import {
  deriveIsCarried,
  isValidRateValue,
  normalizeRateDate
} from '@/lib/finance/fx/provider-adapter'

describe('provider-adapter helpers', () => {
  describe('isValidRateValue', () => {
    it('accepts positive finite numbers', () => {
      expect(isValidRateValue(886.32)).toBe(true)
      expect(isValidRateValue(0.00001)).toBe(true)
    })

    it('rejects zero', () => {
      expect(isValidRateValue(0)).toBe(false)
    })

    it('rejects negative', () => {
      expect(isValidRateValue(-1)).toBe(false)
    })

    it('rejects NaN and Infinity', () => {
      expect(isValidRateValue(NaN)).toBe(false)
      expect(isValidRateValue(Infinity)).toBe(false)
      expect(isValidRateValue(-Infinity)).toBe(false)
    })

    it('rejects non-numbers', () => {
      expect(isValidRateValue('886.32')).toBe(false)
      expect(isValidRateValue(null)).toBe(false)
      expect(isValidRateValue(undefined)).toBe(false)
    })
  })

  describe('normalizeRateDate', () => {
    it('passes through YYYY-MM-DD', () => {
      expect(normalizeRateDate('2026-04-18')).toBe('2026-04-18')
    })

    it('converts DD/MM/YYYY (Banxico format)', () => {
      expect(normalizeRateDate('18/04/2026')).toBe('2026-04-18')
    })

    it('converts DD-MM-YYYY', () => {
      expect(normalizeRateDate('18-04-2026')).toBe('2026-04-18')
    })

    it('converts DD.Mon.YY (BCRP format)', () => {
      expect(normalizeRateDate('18.Apr.26')).toBe('2026-04-18')
      expect(normalizeRateDate('05.Jan.25')).toBe('2025-01-05')
    })

    it('returns null for unparseable input', () => {
      expect(normalizeRateDate('notadate')).toBe(null)
      expect(normalizeRateDate('')).toBe(null)
      expect(normalizeRateDate(null)).toBe(null)
      expect(normalizeRateDate(undefined)).toBe(null)
    })

    it('rejects invalid BCRP month abbreviations', () => {
      expect(normalizeRateDate('18.Xyz.26')).toBe(null)
    })
  })

  describe('deriveIsCarried', () => {
    it('is false when rateDate == requestedDate', () => {
      expect(deriveIsCarried('2026-04-18', '2026-04-18')).toBe(false)
    })

    it('is true when rateDate is older than requestedDate', () => {
      expect(deriveIsCarried('2026-04-18', '2026-04-17')).toBe(true)
    })

    it('is false when rateDate is newer than requestedDate (odd but valid)', () => {
      expect(deriveIsCarried('2026-04-18', '2026-04-19')).toBe(false)
    })
  })
})
