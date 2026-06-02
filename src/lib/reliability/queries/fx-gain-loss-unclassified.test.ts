/**
 * TASK-990 Slice 7 — tests para getFxGainLossUnclassifiedSignal.
 *
 * Paths cubiertos:
 *   1. count = 0 → severity 'ok' (steady state)
 *   2. count > 0 (income + expense) → severity 'error'
 *   3. query throws → severity 'unknown' (degradación honesta)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getFxGainLossUnclassifiedSignal } from './fx-gain-loss-unclassified'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getFxGainLossUnclassifiedSignal', () => {
  it('count = 0 → severity ok (steady)', async () => {
    queryMock.mockResolvedValueOnce([{ income_n: 0, expense_n: 0 }])

    const signal = await getFxGainLossUnclassifiedSignal()

    expect(signal.signalId).toBe('finance.fx_gain_loss.unclassified')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
  })

  it('count > 0 (income + expense) → severity error + counts in summary', async () => {
    queryMock.mockResolvedValueOnce([{ income_n: 2, expense_n: 1 }])

    const signal = await getFxGainLossUnclassifiedSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('3')
    expect(signal.summary).toContain('2') // income breakdown
    expect(signal.summary).toContain('1') // expense breakdown
  })

  it('query throws → severity unknown (degradación honesta)', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getFxGainLossUnclassifiedSignal()

    expect(signal.severity).toBe('unknown')
  })
})
