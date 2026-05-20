import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  countRecentSkippedSafetyRuns: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/ico-engine/materialize-tracking', () => ({
  countRecentSkippedSafetyRuns: mocks.countRecentSkippedSafetyRuns
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

import { getIcoMaterializerSkippedSafetySignal } from './ico-materializer-skipped-safety'

beforeEach(() => {
  mocks.countRecentSkippedSafetyRuns.mockReset()
  mocks.captureWithDomain.mockReset()
})

describe('getIcoMaterializerSkippedSafetySignal', () => {
  it('count=0 → severity=ok + summary "operativo"', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 0,
      oldestStartedAt: null,
      newestStartedAt: null
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('operativo')
    expect(signal.summary).toContain('0 skips')
    expect(signal.signalId).toBe('delivery.ico_materializer.skipped_safety')
    expect(signal.moduleKey).toBe('delivery')
    expect(signal.kind).toBe('drift')
  })

  it('count=1-5 → severity=warning + summary "protegió data buena"', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 3,
      oldestStartedAt: new Date('2026-05-17T20:00:00.000Z'),
      newestStartedAt: new Date('2026-05-18T03:15:00.000Z')
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('skipeó 3 veces')
    expect(signal.summary).toContain('protegió data buena')
  })

  it('count>5 → severity=error + summary "sostenido"', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 8,
      oldestStartedAt: new Date('2026-05-17T20:00:00.000Z'),
      newestStartedAt: new Date('2026-05-18T03:15:00.000Z')
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('skipeó 8 veces')
    expect(signal.summary).toContain('sostenido')
    expect(signal.summary).toContain('NO se está resolviendo')
  })

  it('boundary count=5 → warning (NO error)', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 5,
      oldestStartedAt: new Date('2026-05-17T20:00:00.000Z'),
      newestStartedAt: new Date('2026-05-18T03:15:00.000Z')
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    // ERROR_THRESHOLD=5, severity > 5 → error. 5 exactos → warning.
    expect(signal.severity).toBe('warning')
  })

  it('boundary count=6 → error', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 6,
      oldestStartedAt: new Date('2026-05-17T20:00:00.000Z'),
      newestStartedAt: new Date('2026-05-18T03:15:00.000Z')
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    expect(signal.severity).toBe('error')
  })

  it('query throws → severity=unknown + captureWithDomain delivery', async () => {
    mocks.countRecentSkippedSafetyRuns.mockRejectedValueOnce(
      new Error('PG connection refused')
    )

    const signal = await getIcoMaterializerSkippedSafetySignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible leer')
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'reliability_signal_ico_materializer_skipped_safety'
        })
      })
    )
  })

  it('evidence incluye doc pointer al helper canonical', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 0,
      oldestStartedAt: null,
      newestStartedAt: null
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    const helperDoc = signal.evidence.find(
      e => e.kind === 'doc' && e.label === 'Helper canonical'
    )

    expect(helperDoc).toBeDefined()
    expect(helperDoc!.value).toBe('src/lib/ico-engine/materialize-orchestrator.ts')

    const trackingDoc = signal.evidence.find(
      e => e.kind === 'doc' && e.label === 'Tracking table'
    )

    expect(trackingDoc).toBeDefined()
    expect(trackingDoc!.value).toBe('greenhouse_sync.ico_materialization_runs')

    const upstreamDoc = signal.evidence.find(
      e => e.kind === 'doc' && e.label === 'Upstream signal fuente típica'
    )

    expect(upstreamDoc).toBeDefined()
    expect(upstreamDoc!.value).toBe('identity.notion_bridge.coverage_drift')
  })

  it('evidence incluye thresholds + window canonical', async () => {
    mocks.countRecentSkippedSafetyRuns.mockResolvedValueOnce({
      count: 0,
      oldestStartedAt: null,
      newestStartedAt: null
    })

    const signal = await getIcoMaterializerSkippedSafetySignal()

    const labels = signal.evidence.map(e => e.label)

    expect(labels).toContain('count_24h')
    expect(labels).toContain('warning_threshold')
    expect(labels).toContain('error_threshold')
    expect(labels).toContain('window_hours')
    expect(labels).toContain('oldest_skip_at')
    expect(labels).toContain('newest_skip_at')
  })
})
