/**
 * TASK-766 Slice 2 — tests for the 2 CLP-drift reliability signal readers.
 *
 * Each reader has 3 paths covered:
 *   1. count = 0 → severity 'ok'
 *   2. count > 0 → severity 'error'
 *   3. query throws → severity 'unknown' (degraded, never propagates)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getExpensePaymentsClpDriftSignal } from './expense-payments-clp-drift'
import { getIncomePaymentsClpDriftSignal } from './income-payments-clp-drift'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getExpensePaymentsClpDriftSignal', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getExpensePaymentsClpDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.expense_payments.clp_drift')
    expect(signal.summary).toContain('Sin payments')
  })

  it('returns error severity when count > 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getExpensePaymentsClpDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('3 expense_payments')
    expect(signal.summary).toContain('payments-clp-repair')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('3')
  })

  it('reads from the canonical VIEW (not from raw expense_payments)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getExpensePaymentsClpDriftSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('expense_payments_normalized')
    expect(sql).toContain('has_clp_drift = TRUE')
    // Anti-regresión: nunca leer la tabla raw bypassing supersede filter.
    expect(sql).not.toContain('FROM greenhouse_finance.expense_payments\n')
  })

  it('returns unknown when the query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getExpensePaymentsClpDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })
})

describe('getIncomePaymentsClpDriftSignal', () => {
  it('returns ok when count = 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getIncomePaymentsClpDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.income_payments.clp_drift')
  })

  it('returns error severity when count > 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 21 }])

    const signal = await getIncomePaymentsClpDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('21 income_payments')
  })

  it('reads from the canonical VIEW income_payments_normalized', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getIncomePaymentsClpDriftSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('income_payments_normalized')
    expect(sql).toContain('has_clp_drift = TRUE')
  })

  it('returns unknown when the query throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getIncomePaymentsClpDriftSignal()

    expect(signal.severity).toBe('unknown')
  })
})
