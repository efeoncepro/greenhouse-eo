import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── TASK-946 — Anti-regresión canonical para resolveNexaInsightsDataStatus ──
//
// Cubre los 6 paths de decisión canonical del helper + honest degradation BQ fail.
// Pattern fuente: TASK-908 helpers puros + TASK-941 freshness signal.

const mockBigQueryQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: mockBigQueryQuery }),
  getBigQueryProjectId: () => 'test-project'
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { resolveNexaInsightsDataStatus } from './nexa-data-status'

describe('resolveNexaInsightsDataStatus (TASK-946)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'))
    mockBigQueryQuery.mockReset()
    mockCaptureWithDomain.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fast path: insightsCount > 0 retorna ready sin tocar BQ', async () => {
    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 3,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('ready')
    expect(mockBigQueryQuery).not.toHaveBeenCalled()
  })

  it('sin lastCronRun BQ → empty-pending (cron diario aún no corrió)', async () => {
    mockBigQueryQuery.mockResolvedValueOnce([[{ last_generated_at: null, signal_count: 0 }]])

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-pending')
  })

  it('cron caído >24h → stale-degraded', async () => {
    const oldTimestamp = new Date('2026-05-25T12:00:00Z').toISOString() // 72h atrás

    mockBigQueryQuery.mockResolvedValueOnce([[{ last_generated_at: oldTimestamp, signal_count: 5 }]])

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('stale-degraded')
  })

  it('cron OK + 0 anomalías eligible → empty-positive (salud)', async () => {
    const recentTimestamp = new Date('2026-05-28T06:00:00Z').toISOString() // 6h atrás

    mockBigQueryQuery.mockResolvedValueOnce([[{ last_generated_at: recentTimestamp, signal_count: 0 }]])

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-positive')
  })

  it('falso-sano ISSUE-082: eligible > 0 pero serving vacío → stale-degraded', async () => {
    const recentTimestamp = new Date('2026-05-28T06:00:00Z').toISOString()

    mockBigQueryQuery.mockResolvedValueOnce([[{ last_generated_at: recentTimestamp, signal_count: 7 }]])

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('stale-degraded')
  })

  it('honest degradation: BQ falla → empty-pending + captureWithDomain delivery', async () => {
    mockBigQueryQuery.mockRejectedValueOnce(new Error('BigQuery quota exceeded'))

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-pending')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'nexa_data_status', stage: 'bq_read' })
      })
    )
  })

  it('BigQueryTimestamp object con .value se parsea correctamente', async () => {
    const wrapped = { value: new Date('2026-05-28T06:00:00Z').toISOString() }

    mockBigQueryQuery.mockResolvedValueOnce([[{ last_generated_at: wrapped, signal_count: 0 }]])

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-positive')
  })

  it('signal_count como string se parsea a number canonical', async () => {
    const recentTimestamp = new Date('2026-05-28T06:00:00Z').toISOString()

    mockBigQueryQuery.mockResolvedValueOnce([[{ last_generated_at: recentTimestamp, signal_count: '0' }]])

    const result = await resolveNexaInsightsDataStatus({
      insightsCount: 0,
      periodYear: 2026,
      periodMonth: 5
    })

    expect(result).toBe('empty-positive')
  })
})
