import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProductCatalogPrices from '@/lib/commercial/product-catalog-prices'

vi.mock('server-only', () => ({}))

const mockSetAuthoritative = vi.fn(async () => ({
  authoritative: {
    productId: 'p',
    currencyCode: 'CLP',
    unitPrice: 1000,
    isAuthoritative: true,
    derivedFromCurrency: null,
    derivedFromFxAt: null,
    derivedFxRate: null,
    source: 'backfill_legacy',
    createdAt: '',
    updatedAt: ''
  },
  derived: [{ currencyCode: 'USD' }, { currencyCode: 'CLF' }],
  missingRates: ['PEN']
}))

vi.mock('@/lib/commercial/product-catalog-prices', async () => {
  const actual = await vi.importActual<typeof ProductCatalogPrices>(
    '@/lib/commercial/product-catalog-prices'
  )

  return {
    ...actual,
    setAuthoritativePrice: (...args: unknown[]) =>
      mockSetAuthoritative(...(args as Parameters<typeof mockSetAuthoritative>))
  }
})

import { productCatalogPricesSyncProjection } from './product-catalog-prices-sync'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('productCatalogPricesSyncProjection', () => {
  it('triggers on commercial.product_catalog.created and .updated', () => {
    expect(productCatalogPricesSyncProjection.triggerEvents).toEqual([
      'commercial.product_catalog.created',
      'commercial.product_catalog.updated'
    ])
  })

  it('has cost_intelligence domain', () => {
    expect(productCatalogPricesSyncProjection.domain).toBe('cost_intelligence')
  })

  describe('extractScope', () => {
    it('returns product_catalog scope with productId as entityId', () => {
      expect(
        productCatalogPricesSyncProjection.extractScope({ productId: 'GH-PROD-001' })
      ).toEqual({ entityType: 'product_catalog', entityId: 'GH-PROD-001' })
    })

    it('returns null when productId is missing', () => {
      expect(productCatalogPricesSyncProjection.extractScope({})).toBeNull()
    })

    it('returns null when productId is empty string', () => {
      expect(
        productCatalogPricesSyncProjection.extractScope({ productId: '   ' })
      ).toBeNull()
    })
  })

  describe('refresh', () => {
    const scope = { entityType: 'product_catalog', entityId: 'GH-PROD-001' }

    it('calls setAuthoritativePrice with source=backfill_legacy and canonical currency', async () => {
      const result = await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultUnitPrice: 1000,
        defaultCurrency: 'CLP'
      })

      expect(mockSetAuthoritative).toHaveBeenCalledTimes(1)
      expect(mockSetAuthoritative).toHaveBeenCalledWith({
        productId: 'GH-PROD-001',
        currencyCode: 'CLP',
        unitPrice: 1000,
        source: 'backfill_legacy'
      })
      expect(result).toContain('synced')
      expect(result).toContain('CLP=1000')
    })

    it('normalizes lowercase currency to uppercase before matrix check', async () => {
      await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultUnitPrice: 500,
        defaultCurrency: 'usd'
      })

      expect(mockSetAuthoritative).toHaveBeenCalledWith(
        expect.objectContaining({ currencyCode: 'USD' })
      )
    })

    it('skips when defaultUnitPrice is missing', async () => {
      const result = await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultCurrency: 'CLP'
      })

      expect(mockSetAuthoritative).not.toHaveBeenCalled()
      expect(result).toContain('skipped')
      expect(result).toContain('no default_unit_price')
    })

    it('skips when defaultCurrency is missing', async () => {
      const result = await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultUnitPrice: 1000
      })

      expect(mockSetAuthoritative).not.toHaveBeenCalled()
      expect(result).toContain('skipped')
    })

    it('skips when currency is outside the canonical matrix', async () => {
      const result = await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultUnitPrice: 1000,
        defaultCurrency: 'EUR'
      })

      expect(mockSetAuthoritative).not.toHaveBeenCalled()
      expect(result).toContain('skipped')
      expect(result).toContain('outside canonical matrix')
    })

    it('skips negative prices without fallthrough to store', async () => {
      const result = await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultUnitPrice: -10,
        defaultCurrency: 'CLP'
      })

      expect(mockSetAuthoritative).not.toHaveBeenCalled()
      expect(result).toContain('skipped')
      expect(result).toContain('negative')
    })

    it('reports derived count and missing rates in result message', async () => {
      const result = await productCatalogPricesSyncProjection.refresh(scope, {
        productId: 'GH-PROD-001',
        defaultUnitPrice: 1000,
        defaultCurrency: 'CLP'
      })

      expect(result).toContain('2 derived')
      expect(result).toContain('1 missing_rates')
    })
  })
})
