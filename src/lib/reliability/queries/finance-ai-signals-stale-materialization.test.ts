import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-1201 — heartbeat de staleness del anomaly-materialization de Finance AI.

const mockQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import {
  FINANCE_AI_SIGNALS_STALE_MATERIALIZATION_SIGNAL_ID,
  getFinanceAiSignalsStaleMaterializationSignal
} from './finance-ai-signals-stale-materialization'

describe('getFinanceAiSignalsStaleMaterializationSignal (TASK-1201)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00Z'))
    mockQuery.mockReset()
    mockCaptureWithDomain.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sin runs → awaiting_data', async () => {
    mockQuery.mockResolvedValueOnce([])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.signalId).toBe(FINANCE_AI_SIGNALS_STALE_MATERIALIZATION_SIGNAL_ID)
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('freshness')
    expect(signal.severity).toBe('awaiting_data')
  })

  it('run reciente succeeded → ok', async () => {
    mockQuery.mockResolvedValueOnce([
      { status: 'succeeded', started_at: '2026-06-23T06:00:00Z', age_hours: 6 }
    ])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('ok')
  })

  it('run reciente empty_positive (salud, sin anomalías) → ok', async () => {
    mockQuery.mockResolvedValueOnce([
      { status: 'empty_positive', started_at: '2026-06-23T09:00:00Z', age_hours: 3 }
    ])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('ok')
  })

  it('último run failed → error', async () => {
    mockQuery.mockResolvedValueOnce([
      { status: 'failed', started_at: '2026-06-23T11:00:00Z', age_hours: 1 }
    ])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('error')
  })

  it('stale > 24h pero <= 48h → warning', async () => {
    mockQuery.mockResolvedValueOnce([
      { status: 'succeeded', started_at: '2026-06-22T00:00:00Z', age_hours: 36 }
    ])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('warning')
  })

  it('stale > 48h → error', async () => {
    mockQuery.mockResolvedValueOnce([
      { status: 'succeeded', started_at: '2026-06-20T00:00:00Z', age_hours: 84 }
    ])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('error')
  })

  it('skipped_no_eligible_data reciente NO alerta (upstream TASK-1200, no falla del pipeline)', async () => {
    mockQuery.mockResolvedValueOnce([
      { status: 'skipped_no_eligible_data', started_at: '2026-06-23T08:00:00Z', age_hours: 4 }
    ])

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('ok')
  })

  it('honest degradation: PG falla → unknown + captureWithDomain finance', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG connection refused'))

    const signal = await getFinanceAiSignalsStaleMaterializationSignal()

    expect(signal.severity).toBe('unknown')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'finance',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'finance_ai_signals_stale_materialization' })
      })
    )
  })
})
