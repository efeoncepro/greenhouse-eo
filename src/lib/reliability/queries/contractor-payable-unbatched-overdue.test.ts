/**
 * TASK-979 Slice 4 — tests para getContractorPayableUnbatchedOverdueSignal.
 *
 * 4 paths: count=0 → ok; count>0 atraso ≤10 → warning; atraso >10 → error;
 * query throws → unknown (degradación honesta).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getContractorPayableUnbatchedOverdueSignal } from './contractor-payable-unbatched-overdue'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getContractorPayableUnbatchedOverdueSignal', () => {
  it('count = 0 → severity ok', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0, max_overdue_days: 0 }])

    const signal = await getContractorPayableUnbatchedOverdueSignal()

    expect(signal.signalId).toBe('finance.contractor_payable.unbatched_overdue')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
  })

  it('count > 0 con atraso ≤ 10 días → severity warning', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2, max_overdue_days: 6 }])

    const signal = await getContractorPayableUnbatchedOverdueSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2')
    expect(signal.summary).toContain('corrida mensual')
  })

  it('count > 0 con atraso > 10 días → severity error', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1, max_overdue_days: 20 }])

    const signal = await getContractorPayableUnbatchedOverdueSignal()

    expect(signal.severity).toBe('error')
  })

  it('query throws → severity unknown (degradado)', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getContractorPayableUnbatchedOverdueSignal()

    expect(signal.severity).toBe('unknown')
  })
})
