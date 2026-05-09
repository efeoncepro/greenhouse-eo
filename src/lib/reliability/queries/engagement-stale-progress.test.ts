import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import {
  ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID,
  getEngagementStaleProgressSignal
} from './engagement-stale-progress'

describe('getEngagementStaleProgressSignal', () => {
  beforeEach(() => {
    queryMock.mockReset()
    captureMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok in steady state when count = 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getEngagementStaleProgressSignal()

    expect(signal.signalId).toBe(ENGAGEMENT_STALE_PROGRESS_SIGNAL_ID)
    expect(signal.moduleKey).toBe('commercial')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('0')
  })

  it('returns warning when active non-regular engagements are stale', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2 }])

    const signal = await getEngagementStaleProgressSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 engagements activos')
    expect(signal.evidence.find(e => e.label === 'threshold_days')?.value).toBe('10')
  })

  it('queries active eligible non-regular services and latest snapshots', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getEngagementStaleProgressSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('greenhouse_core.services s')
    expect(sql).toContain('greenhouse_commercial.engagement_progress_snapshots ps')
    expect(sql).toContain("s.status = 'active'")
    expect(sql).toContain("s.engagement_kind != 'regular'")
    expect(sql).toContain("s.hubspot_sync_status IS DISTINCT FROM 'unmapped'")
    expect(sql).toContain("INTERVAL '10 days'")
  })

  it('degrades to unknown when the query fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getEngagementStaleProgressSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'commercial',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_engagement_stale_progress' })
      })
    )
  })
})
