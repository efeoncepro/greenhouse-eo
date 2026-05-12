import { describe, expect, it } from 'vitest'

import { formatClpInWords } from './number-to-spanish-words'

describe('formatClpInWords', () => {
  describe('basic cardinals', () => {
    it('formats 0 as "cero pesos chilenos"', () => {
      expect(formatClpInWords(0)).toBe('cero pesos chilenos')
    })

    it('formats 1 with singular peso + chileno (apocopation)', () => {
      expect(formatClpInWords(1)).toBe('un peso chileno')
    })

    it('formats teens correctly', () => {
      expect(formatClpInWords(10)).toBe('diez pesos chilenos')
      expect(formatClpInWords(15)).toBe('quince pesos chilenos')
      expect(formatClpInWords(19)).toBe('diecinueve pesos chilenos')
    })

    it('formats 20 and 21 with veinti apocopation', () => {
      expect(formatClpInWords(20)).toBe('veinte pesos chilenos')
      expect(formatClpInWords(21)).toBe('veintiún pesos chilenos')
      expect(formatClpInWords(22)).toBe('veintidos pesos chilenos')
    })

    it('formats tens 30-99 with apocopation on 1', () => {
      expect(formatClpInWords(30)).toBe('treinta pesos chilenos')
      expect(formatClpInWords(31)).toBe('treinta y un pesos chilenos')
      expect(formatClpInWords(42)).toBe('cuarenta y dos pesos chilenos')
      expect(formatClpInWords(91)).toBe('noventa y un pesos chilenos')
      expect(formatClpInWords(99)).toBe('noventa y nueve pesos chilenos')
    })
  })

  describe('hundreds', () => {
    it('formats 100 as "cien"', () => {
      expect(formatClpInWords(100)).toBe('cien pesos chilenos')
    })

    it('formats 101 with "ciento" + apocopation', () => {
      expect(formatClpInWords(101)).toBe('ciento un pesos chilenos')
    })

    it('formats 200-900 with canonical hundreds', () => {
      expect(formatClpInWords(200)).toBe('doscientos pesos chilenos')
      expect(formatClpInWords(500)).toBe('quinientos pesos chilenos')
      expect(formatClpInWords(700)).toBe('setecientos pesos chilenos')
      expect(formatClpInWords(900)).toBe('novecientos pesos chilenos')
    })

    it('formats compound hundreds', () => {
      expect(formatClpInWords(123)).toBe('ciento veintitres pesos chilenos')
      expect(formatClpInWords(421)).toBe('cuatrocientos veintiún pesos chilenos')
      expect(formatClpInWords(999)).toBe('novecientos noventa y nueve pesos chilenos')
    })
  })

  describe('thousands', () => {
    it('formats 1000 as "mil" (NOT "un mil")', () => {
      expect(formatClpInWords(1000)).toBe('mil pesos chilenos')
    })

    it('formats 1001 with apocopation', () => {
      expect(formatClpInWords(1001)).toBe('mil un pesos chilenos')
    })

    it('formats 21_000 with veinti apocopation', () => {
      expect(formatClpInWords(21_000)).toBe('veintiún mil pesos chilenos')
    })

    it('formats 100_000 as "cien mil"', () => {
      expect(formatClpInWords(100_000)).toBe('cien mil pesos chilenos')
    })

    it('formats 999_999 (max thousands range)', () => {
      expect(formatClpInWords(999_999)).toBe('novecientos noventa y nueve mil novecientos noventa y nueve pesos chilenos')
    })
  })

  describe('millions and beyond', () => {
    it('formats 1_000_000 as "un millón"', () => {
      expect(formatClpInWords(1_000_000)).toBe('un millón pesos chilenos')
    })

    it('formats 2_000_000 as "dos millones" (plural)', () => {
      expect(formatClpInWords(2_000_000)).toBe('dos millones pesos chilenos')
    })

    it('formats 21_000_000 with apocopation in millions cardinal', () => {
      expect(formatClpInWords(21_000_000)).toBe('veintiún millones pesos chilenos')
    })

    // Canonical TASK-862 example (BICE finiquito real)
    it('formats 9_068_600 (BICE finiquito real)', () => {
      expect(formatClpInWords(9_068_600)).toBe('nueve millones sesenta y ocho mil seiscientos pesos chilenos')
    })

    // Canonical TASK-862 example (mockup sample)
    it('formats 3_055_000 (mockup sample)', () => {
      expect(formatClpInWords(3_055_000)).toBe('tres millones cincuenta y cinco mil pesos chilenos')
    })

    it('formats 1_000_000_000 as "mil millones"', () => {
      expect(formatClpInWords(1_000_000_000)).toBe('mil millones pesos chilenos')
    })

    it('formats max supported 999_999_999_999', () => {
      const result = formatClpInWords(999_999_999_999)

      expect(result).toContain('novecientos noventa y nueve mil')
      expect(result).toContain('millones')
      expect(result).toMatch(/pesos chilenos$/)
    })
  })

  describe('options', () => {
    it('respects custom currencySuffix', () => {
      expect(formatClpInWords(100, { currencySuffix: 'pesos' })).toBe('cien pesos')
    })

    it('singularizes custom suffix when amount === 1', () => {
      expect(formatClpInWords(1, { currencySuffix: 'pesos' })).toBe('un peso')
    })

    it('omits currency entirely when omitCurrency=true', () => {
      expect(formatClpInWords(15, { omitCurrency: true })).toBe('quince')
      expect(formatClpInWords(1, { omitCurrency: true })).toBe('uno') // no apocopation when not before a noun
      expect(formatClpInWords(21, { omitCurrency: true })).toBe('veintiuno')
    })

    it('accepts empty suffix gracefully', () => {
      expect(formatClpInWords(100, { currencySuffix: '' })).toBe('cien')
    })
  })

  describe('edge cases', () => {
    it('truncates decimals via Math.trunc', () => {
      expect(formatClpInWords(100.7)).toBe('cien pesos chilenos')
      expect(formatClpInWords(100.99)).toBe('cien pesos chilenos')
    })

    it('throws on negative amounts', () => {
      expect(() => formatClpInWords(-1)).toThrow(/negative amounts/)
    })

    it('throws on Infinity', () => {
      expect(() => formatClpInWords(Infinity)).toThrow(/finite/)
    })

    it('throws on NaN', () => {
      expect(() => formatClpInWords(NaN)).toThrow(/finite/)
    })

    it('throws when amount exceeds 999_999_999_999', () => {
      expect(() => formatClpInWords(1_000_000_000_000)).toThrow(/exceeds maximum/)
    })
  })
})
