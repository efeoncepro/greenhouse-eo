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

import {
  countAccountBalancesFxDriftRows,
  getAccountBalancesFxDriftSignal,
  listAccountBalancesFxDriftRows
} from './account-balances-fx-drift'

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

    // Tolerancia parametrizada anti FP-noise
    expect(sql).toContain('> $2::numeric')
    expect(queryMock.mock.calls[0]?.[1]).toEqual([90, 1])
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

  it('returns detailed drift rows ordered by severity/date/account for remediation consumers', async () => {
    queryMock.mockResolvedValueOnce([
      {
        account_id: 'santander-clp',
        account_name: 'Santander CLP',
        currency: 'CLP',
        balance_date: '2026-05-01',
        is_period_closed: false,
        transaction_count: 0,
        persisted_inflows_clp: '0.00',
        persisted_outflows_clp: '0.00',
        persisted_closing_balance_clp: '1615054.57',
        expected_inflows_clp: '0',
        expected_outflows_clp: '402562.50',
        expected_closing_balance_clp: '1212492.07',
        drift_clp: '-402562.50',
        abs_drift_clp: '402562.50',
        settlement_leg_count: 2,
        income_payment_count: 0,
        expense_payment_count: 0,
        detected_at: '2026-05-09T12:00:00.000Z'
      }
    ])

    const rows = await listAccountBalancesFxDriftRows({ accountId: 'santander-clp', fromDate: '2026-05-01' })

    expect(rows).toEqual([
      {
        accountId: 'santander-clp',
        accountName: 'Santander CLP',
        currency: 'CLP',
        balanceDate: '2026-05-01',
        isPeriodClosed: false,
        transactionCount: 0,
        persistedInflowsClp: '0.00',
        persistedOutflowsClp: '0.00',
        persistedClosingBalanceClp: '1615054.57',
        expectedInflowsClp: '0',
        expectedOutflowsClp: '402562.50',
        expectedClosingBalanceClp: '1212492.07',
        driftClp: '-402562.50',
        absDriftClp: '402562.50',
        evidenceRefs: {
          settlementLegs: 2,
          incomePayments: 0,
          expensePayments: 0
        },
        detectedAt: '2026-05-09T12:00:00.000Z'
      }
    ])

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('ORDER BY abs_drift_clp DESC, balance_date DESC, account_id ASC')
    expect(sql).toContain('LIMIT 100')
    expect(queryMock.mock.calls[0]?.[1]).toEqual(['2026-05-01', 'santander-clp', 1])
  })

  it('supports exact count without applying row limit', async () => {
    queryMock.mockResolvedValueOnce([{ n: 7 }])

    await expect(countAccountBalancesFxDriftRows({ windowDays: 30, toleranceClp: 0.5 })).resolves.toBe(7)

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('SELECT COUNT(*)::int AS n FROM drift_rows')
    expect(sql).not.toContain('LIMIT')
    expect(queryMock.mock.calls[0]?.[1]).toEqual([30, 0.5])
  })
})
