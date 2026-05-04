import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

const { getHomeRolloutDriftSignal, HOME_ROLLOUT_DRIFT_SIGNAL_ID } = await import('./home-rollout-drift')

describe('getHomeRolloutDriftSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.HOME_V2_ENABLED
  })

  afterEach(() => {
    delete process.env.HOME_V2_ENABLED
  })

  it('returns severity=ok when PG flag matches env and opt-out rate is low', async () => {
    process.env.HOME_V2_ENABLED = 'true'
    mockQuery.mockResolvedValueOnce([
      { opted_out: 1, total_active: 100, pg_global_enabled: true }
    ])

    const signal = await getHomeRolloutDriftSignal()

    expect(signal.signalId).toBe(HOME_ROLLOUT_DRIFT_SIGNAL_ID)
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toMatch(/Rollout estable/)
  })

  it('flags drift when PG global flag diverges from env setting', async () => {
    process.env.HOME_V2_ENABLED = 'true'
    mockQuery.mockResolvedValueOnce([
      { opted_out: 0, total_active: 50, pg_global_enabled: false }
    ])

    const signal = await getHomeRolloutDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toMatch(/diverge/)
  })

  it('flags drift when global PG row is missing', async () => {
    mockQuery.mockResolvedValueOnce([
      { opted_out: 0, total_active: 50, pg_global_enabled: null }
    ])

    const signal = await getHomeRolloutDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toMatch(/Falta fila global/)
  })

  it('flags drift when opt-out rate exceeds threshold', async () => {
    mockQuery.mockResolvedValueOnce([
      { opted_out: 8, total_active: 100, pg_global_enabled: true }
    ])

    const signal = await getHomeRolloutDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toMatch(/Opt-out rate 8.00%/)
  })

  it('handles zero active users without dividing by zero', async () => {
    mockQuery.mockResolvedValueOnce([
      { opted_out: 0, total_active: 0, pg_global_enabled: true }
    ])

    const signal = await getHomeRolloutDriftSignal()

    expect(signal.severity).toBe('ok')
  })

  it('degrades to severity=unknown when PG fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG outage'))

    const signal = await getHomeRolloutDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(mockCapture).toHaveBeenCalledWith(
      expect.any(Error),
      'home',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_home_rollout_drift' })
      })
    )
  })

  it('produces evidence in metric format for reliability dashboard', async () => {
    mockQuery.mockResolvedValueOnce([
      { opted_out: 2, total_active: 100, pg_global_enabled: true }
    ])

    const signal = await getHomeRolloutDriftSignal()

    const metricLabels = signal.evidence.filter(e => e.kind === 'metric').map(e => e.label)

    expect(metricLabels).toEqual(
      expect.arrayContaining(['opt_out_rate_percent', 'opt_out_users', 'active_users', 'pg_global_enabled'])
    )
  })
})
