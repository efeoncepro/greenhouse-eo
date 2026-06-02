/**
 * TASK-990 Slice 8 — tests para los 5 signals multi-currency / FX.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const flagMock = vi.fn(() => false)

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/finance/multi-currency/flags', () => ({
  isFinanceCoreMxnEnabled: () => flagMock()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getCashSignalUnsupportedCurrencySignal,
  getFxSnapshotMissingSignal,
  getMxnRateFreshnessSignal,
  getNativeEquivalentDriftSignal,
  getNuboxExportForeignAmountMissingSignal
} from './multi-currency-fx-signals'

beforeEach(() => {
  queryMock.mockReset()
  flagMock.mockReset()
  flagMock.mockReturnValue(false)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getMxnRateFreshnessSignal', () => {
  it('no MXN exposure → ok', async () => {
    queryMock.mockResolvedValueOnce([{ has_exposure: false, age_days: null }])
    const s = await getMxnRateFreshnessSignal()

    expect(s.signalId).toBe('finance.fx.mxn_rate_freshness')
    expect(s.kind).toBe('lag')
    expect(s.severity).toBe('ok')
  })

  it('MXN exposure but no rate → error', async () => {
    queryMock.mockResolvedValueOnce([{ has_exposure: true, age_days: null }])
    expect((await getMxnRateFreshnessSignal()).severity).toBe('error')
  })

  it('MXN exposure, fresh rate → ok', async () => {
    queryMock.mockResolvedValueOnce([{ has_exposure: true, age_days: 2 }])
    expect((await getMxnRateFreshnessSignal()).severity).toBe('ok')
  })

  it('MXN exposure, 10-day rate → warning', async () => {
    queryMock.mockResolvedValueOnce([{ has_exposure: true, age_days: 10 }])
    expect((await getMxnRateFreshnessSignal()).severity).toBe('warning')
  })

  it('MXN exposure, 40-day rate → error', async () => {
    queryMock.mockResolvedValueOnce([{ has_exposure: true, age_days: 40 }])
    expect((await getMxnRateFreshnessSignal()).severity).toBe('error')
  })

  it('query throws → unknown', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    expect((await getMxnRateFreshnessSignal()).severity).toBe('unknown')
  })
})

describe('getFxSnapshotMissingSignal', () => {
  it('count 0 → ok', async () => {
    queryMock.mockResolvedValueOnce([{ income_n: 0, expense_n: 0 }])
    const s = await getFxSnapshotMissingSignal()

    expect(s.signalId).toBe('finance.fx.snapshot_missing')
    expect(s.severity).toBe('ok')
  })

  it('count > 0 → error', async () => {
    queryMock.mockResolvedValueOnce([{ income_n: 1, expense_n: 2 }])
    const s = await getFxSnapshotMissingSignal()

    expect(s.severity).toBe('error')
    expect(s.summary).toContain('3')
  })
})

describe('getNuboxExportForeignAmountMissingSignal', () => {
  it('flag OFF → ok without querying (sourcing disabled)', async () => {
    flagMock.mockReturnValue(false)
    const s = await getNuboxExportForeignAmountMissingSignal()

    expect(s.signalId).toBe('finance.nubox_export.foreign_amount_missing')
    expect(s.severity).toBe('ok')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('flag ON + count 0 → ok', async () => {
    flagMock.mockReturnValue(true)
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    expect((await getNuboxExportForeignAmountMissingSignal()).severity).toBe('ok')
  })

  it('flag ON + count > 0 → error', async () => {
    flagMock.mockReturnValue(true)
    queryMock.mockResolvedValueOnce([{ n: 4 }])
    const s = await getNuboxExportForeignAmountMissingSignal()

    expect(s.severity).toBe('error')
    expect(s.summary).toContain('4')
  })
})

describe('getNativeEquivalentDriftSignal', () => {
  it('no drift → ok', async () => {
    queryMock.mockResolvedValueOnce([{ functional_n: 0, reporting_n: 0 }])
    const s = await getNativeEquivalentDriftSignal()

    expect(s.signalId).toBe('finance.multi_currency.native_equivalent_drift')
    expect(s.kind).toBe('drift')
    expect(s.severity).toBe('ok')
  })

  it('drift > 0 → error', async () => {
    queryMock.mockResolvedValueOnce([{ functional_n: 1, reporting_n: 1 }])
    const s = await getNativeEquivalentDriftSignal()

    expect(s.severity).toBe('error')
    expect(s.summary).toContain('2')
  })
})

describe('getCashSignalUnsupportedCurrencySignal', () => {
  it('count 0 → ok', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    const s = await getCashSignalUnsupportedCurrencySignal()

    expect(s.signalId).toBe('finance.cash_signal.unsupported_currency')
    expect(s.severity).toBe('ok')
  })

  it('count > 0 → error', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])
    expect((await getCashSignalUnsupportedCurrencySignal()).severity).toBe('error')
  })
})
