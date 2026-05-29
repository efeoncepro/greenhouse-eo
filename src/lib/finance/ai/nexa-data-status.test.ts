import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── TASK-946 — Finance variant del helper canonical (PG-based) ─────────────
//
// Cubre los 6 paths de decisión + honest degradation PG fail. Mirror del test
// ICO pero contra el resolver Finance que lee `greenhouse_serving` PG.

const mockQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { resolveFinanceNexaInsightsDataStatus } from './nexa-data-status'

describe('resolveFinanceNexaInsightsDataStatus (TASK-946)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'))
    mockQuery.mockReset()
    mockCaptureWithDomain.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fast path: insightsCount > 0 → ready sin tocar PG', async () => {
    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 2,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('ready')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('sin lastCronRun PG → empty-pending', async () => {
    mockQuery.mockResolvedValueOnce([{ last_run_at: null, eligible_count: 0 }])

    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-pending')
  })

  it('cron caído > 24h → stale-degraded', async () => {
    const oldTimestamp = new Date('2026-05-25T12:00:00Z').toISOString()

    mockQuery.mockResolvedValueOnce([{ last_run_at: oldTimestamp, eligible_count: 3 }])

    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('stale-degraded')
  })

  it('cron OK + 0 eligible → empty-positive', async () => {
    const recentTimestamp = new Date('2026-05-28T06:00:00Z').toISOString()

    mockQuery.mockResolvedValueOnce([{ last_run_at: recentTimestamp, eligible_count: 0 }])

    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-positive')
  })

  it('falso-sano: eligible > 0 pero serving vacío → stale-degraded', async () => {
    const recentTimestamp = new Date('2026-05-28T06:00:00Z').toISOString()

    mockQuery.mockResolvedValueOnce([{ last_run_at: recentTimestamp, eligible_count: 4 }])

    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('stale-degraded')
  })

  it('honest degradation: PG falla → empty-pending + captureWithDomain finance', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG connection refused'))

    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-pending')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'finance_nexa_data_status', stage: 'pg_read' })
      })
    )
  })

  it('eligible_count como string PG-numeric se parsea canonical', async () => {
    const recentTimestamp = new Date('2026-05-28T06:00:00Z').toISOString()

    mockQuery.mockResolvedValueOnce([{ last_run_at: recentTimestamp, eligible_count: '0' }])

    const result = await resolveFinanceNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-positive')
  })
})
