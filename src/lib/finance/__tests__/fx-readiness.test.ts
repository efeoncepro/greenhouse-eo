import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

import { resolveFxReadiness } from '@/lib/finance/fx-readiness'

describe('resolveFxReadiness', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns supported + rate=1 immediately for identity pair without hitting DB', async () => {
    const result = await resolveFxReadiness({
      fromCurrency: 'USD',
      toCurrency: 'USD',
      rateDate: '2026-04-19',
      domain: 'pricing_output'
    })

    expect(result.state).toBe('supported')
    expect(result.rate).toBe(1)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('denies unsupported currency for the domain without touching DB', async () => {
    const result = await resolveFxReadiness({
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      rateDate: '2026-04-19',
      domain: 'finance_core'
    })

    expect(result.state).toBe('unsupported')
    expect(result.rate).toBe(null)
    expect(result.message).toMatch(/finance_core/)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns supported when a fresh direct rate exists', async () => {
    const today = new Date().toISOString().slice(0, 10)

    mockQuery.mockResolvedValueOnce([
      { rate: 886.32, rate_date: today, source: 'mindicador' }
    ])

    const result = await resolveFxReadiness({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: today,
      domain: 'pricing_output'
    })

    expect(result.state).toBe('supported')
    expect(result.rate).toBe(886.32)
    expect(result.ageDays).toBe(0)
    expect(result.source).toBe('mindicador')
    expect(result.composedViaUsd).toBe(false)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('flags supported_but_stale when the rate is older than the domain threshold', async () => {
    const staleDate = '2026-01-01'
    const refDate = '2026-04-19'

    mockQuery.mockResolvedValueOnce([
      { rate: 886.32, rate_date: staleDate, source: 'mindicador' }
    ])

    const result = await resolveFxReadiness({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: refDate,
      domain: 'pricing_output'
    })

    expect(result.state).toBe('supported_but_stale')
    expect(result.rate).toBe(886.32)
    expect(result.ageDays).toBeGreaterThan(7)
  })

  it('falls back to inverse lookup when direct row missing', async () => {
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { rate: 0.001128, rate_date: '2026-04-19', source: 'manual' }
    ])

    const result = await resolveFxReadiness({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rateDate: '2026-04-19',
      domain: 'pricing_output'
    })

    expect(result.state).toBe('supported')
    expect(result.rate).toBeCloseTo(886.52, 1)
    expect(result.source).toBe('manual:inverse')
  })

  it('composes via USD when direct missing and registry allows composition (COP→MXN)', async () => {
    // COP does not allow inverse (registry: ['usd_composition']), so the
    // resolver goes direct → USD composition without an inverse attempt.
    mockQuery
      .mockResolvedValueOnce([]) // direct COP→MXN
      .mockResolvedValueOnce([{ rate: 0.00025, rate_date: '2026-04-19', source: 'manual' }]) // COP→USD
      .mockResolvedValueOnce([{ rate: 20, rate_date: '2026-04-19', source: 'manual' }]) // USD→MXN

    const result = await resolveFxReadiness({
      fromCurrency: 'COP',
      toCurrency: 'MXN',
      rateDate: '2026-04-19',
      domain: 'pricing_output'
    })

    expect(result.state).toBe('supported')
    expect(result.rate).toBeCloseTo(0.005, 4)
    expect(result.composedViaUsd).toBe(true)
    expect(result.source).toMatch(/composed_via_usd/)
  })

  it('returns temporarily_unavailable when no direct / inverse / composition can be resolved', async () => {
    mockQuery.mockResolvedValue([])

    const result = await resolveFxReadiness({
      fromCurrency: 'USD',
      toCurrency: 'MXN',
      rateDate: '2026-04-19',
      domain: 'pricing_output'
    })

    expect(result.state).toBe('temporarily_unavailable')
    expect(result.rate).toBe(null)
    expect(result.message).toMatch(/sync automático|manual/i)
  })

  it('skips inverse lookup when registry does not allow it (defensive)', async () => {
    // MXN registry allows only usd_composition (no inverse). Direct + inverse
    // both empty, so it should try USD composition straight after direct miss.
    mockQuery.mockResolvedValueOnce([]) // direct
    mockQuery.mockResolvedValueOnce([{ rate: 0.05, rate_date: '2026-04-19', source: 'manual' }]) // MXN→USD
    mockQuery.mockResolvedValueOnce([{ rate: 886.32, rate_date: '2026-04-19', source: 'mindicador' }]) // USD→CLP

    const result = await resolveFxReadiness({
      fromCurrency: 'MXN',
      toCurrency: 'CLP',
      rateDate: '2026-04-19',
      domain: 'pricing_output'
    })

    // Call count: direct (1) + composition leg1 (2) + leg2 (3). Inverse skipped.
    expect(mockQuery).toHaveBeenCalledTimes(3)
    expect(result.composedViaUsd).toBe(true)
    expect(result.rate).toBeCloseTo(0.05 * 886.32, 2)
  })

  it('exposes the domain threshold in the readiness payload', async () => {
    // analytics domain only supports CLP→CLP — identity path (no DB call).
    const result = await resolveFxReadiness({
      fromCurrency: 'CLP',
      toCurrency: 'CLP',
      rateDate: '2026-04-19',
      domain: 'analytics'
    })

    expect(result.state).toBe('supported')
    expect(result.stalenessThresholdDays).toBe(31)
  })
})
