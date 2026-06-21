/**
 * TASK-995 Slice 6 — tests de los 4 indexed-unit reliability signals.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const clfFlagMock = vi.fn(() => false)

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/finance/multi-currency/flags', () => ({
  isFinanceCoreClfIndexedEnabled: () => clfFlagMock()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getUfRateFreshnessSignal,
  getIndexedUnitSnapshotMissingSignal,
  getIndexedUnitNativeFunctionalDriftSignal,
  getIndexedUnitSettlementCurrencyViolationSignal
} from './indexed-unit-signals'

beforeEach(() => {
  queryMock.mockReset()
  clfFlagMock.mockReset()
  clfFlagMock.mockReturnValue(false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getUfRateFreshnessSignal', () => {
  it('UF fresco (1 día) → ok', async () => {
    queryMock.mockResolvedValueOnce([{ age_days: 1 }])
    const s = await getUfRateFreshnessSignal()

    expect(s.signalId).toBe('finance.uf.rate_freshness')
    expect(s.kind).toBe('freshness')
    expect(s.severity).toBe('ok')
  })

  it('UF 10 días → warning', async () => {
    queryMock.mockResolvedValueOnce([{ age_days: 10 }])
    expect((await getUfRateFreshnessSignal()).severity).toBe('warning')
  })

  it('UF 40 días → error', async () => {
    queryMock.mockResolvedValueOnce([{ age_days: 40 }])
    expect((await getUfRateFreshnessSignal()).severity).toBe('error')
  })

  it('sin valor UF → error', async () => {
    queryMock.mockResolvedValueOnce([{ age_days: null }])
    expect((await getUfRateFreshnessSignal()).severity).toBe('error')
  })

  it('query falla → unknown (degradación honesta)', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    expect((await getUfRateFreshnessSignal()).severity).toBe('unknown')
  })
})

describe('getIndexedUnitSnapshotMissingSignal', () => {
  it('flag OFF → ok sin tocar DB', async () => {
    const s = await getIndexedUnitSnapshotMissingSignal()

    expect(s.severity).toBe('ok')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('flag ON, sin huérfanos → ok', async () => {
    clfFlagMock.mockReturnValue(true)
    queryMock.mockResolvedValueOnce([{ income: 0, expense: 0, obligation: 0 }])
    expect((await getIndexedUnitSnapshotMissingSignal()).severity).toBe('ok')
  })

  it('flag ON, con huérfanos → error', async () => {
    clfFlagMock.mockReturnValue(true)
    queryMock.mockResolvedValueOnce([{ income: 2, expense: 0, obligation: 1 }])
    const s = await getIndexedUnitSnapshotMissingSignal()

    expect(s.severity).toBe('error')
    expect(s.summary).toContain('3')
  })
})

describe('getIndexedUnitNativeFunctionalDriftSignal', () => {
  it('sin drift → ok', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    expect((await getIndexedUnitNativeFunctionalDriftSignal()).severity).toBe('ok')
  })

  it('con drift → error', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])
    const s = await getIndexedUnitNativeFunctionalDriftSignal()

    expect(s.kind).toBe('drift')
    expect(s.severity).toBe('error')
  })
})

describe('getIndexedUnitSettlementCurrencyViolationSignal', () => {
  it('sin CLF en planos cash → ok', async () => {
    queryMock.mockResolvedValueOnce([{ accounts: 0, orders: 0, order_lines: 0, legs: 0 }])
    expect((await getIndexedUnitSettlementCurrencyViolationSignal()).severity).toBe('ok')
  })

  it('CLF filtrado a un settlement leg → error', async () => {
    queryMock.mockResolvedValueOnce([{ accounts: 0, orders: 0, order_lines: 0, legs: 1 }])
    const s = await getIndexedUnitSettlementCurrencyViolationSignal()

    expect(s.severity).toBe('error')
    expect(s.summary).toContain('legs 1')
  })
})
