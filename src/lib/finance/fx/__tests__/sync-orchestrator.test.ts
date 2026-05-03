import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist mock fns so they can be referenced in vi.mock factories.
const mockUpsertFinanceExchangeRate = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockGetAdapter = vi.fn()

vi.mock('@/lib/finance/postgres-store', () => ({
  upsertFinanceExchangeRateInPostgres: (...args: unknown[]) => mockUpsertFinanceExchangeRate(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/finance/fx/provider-index', () => ({
  getFxProviderAdapter: (...args: unknown[]) => mockGetAdapter(...args)
}))

import { __resetAllBreakers } from '@/lib/finance/fx/circuit-breaker'
import { syncCurrencyPair } from '@/lib/finance/fx/sync-orchestrator'

const makeAdapter = (code: string, overrides: Partial<{
  fetchDailyRate: ReturnType<typeof vi.fn>
  requiresSecret: boolean
  secretEnvVar: string | null
}> = {}) => ({
  code,
  displayName: `${code} adapter`,
  publishedDayPattern: 'weekdays_only' as const,
  supportsHistorical: true,
  requiresSecret: overrides.requiresSecret ?? false,
  secretEnvVar: overrides.secretEnvVar ?? null,
  fetchDailyRate: overrides.fetchDailyRate ?? vi.fn(),
  fetchHistoricalRange: vi.fn().mockResolvedValue([]),
  ping: vi.fn().mockResolvedValue({ reachable: true, latencyMs: 100 })
})

describe('syncCurrencyPair', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetAllBreakers()
    mockUpsertFinanceExchangeRate.mockResolvedValue({})
    mockRunGreenhousePostgresQuery.mockResolvedValue([])
    mockGetAdapter.mockReset()
  })

  it('returns error when registry has no entry for the pair', async () => {
    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'XYZ',
      rateDate: '2026-04-18'
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/No registry entry/)
    expect(mockGetAdapter).not.toHaveBeenCalled()
  })

  it('primary provider wins: persists rate + inverse, reports success', async () => {
    const mindicadorFetch = vi.fn().mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rate: 886.32,
      rateDate: '2026-04-18',
      requestedDate: '2026-04-18',
      isCarried: false,
      source: 'mindicador',
      publishedAt: null
    })

    mockGetAdapter.mockImplementation((code: string) => {
      if (code === 'mindicador') return makeAdapter('mindicador', { fetchDailyRate: mindicadorFetch })

      return null
    })

    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: '2026-04-18'
    })

    expect(result.success).toBe(true)
    expect(result.providerUsed).toBe('mindicador')
    expect(result.rate).toBe(886.32)
    expect(result.isCarried).toBe(false)
    expect(result.persistedInverse).toBe(true)
    expect(mockUpsertFinanceExchangeRate).toHaveBeenCalledTimes(2) // forward + inverse
  })

  it('falls back when primary returns null', async () => {
    const primaryFetch = vi.fn().mockResolvedValue(null)

    const fallbackFetch = vi.fn().mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rate: 886.32,
      rateDate: '2026-04-18',
      requestedDate: '2026-04-18',
      isCarried: false,
      source: 'open_er_api',
      publishedAt: null
    })

    mockGetAdapter.mockImplementation((code: string) => {
      if (code === 'mindicador') return makeAdapter('mindicador', { fetchDailyRate: primaryFetch })
      if (code === 'open_er_api') return makeAdapter('open_er_api', { fetchDailyRate: fallbackFetch })

      return null
    })

    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: '2026-04-18'
    })

    expect(result.success).toBe(true)
    expect(result.providerUsed).toBe('open_er_api')
    expect(result.providersAttempted).toEqual(['mindicador', 'open_er_api'])
    expect(primaryFetch).toHaveBeenCalled()
    expect(fallbackFetch).toHaveBeenCalled()
  })

  it('reports failure when all providers fail', async () => {
    const nullFetch = vi.fn().mockResolvedValue(null)

    mockGetAdapter.mockImplementation((code: string) => {
      if (code === 'mindicador') return makeAdapter('mindicador', { fetchDailyRate: nullFetch })
      if (code === 'open_er_api') return makeAdapter('open_er_api', { fetchDailyRate: nullFetch })

      return null
    })

    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: '2026-04-18'
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/All providers failed/)
    expect(result.providersAttempted).toEqual(['mindicador', 'open_er_api'])
    expect(mockUpsertFinanceExchangeRate).not.toHaveBeenCalled()
  })

  it('skips adapter when required secret is missing', async () => {
    const originalSecret = process.env.BANXICO_SIE_TOKEN

    delete process.env.BANXICO_SIE_TOKEN

    const banxicoFetch = vi.fn()

    const frankfurterFetch = vi.fn().mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      rate: 17.2196,
      rateDate: '2026-04-18',
      requestedDate: '2026-04-18',
      isCarried: false,
      source: 'frankfurter',
      publishedAt: null
    })

    mockGetAdapter.mockImplementation((code: string) => {
      if (code === 'banxico_sie') {
        return makeAdapter('banxico_sie', {
          fetchDailyRate: banxicoFetch,
          requiresSecret: true,
          secretEnvVar: 'BANXICO_SIE_TOKEN'
        })
      }

      if (code === 'frankfurter') return makeAdapter('frankfurter', { fetchDailyRate: frankfurterFetch })
      if (code === 'fawaz_ahmed') return makeAdapter('fawaz_ahmed', { fetchDailyRate: vi.fn().mockResolvedValue(null) })

      return null
    })

    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      rateDate: '2026-04-18'
    })

    expect(banxicoFetch).not.toHaveBeenCalled() // skipped due to missing secret
    expect(result.success).toBe(true)
    expect(result.providerUsed).toBe('frankfurter')

    if (originalSecret !== undefined) process.env.BANXICO_SIE_TOKEN = originalSecret
  })

  it('dry-run mode skips persistence but reports success', async () => {
    const mindicadorFetch = vi.fn().mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rate: 886.32,
      rateDate: '2026-04-18',
      requestedDate: '2026-04-18',
      isCarried: false,
      source: 'mindicador',
      publishedAt: null
    })

    mockGetAdapter.mockImplementation((code: string) =>
      code === 'mindicador' ? makeAdapter('mindicador', { fetchDailyRate: mindicadorFetch }) : null
    )

    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: '2026-04-18',
      dryRun: true
    })

    expect(result.success).toBe(true)
    expect(result.dryRun).toBe(true)
    expect(result.rate).toBe(886.32)
    expect(mockUpsertFinanceExchangeRate).not.toHaveBeenCalled()
  })

  it('provider override forces a single adapter', async () => {
    const banxicoFetch = vi.fn().mockResolvedValue(null)

    const fawazFetch = vi.fn().mockResolvedValue({
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      rate: 17.0,
      rateDate: '2026-04-18',
      requestedDate: '2026-04-18',
      isCarried: false,
      source: 'fawaz_ahmed',
      publishedAt: null
    })

    mockGetAdapter.mockImplementation((code: string) => {
      if (code === 'banxico_sie') return makeAdapter('banxico_sie', { fetchDailyRate: banxicoFetch })
      if (code === 'fawaz_ahmed') return makeAdapter('fawaz_ahmed', { fetchDailyRate: fawazFetch })

      return null
    })

    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      rateDate: '2026-04-18',
      overrideProviderCode: 'fawaz_ahmed'
    })

    expect(banxicoFetch).not.toHaveBeenCalled() // override bypasses chain
    expect(fawazFetch).toHaveBeenCalled()
    expect(result.providerUsed).toBe('fawaz_ahmed')
  })
})
