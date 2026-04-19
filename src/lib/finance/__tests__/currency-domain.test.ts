import { describe, expect, it } from 'vitest'

import {
  CURRENCIES_ALL,
  CURRENCY_DOMAINS,
  CURRENCY_DOMAIN_SUPPORT,
  FX_POLICIES,
  FX_POLICY_DEFAULT_BY_DOMAIN,
  FX_READINESS_STATES,
  FX_STALENESS_THRESHOLD_DAYS,
  assertSupportedCurrencyForDomain,
  isSupportedCurrencyForDomain,
  narrowToDomainCurrency,
  toFinanceCurrency
} from '@/lib/finance/currency-domain'

describe('currency-domain', () => {
  describe('invariants', () => {
    it('finance_core is limited to CLP and USD to keep FinanceCurrency stable', () => {
      expect(CURRENCY_DOMAIN_SUPPORT.finance_core).toEqual(['CLP', 'USD'])
    })

    it('pricing_output carries the commercial currency set', () => {
      expect(CURRENCY_DOMAIN_SUPPORT.pricing_output).toEqual(['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'])
    })

    it('reporting and analytics stay CLP-normalized per spec', () => {
      expect(CURRENCY_DOMAIN_SUPPORT.reporting).toEqual(['CLP'])
      expect(CURRENCY_DOMAIN_SUPPORT.analytics).toEqual(['CLP'])
    })

    it('every domain has a default FX policy', () => {
      for (const domain of CURRENCY_DOMAINS) {
        expect(FX_POLICIES).toContain(FX_POLICY_DEFAULT_BY_DOMAIN[domain])
      }
    })

    it('every domain has a staleness threshold', () => {
      for (const domain of CURRENCY_DOMAINS) {
        expect(FX_STALENESS_THRESHOLD_DAYS[domain]).toBeGreaterThan(0)
      }
    })

    it('every supported currency per domain lives in CURRENCIES_ALL', () => {
      for (const domain of CURRENCY_DOMAINS) {
        for (const c of CURRENCY_DOMAIN_SUPPORT[domain]) {
          expect(CURRENCIES_ALL as readonly string[]).toContain(c)
        }
      }
    })

    it('readiness state enum is exhaustive', () => {
      expect(FX_READINESS_STATES).toEqual([
        'supported',
        'supported_but_stale',
        'unsupported',
        'temporarily_unavailable'
      ])
    })
  })

  describe('isSupportedCurrencyForDomain', () => {
    it('accepts CLP + USD for finance_core', () => {
      expect(isSupportedCurrencyForDomain('CLP', 'finance_core')).toBe(true)
      expect(isSupportedCurrencyForDomain('USD', 'finance_core')).toBe(true)
    })

    it('rejects MXN for finance_core', () => {
      expect(isSupportedCurrencyForDomain('MXN', 'finance_core')).toBe(false)
    })

    it('accepts MXN for pricing_output', () => {
      expect(isSupportedCurrencyForDomain('MXN', 'pricing_output')).toBe(true)
    })

    it('normalizes case', () => {
      expect(isSupportedCurrencyForDomain('clp', 'reporting')).toBe(true)
    })
  })

  describe('assertSupportedCurrencyForDomain', () => {
    it('returns the normalized code for supported currency', () => {
      expect(assertSupportedCurrencyForDomain('clp', 'finance_core')).toBe('CLP')
    })

    it('throws with a helpful message for unsupported currency', () => {
      expect(() => assertSupportedCurrencyForDomain('BRL', 'pricing_output')).toThrow(
        /not supported for domain "pricing_output"/
      )
    })
  })

  describe('narrowToDomainCurrency', () => {
    it('returns the normalized code if supported', () => {
      expect(narrowToDomainCurrency('usd', 'finance_core')).toBe('USD')
    })

    it('returns null if not supported', () => {
      expect(narrowToDomainCurrency('BRL', 'pricing_output')).toBe(null)
    })
  })

  describe('toFinanceCurrency', () => {
    it('narrows a supported currency to FinanceCurrency', () => {
      expect(toFinanceCurrency('CLP')).toBe('CLP')
      expect(toFinanceCurrency('usd')).toBe('USD')
    })

    it('throws for a currency not in finance_core support', () => {
      expect(() => toFinanceCurrency('CLF')).toThrow(/not supported for domain "finance_core"/)
    })
  })
})
