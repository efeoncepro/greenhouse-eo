import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProductCatalogPrices from '@/lib/commercial/product-catalog-prices'

vi.mock('server-only', () => ({}))

const mockRecompute = vi.fn(async () => ({ scanned: 3, updated: 2, skipped: 1 }))

vi.mock('@/lib/commercial/product-catalog-prices', async () => {
  const actual = await vi.importActual<typeof ProductCatalogPrices>(
    '@/lib/commercial/product-catalog-prices'
  )

  return {
    ...actual,
    recomputeDerivedForCurrencyPair: (...args: unknown[]) => mockRecompute(...(args as Parameters<typeof mockRecompute>))
  }
})

import { productCatalogPricesRecomputeProjection } from './product-catalog-prices-recompute'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('productCatalogPricesRecomputeProjection', () => {
  it('triggers on finance.exchange_rate.upserted', () => {
    expect(productCatalogPricesRecomputeProjection.triggerEvents).toEqual([
      'finance.exchange_rate.upserted'
    ])
  })

  it('has cost_intelligence domain (aligned with commercial-cost-attribution)', () => {
    expect(productCatalogPricesRecomputeProjection.domain).toBe('cost_intelligence')
  })

  describe('extractScope', () => {
    it('returns currency_pair scope with alphabetical entityId for canonical pair', () => {
      const scope = productCatalogPricesRecomputeProjection.extractScope({
        from_currency: 'USD',
        to_currency: 'CLP'
      })


      // Alphabetical order: CLP comes before USD.
      expect(scope).toEqual({ entityType: 'currency_pair', entityId: 'CLP_USD' })
    })

    it('returns same entityId regardless of source direction', () => {
      const forward = productCatalogPricesRecomputeProjection.extractScope({
        from_currency: 'CLP',
        to_currency: 'USD'
      })

      const reverse = productCatalogPricesRecomputeProjection.extractScope({
        from_currency: 'USD',
        to_currency: 'CLP'
      })

      expect(forward).toEqual(reverse)
    })

    it('returns null for pair outside the canonical matrix', () => {
      expect(
        productCatalogPricesRecomputeProjection.extractScope({
          from_currency: 'EUR',
          to_currency: 'USD'
        })
      ).toBeNull()
    })

    it('returns null when currencies are missing from payload', () => {
      expect(productCatalogPricesRecomputeProjection.extractScope({})).toBeNull()
    })

    it('returns null when from_currency === to_currency', () => {
      expect(
        productCatalogPricesRecomputeProjection.extractScope({
          from_currency: 'USD',
          to_currency: 'USD'
        })
      ).toBeNull()
    })
  })

  describe('refresh', () => {
    it('calls recomputeDerivedForCurrencyPair twice (forward + reverse)', async () => {
      const result = await productCatalogPricesRecomputeProjection.refresh(
        { entityType: 'currency_pair', entityId: 'CLP_USD' },
        { rate_date: '2026-04-24' }
      )

      expect(mockRecompute).toHaveBeenCalledTimes(2)
      expect(mockRecompute).toHaveBeenNthCalledWith(1, {
        fromCurrency: 'CLP',
        toCurrency: 'USD',
        rateDate: '2026-04-24'
      })
      expect(mockRecompute).toHaveBeenNthCalledWith(2, {
        fromCurrency: 'USD',
        toCurrency: 'CLP',
        rateDate: '2026-04-24'
      })

      expect(result).toContain('CLP_USD')
      expect(result).toContain('scanned=6')
      expect(result).toContain('updated=4')
    })

    it('skips invalid pair gracefully without calling recompute', async () => {
      const result = await productCatalogPricesRecomputeProjection.refresh(
        { entityType: 'currency_pair', entityId: 'EUR_JPY' },
        {}
      )

      expect(mockRecompute).not.toHaveBeenCalled()
      expect(result).toContain('skipped')
    })
  })
})
