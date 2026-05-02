/**
 * TASK-765 Slice 7 — tests for the 3 payment-orders reliability signal readers.
 *
 * Each reader has 3 paths covered:
 *   1. count = 0 → severity 'ok'
 *   2. count > 0 → severity 'error' or 'warning' (depending on the signal)
 *   3. query throws → severity 'unknown' (degraded, never propagates)
 *
 * The `query` helper is mocked at module level so the test runs without DB.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getPaidOrdersWithoutExpensePaymentSignal } from './payment-orders-paid-without-expense-payment'
import { getPaymentOrdersDeadLetterSignal } from './payment-orders-dead-letter'
import { getPayrollExpenseMaterializationLagSignal } from './payroll-expense-materialization-lag'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getPaidOrdersWithoutExpensePaymentSignal', () => {
  it('returns ok when count = 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getPaidOrdersWithoutExpensePaymentSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.payment_orders.paid_without_expense_payment')
    expect(signal.summary).toContain('Sin órdenes zombie')
  })

  it('returns error severity when count > 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2 }])

    const signal = await getPaidOrdersWithoutExpensePaymentSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('2')
  })

  it('returns unknown when the query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getPaidOrdersWithoutExpensePaymentSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })
})

describe('getPaymentOrdersDeadLetterSignal', () => {
  it('returns ok when count = 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getPaymentOrdersDeadLetterSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('dead_letter')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.payment_orders.dead_letter')
  })

  it('returns error severity when count > 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1 }])

    const signal = await getPaymentOrdersDeadLetterSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('1')
  })

  it('passes the canonical handler list as parameter', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getPaymentOrdersDeadLetterSignal()

    expect(queryMock).toHaveBeenCalledTimes(1)
    const handlers = queryMock.mock.calls[0]?.[1]?.[0]

    expect(handlers).toEqual([
      'record_expense_payment_from_order:finance.payment_order.paid',
      'finance_expense_reactive_intake:payroll_period.exported'
    ])
  })

  it('returns unknown when the query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getPaymentOrdersDeadLetterSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})

describe('getPayrollExpenseMaterializationLagSignal', () => {
  it('returns ok when count = 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getPayrollExpenseMaterializationLagSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('lag')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.payroll_expense.materialization_lag')
  })

  it('returns warning (not error) severity when count > 0', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getPayrollExpenseMaterializationLagSignal()

    // Async pipeline lag → warning, not error. Operator monitors but it can
    // self-recover via reactive worker retry.
    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3')
  })

  it('returns unknown when the query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('schema not found'))

    const signal = await getPayrollExpenseMaterializationLagSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})
