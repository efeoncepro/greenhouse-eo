/**
 * TASK-774 Slice 4 — tests para getAccountBalancesFxDriftSignal.
 *
 * 4 paths cubiertos:
 *   1. count = 0 → severity 'ok' + summary "Sin drift"
 *   2. count > 0 → severity 'error' + recomienda backfill
 *   3. SQL lee VIEWs canónicas TASK-766 + COALESCE settlement_legs (no raw tables sin _clp)
 *   4. query throws → severity 'unknown' (degraded)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getAccountBalancesFxDriftSignal } from './account-balances-fx-drift'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getAccountBalancesFxDriftSignal — TASK-774', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.account_balances.fx_drift')
    expect(signal.summary).toContain('Sin drift FX')
  })

  it('returns error severity when count > 0 + recommends backfill', async () => {
    queryMock.mockResolvedValueOnce([{ n: 5 }])

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('5 account_balances')
    expect(signal.summary).toContain('backfill-account-balances-fx-fix')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('5')
  })

  it('SQL reads from canonical VIEWs + COALESCE settlement_legs (anti-regresión)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getAccountBalancesFxDriftSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    // Lee VIEWs canónicas TASK-766
    expect(sql).toContain('expense_payments_normalized')
    expect(sql).toContain('income_payments_normalized')
    expect(sql).toContain('payment_amount_clp')

    // settlement_legs con COALESCE (TASK-774 patrón inline)
    expect(sql).toContain('COALESCE(sl.amount_clp')

    // Filtros 3-axis supersede preservados
    expect(sql).toContain('superseded_at IS NULL')
    expect(sql).toContain('superseded_by_otb_id IS NULL')

    // Tolerancia $1 CLP anti FP-noise
    expect(sql).toContain('> 1')
  })

  it('returns unknown when the query throws (degraded honestamente)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })

  it('exposes window_days=90 + tolerance_clp=1 metadata', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.evidence.find(e => e.label === 'window_days')?.value).toBe('90')
    expect(signal.evidence.find(e => e.label === 'tolerance_clp')?.value).toBe('1')
  })
})
