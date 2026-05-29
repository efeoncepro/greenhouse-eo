import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runIcoEngineQuery: vi.fn(),
  getIcoEngineProjectId: vi.fn(() => 'test-project'),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/ico-engine/shared', () => ({
  runIcoEngineQuery: mocks.runIcoEngineQuery,
  getIcoEngineProjectId: mocks.getIcoEngineProjectId
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

import { getNexaInsightsNoNewSignalsSignal } from './nexa-insights-no-new-signals'

beforeEach(() => {
  mocks.runIcoEngineQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  vi.useFakeTimers()
  // 2026-05-28 10:00:00 UTC — fixed "now" para tests determinísticos
  vi.setSystemTime(new Date('2026-05-28T10:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getNexaInsightsNoNewSignalsSignal', () => {
  it('signal_count=0 → severity=unknown (sistema sin signals aún)', async () => {
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: null, signal_count: 0 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('Sin señales')
    expect(signal.signalId).toBe('nexa.insights.no_new_signals_in_24h')
    expect(signal.moduleKey).toBe('delivery')
    expect(signal.kind).toBe('lag')
  })

  it('last_generated_at <= 24h → severity=ok (heartbeat verde)', async () => {
    // 2026-05-28 02:00 UTC → 8h atrás respecto a now() 10:00 UTC
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: '2026-05-28 02:00:00', signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('ok')
    expect(signal.summary).toMatch(/hace \d/)
  })

  it('25h < age <= 48h → severity=warning (cron skipped o gate active)', async () => {
    // 30h atrás
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: '2026-05-27 04:00:00', signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('retrasado')
  })

  it('age > 48h → severity=error (cron caído sostenido)', async () => {
    // 60h atrás
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: '2026-05-25 22:00:00', signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('caído')
    expect(signal.summary).toContain('icoMaterializerSkippedSafety')
  })

  it('boundary age=24h exact → ok (umbral warning >24h)', async () => {
    // exactly 24h ago
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: '2026-05-27 10:00:00', signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('ok')
  })

  it('boundary age=48h exact → warning (umbral error >48h)', async () => {
    // exactly 48h ago
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: '2026-05-26 10:00:00', signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('warning')
  })

  it('query throws → severity=unknown + captureWithDomain delivery', async () => {
    mocks.runIcoEngineQuery.mockRejectedValueOnce(new Error('BQ unavailable'))

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'reliability_signal_nexa_insights_no_new_signals'
        })
      })
    )
  })

  it('BQ-wrapped value object also unwraps correctly', async () => {
    // BQ Node client returns timestamps as { value: '...' }
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: { value: '2026-05-28 02:00:00' }, signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    expect(signal.severity).toBe('ok')
  })

  it('evidence incluye SQL pointer al VIEW canonical TASK-943', async () => {
    mocks.runIcoEngineQuery.mockResolvedValueOnce([
      { last_generated_at: '2026-05-28 02:00:00', signal_count: 34 }
    ])

    const signal = await getNexaInsightsNoNewSignalsSignal()

    const sqlEvidence = signal.evidence.find(e => e.kind === 'sql')

    expect(sqlEvidence).toBeDefined()
    expect(sqlEvidence!.value).toContain('ai_signals_current')
    expect(sqlEvidence!.value).toContain('TASK-943')

    const adrDoc = signal.evidence.find(e => e.kind === 'doc' && e.label === 'ADR')

    expect(adrDoc).toBeDefined()
    expect(adrDoc!.value).toContain('Delta 2026-05-28')
  })
})
