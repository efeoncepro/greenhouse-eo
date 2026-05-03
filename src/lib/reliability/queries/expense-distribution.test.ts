import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getExpenseDistributionSharedPoolContaminationSignal,
  getExpenseDistributionUnresolvedSignal
} from './expense-distribution'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getExpenseDistributionUnresolvedSignal', () => {
  it('returns ok when unresolved count is zero', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getExpenseDistributionUnresolvedSignal()

    expect(signal.signalId).toBe('finance.expense_distribution.unresolved')
    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.summary).toContain('distribución canónica resuelta')
  })

  it('returns error when unresolved expenses exist', async () => {
    queryMock.mockResolvedValueOnce([{ n: 4 }])

    const signal = await getExpenseDistributionUnresolvedSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('4')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('4')
  })

  it('degrades honestly when the query fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('relation does not exist'))

    const signal = await getExpenseDistributionUnresolvedSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})

describe('getExpenseDistributionSharedPoolContaminationSignal', () => {
  it('returns ok when contamination count is zero', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getExpenseDistributionSharedPoolContaminationSignal()

    expect(signal.signalId).toBe('finance.expense_distribution.shared_pool_contamination')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('no contiene payroll provider')
  })

  it('returns error when legacy pool would include non-operational rows', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2 }])

    const signal = await getExpenseDistributionSharedPoolContaminationSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('2')
  })
})
