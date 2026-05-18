import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

import { getNotionCorrectionTransitionsSourceAvailabilitySignal } from './notion-correction-transitions-source-availability'

beforeEach(() => {
  mocks.query.mockReset()
  mocks.captureWithDomain.mockReset()
})

describe('getNotionCorrectionTransitionsSourceAvailabilitySignal — TASK-908 Slice 3.5', () => {
  it('0 total completed → severity=unknown (sin datos)', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 0, unavailable_count: 0 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('sin datos')
    expect(signal.signalId).toBe('notion.correction_transitions.source_availability')
    expect(signal.moduleKey).toBe('delivery')
    expect(signal.kind).toBe('data_quality')
  })

  it('0% unavailable → severity=ok', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 0 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('saludable')
    expect(signal.summary).toContain('0%')
  })

  it('boundary 10% unavailable → severity=ok', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 10 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('ok')
  })

  it('11% unavailable → severity=warning', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 11 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('parcial')
  })

  it('50% unavailable → severity=warning (boundary)', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 50 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('warning')
  })

  it('51% unavailable → severity=error', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 51 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('crítica')
  })

  it('100% unavailable (pre-deployment esperado) → severity=error', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 100 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('100%')
  })

  it('query throws → severity=unknown + captureWithDomain delivery', async () => {
    mocks.query.mockRejectedValueOnce(new Error('PG connection refused'))

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible leer')
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'reliability_signal_notion_correction_transitions_source_availability'
        })
      })
    )
  })

  it('evidence incluye thresholds canonical (10/50) + helper canonical pointer', async () => {
    mocks.query.mockResolvedValueOnce([{ total_completed: 100, unavailable_count: 0 }])

    const signal = await getNotionCorrectionTransitionsSourceAvailabilitySignal()

    const warningThreshold = signal.evidence.find(
      e => e.kind === 'metric' && e.label === 'warning_threshold_pct'
    )

    const errorThreshold = signal.evidence.find(
      e => e.kind === 'metric' && e.label === 'error_threshold_pct'
    )

    const helperDoc = signal.evidence.find(
      e => e.kind === 'doc' && e.label === 'Helper canonical'
    )

    const trackingDoc = signal.evidence.find(
      e => e.kind === 'doc' && e.label === 'Tracking table'
    )

    expect(warningThreshold?.value).toBe('10')
    expect(errorThreshold?.value).toBe('50')
    expect(helperDoc?.value).toBe('src/lib/notion-metrics/count-correction-transitions.ts')
    expect(trackingDoc?.value).toBe('greenhouse_delivery.task_status_transitions')
  })
})
