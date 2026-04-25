import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ── Mocks de DB + FX ──────────────────────────────────────────

interface MockRow extends Record<string, unknown> {
  product_id: string
  currency_code: string
  unit_price: string
  is_authoritative: boolean
  derived_from_currency: string | null
  derived_from_fx_at: Date | null
  derived_fx_rate: string | null
  source: string
  created_at: Date
  updated_at: Date
}

let pricesRows: MockRow[] = []

// Minimal pg-client-style mock that the `withTransaction` callback receives.
const mockClient = {
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    const s = sql.trim()

    if (s.startsWith('INSERT INTO greenhouse_commercial.product_catalog_prices')) {
      const [
        product_id,
        currency_code,
        unit_price,
        arg4,
        arg5,
        arg6
      ] = params as [string, string, number, unknown, unknown, unknown, unknown]

      const isAuth = sql.includes('TRUE,') && sql.includes('is_authoritative')

      // 2 patrones distintos en el store: upsert autoritativa (4º arg = source)
      // vs upsert derivada (4º arg = derived_from_currency).
      const row: MockRow = isAuth
        ? {
            product_id,
            currency_code,
            unit_price: String(unit_price),
            is_authoritative: true,
            derived_from_currency: null,
            derived_from_fx_at: null,
            derived_fx_rate: null,
            source: String(arg4),
            created_at: new Date('2026-04-24T12:00:00Z'),
            updated_at: new Date('2026-04-24T12:00:00Z')
          }
        : {
            product_id,
            currency_code,
            unit_price: String(unit_price),
            is_authoritative: false,
            derived_from_currency: String(arg4),
            derived_from_fx_at: arg5 instanceof Date ? arg5 : new Date(),
            derived_fx_rate: String(arg6),
            source: 'fx_derived',
            created_at: new Date('2026-04-24T12:00:00Z'),
            updated_at: new Date('2026-04-24T12:00:00Z')
          }

      const existing = pricesRows.findIndex(
        r => r.product_id === row.product_id && r.currency_code === row.currency_code
      )

      if (existing >= 0) pricesRows[existing] = row
      else pricesRows.push(row)

      return { rows: [row] }
    }

    if (s.startsWith('SELECT is_authoritative')) {
      const [product_id, currency_code] = params as [string, string]
      const row = pricesRows.find(r => r.product_id === product_id && r.currency_code === currency_code)

      return { rows: row ? [{ is_authoritative: row.is_authoritative }] : [] }
    }

    if (s.startsWith('SELECT unit_price')) {
      const [product_id, currency_code] = params as [string, string]

      const row = pricesRows.find(
        r => r.product_id === product_id && r.currency_code === currency_code && r.is_authoritative
      )

      return { rows: row ? [{ unit_price: row.unit_price }] : [] }
    }

    if (s.startsWith('UPDATE greenhouse_commercial.product_catalog_prices')) {
      const [unit_price, derived_fx_rate, derived_from_fx_at, product_id, currency_code] = params as [
        number,
        number,
        Date,
        string,
        string
      ]

      const row = pricesRows.find(
        r => r.product_id === product_id && r.currency_code === currency_code && !r.is_authoritative
      )

      if (row) {
        row.unit_price = String(unit_price)
        row.derived_fx_rate = String(derived_fx_rate)
        row.derived_from_fx_at = derived_from_fx_at
      }

      return { rows: [] }
    }

    if (s.startsWith('SELECT product_id, currency_code, derived_from_currency')) {
      const [from, to, cutoff] = params as [string, string, Date]

      const matches = pricesRows.filter(
        r =>
          !r.is_authoritative &&
          ((r.derived_from_currency === from && r.currency_code === to) ||
            (r.derived_from_currency === to && r.currency_code === from)) &&

          // Anti-ping-pong: derived_from_fx_at IS NULL OR < cutoff.
          (r.derived_from_fx_at === null || r.derived_from_fx_at < cutoff)
      )

      return {
        rows: matches.map(r => ({
          product_id: r.product_id,
          currency_code: r.currency_code,
          derived_from_currency: r.derived_from_currency,
          derived_from_fx_at: r.derived_from_fx_at?.toISOString() ?? null
        }))
      }
    }

    return { rows: [] }
  })
}

vi.mock('@/lib/db', () => ({
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    const result = await mockClient.query(sql, params)

    return result.rows
  }),
  getDb: vi.fn(async () => ({
    selectFrom: () => ({
      select: () => ({
        where: (_col: string, _op: string, value: string) => ({
          execute: async () =>
            pricesRows
              .filter(r => r.product_id === value)
              .map(r => ({ currency_code: r.currency_code, unit_price: r.unit_price }))
        })
      }),
      selectAll: () => ({
        where: (_col: string, _op: string, value: string) => ({
          execute: async () => pricesRows.filter(r => r.product_id === value)
        })
      })
    })
  })),
  withTransaction: vi.fn(async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient))
}))

// FX platform mock — returns rates from an in-test dictionary.
type RateMap = Record<string, number>
let mockRates: RateMap = {}

vi.mock('@/lib/finance/pricing/currency-converter', () => ({
  getExchangeRateOnOrBefore: vi.fn(async ({ fromCurrency, toCurrency }: { fromCurrency: string; toCurrency: string }) => {
    if (fromCurrency === toCurrency) return 1
    const key = `${fromCurrency}_${toCurrency}`

    
return mockRates[key] ?? null
  })
}))

// ── Import after mocks ────────────────────────────────────────

import {
  CURRENCY_CODES,
  CURRENCY_PRECEDENCE,
  setAuthoritativePrice,
  getPricesByCurrency,
  getAllPrices,
  recomputeDerivedForCurrencyPair
} from './product-catalog-prices'

// ── Helpers ───────────────────────────────────────────────────

const resetState = () => {
  pricesRows = []
  mockRates = {
    // 1 CLP → 0.001 USD (ej. 1000 CLP = 1 USD)
    CLP_USD: 0.001,
    USD_CLP: 1000,
    CLP_CLF: 0.00005, // 1000 CLP = 0.05 CLF (clean after round2)
    CLP_COP: 4.2,
    CLP_MXN: 0.019,
    CLP_PEN: 0.0039,
    USD_CLF: 0.025,
    USD_COP: 4200,
    USD_MXN: 19,
    USD_PEN: 3.9
  }
}

// ── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
})

describe('CURRENCY_CODES + CURRENCY_PRECEDENCE', () => {
  it('exports the 6 canonical HubSpot-aligned currencies', () => {
    expect(CURRENCY_CODES).toEqual(['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'])
  })

  it('precedence ranks CLP > USD > CLF > COP > MXN > PEN', () => {
    expect(CURRENCY_PRECEDENCE[0]).toBe('CLP')
    expect(CURRENCY_PRECEDENCE[1]).toBe('USD')
  })
})

describe('setAuthoritativePrice', () => {
  it('produces 1 authoritative + 5 derived rows in a single transaction', async () => {
    const result = await setAuthoritativePrice({
      productId: 'GH-PROD-001',
      currencyCode: 'CLP',
      unitPrice: 1000
    })

    expect(result.authoritative.currencyCode).toBe('CLP')
    expect(result.authoritative.isAuthoritative).toBe(true)
    expect(result.authoritative.source).toBe('gh_admin')
    expect(result.derived).toHaveLength(5)
    expect(result.missingRates).toEqual([])

    const usd = result.derived.find(d => d.currencyCode === 'USD')

    expect(usd?.unitPrice).toBe(1) // 1000 CLP × 0.001 = 1 USD
    expect(usd?.isAuthoritative).toBe(false)
    expect(usd?.source).toBe('fx_derived')
    expect(usd?.derivedFromCurrency).toBe('CLP')
    expect(usd?.derivedFxRate).toBe(0.001)
  })

  it('reports missing rates without failing', async () => {
    // Drop one rate to simulate missing pair.
    delete mockRates.CLP_PEN

    const result = await setAuthoritativePrice({
      productId: 'GH-PROD-002',
      currencyCode: 'CLP',
      unitPrice: 500
    })

    expect(result.missingRates).toEqual(['PEN'])
    expect(result.derived).toHaveLength(4)
  })

  it('does NOT overwrite an existing authoritative row in another currency', async () => {
    // Seed: USD already authoritative for product.
    await setAuthoritativePrice({ productId: 'GH-PROD-003', currencyCode: 'USD', unitPrice: 2 })

    // Now fix CLP as authoritative → USD should stay authoritative, not be
    // replaced by a derived row.
    const result = await setAuthoritativePrice({
      productId: 'GH-PROD-003',
      currencyCode: 'CLP',
      unitPrice: 3000
    })

    // USD fue autoritativa previamente, así que el helper no la derivó.
    const derivedUsd = result.derived.find(d => d.currencyCode === 'USD')

    expect(derivedUsd).toBeUndefined()

    const all = await getAllPrices('GH-PROD-003')
    const usdRow = all.find(p => p.currencyCode === 'USD')

    expect(usdRow?.isAuthoritative).toBe(true)
    expect(usdRow?.unitPrice).toBe(2)
  })

  it('rejects negative unit price', async () => {
    await expect(
      setAuthoritativePrice({ productId: 'GH-PROD-004', currencyCode: 'CLP', unitPrice: -10 })
    ).rejects.toThrow(/non-negative/)
  })
})

describe('getPricesByCurrency', () => {
  it('returns all 6 currencies, NULL for missing', async () => {
    await setAuthoritativePrice({ productId: 'GH-PROD-005', currencyCode: 'CLP', unitPrice: 1000 })

    const prices = await getPricesByCurrency('GH-PROD-005')

    expect(Object.keys(prices).sort()).toEqual(['CLF', 'CLP', 'COP', 'MXN', 'PEN', 'USD'])
    expect(prices.CLP).toBe(1000)
    expect(prices.USD).toBe(1)
    expect(prices.CLF).toBeCloseTo(0.05, 4)
  })

  it('returns all NULL for unknown product', async () => {
    const prices = await getPricesByCurrency('does-not-exist')

    for (const code of CURRENCY_CODES) {
      expect(prices[code]).toBeNull()
    }
  })
})

describe('recomputeDerivedForCurrencyPair', () => {
  it('updates derived rows that depend on the pair — anti-ping-pong window respected', async () => {
    await setAuthoritativePrice({ productId: 'GH-PROD-006', currencyCode: 'CLP', unitPrice: 1000 })

    // Simulate a rate shift (CLP_USD went from 0.001 to 0.0011).
    mockRates.CLP_USD = 0.0011

    // But because all derived rows were JUST created <60s ago, recompute skips
    // them due to anti-ping-pong. In a real flow, the projection would be
    // called after some minutes, after derived_from_fx_at < cutoff.
    const result = await recomputeDerivedForCurrencyPair({
      fromCurrency: 'CLP',
      toCurrency: 'USD'
    })

    expect(result.scanned).toBe(0) // blocked by anti-ping-pong
  })

  it('updates derived rows when anti-ping-pong window has elapsed', async () => {
    await setAuthoritativePrice({ productId: 'GH-PROD-007', currencyCode: 'CLP', unitPrice: 1000 })

    // Fast-forward: make the derived row's fx_at older than the anti-ping-pong
    // cutoff (60s).
    for (const row of pricesRows) {
      if (!row.is_authoritative && row.derived_from_fx_at) {
        row.derived_from_fx_at = new Date(Date.now() - 120_000) // 2 min ago
      }
    }

    // New rate comes in.
    mockRates.CLP_USD = 0.0011

    const result = await recomputeDerivedForCurrencyPair({
      fromCurrency: 'CLP',
      toCurrency: 'USD'
    })

    expect(result.scanned).toBeGreaterThan(0)
    expect(result.updated).toBeGreaterThan(0)

    // Verify the USD row got the new rate.
    const prices = await getPricesByCurrency('GH-PROD-007')

    expect(prices.USD).toBeCloseTo(1.1, 4) // 1000 × 0.0011
  })

  it('handles pair with same from/to as no-op', async () => {
    const result = await recomputeDerivedForCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'USD'
    })

    expect(result).toEqual({ scanned: 0, updated: 0, skipped: 0 })
  })
})
