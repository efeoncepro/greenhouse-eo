import { describe, expect, it, vi } from 'vitest'

import { toDateString, toTimestampString, checkExchangeRateStaleness } from '@/lib/finance/shared'

vi.mock('@/lib/finance/postgres-store', () => ({
  getLatestFinanceExchangeRateFromPostgres: vi.fn()
}))

describe('finance shared date normalization', () => {
  it('normalizes Date instances to YYYY-MM-DD', () => {
    expect(toDateString(new Date('2026-03-06T03:00:00.000Z'))).toBe('2026-03-06')
  })

  it('normalizes Date instances to ISO timestamps', () => {
    expect(toTimestampString(new Date('2026-03-06T00:00:00.000Z'))).toBe('2026-03-06T00:00:00.000Z')
  })
})

describe('checkExchangeRateStaleness', () => {
  it('returns null when no rate exists', async () => {
    const { getLatestFinanceExchangeRateFromPostgres } = await import('@/lib/finance/postgres-store')

    vi.mocked(getLatestFinanceExchangeRateFromPostgres).mockResolvedValue(null)

    const result = await checkExchangeRateStaleness('USD', 'CLP')

    expect(result).toBeNull()
  })

  it('returns isStale=false for a recent rate', async () => {
    const { getLatestFinanceExchangeRateFromPostgres } = await import('@/lib/finance/postgres-store')
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

    vi.mocked(getLatestFinanceExchangeRateFromPostgres).mockResolvedValue({
      rateId: 'r1', fromCurrency: 'USD', toCurrency: 'CLP',
      rate: 950, rateDate: yesterday, source: 'mindicador',
      createdAt: yesterday, updatedAt: yesterday
    })

    const result = await checkExchangeRateStaleness('USD', 'CLP')

    expect(result).not.toBeNull()
    expect(result!.isStale).toBe(false)
    expect(result!.ageDays).toBeLessThanOrEqual(2)
  })

  it('returns isStale=true for a rate older than 7 days', async () => {
    const { getLatestFinanceExchangeRateFromPostgres } = await import('@/lib/finance/postgres-store')
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10)

    vi.mocked(getLatestFinanceExchangeRateFromPostgres).mockResolvedValue({
      rateId: 'r1', fromCurrency: 'USD', toCurrency: 'CLP',
      rate: 950, rateDate: tenDaysAgo, source: 'mindicador',
      createdAt: tenDaysAgo, updatedAt: tenDaysAgo
    })

    const result = await checkExchangeRateStaleness('USD', 'CLP')

    expect(result).not.toBeNull()
    expect(result!.isStale).toBe(true)
    expect(result!.ageDays).toBeGreaterThanOrEqual(9)
  })
})
