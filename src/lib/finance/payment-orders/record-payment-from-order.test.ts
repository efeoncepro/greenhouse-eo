import { beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-765 Slice 4 — tests del resolver loud. El behavior anterior (skip
// silencioso con `recorded=0 skipped=N`) causo el incidente 2026-05-01.
// Estos tests bloquean cualquier regresion al silent-skip mode y verifican:
//   1. happy path payroll → recordExpensePayment llamado, no throw.
//   2. already_linked → skip silencioso preservado (idempotencia legitima).
//   3. expense_not_found → invoca materializer + re-lookup + recordExpensePayment.
//   4. expense still missing → throw PaymentOrderExpenseUnresolvedError +
//      publica `finance.payment_order.settlement_blocked`.
//   5. out_of_scope_v1 → throw PaymentOrderSettlementBlockedError + publica evento.
//   6. recordExpensePayment fail → wrap con cause + emite evento.

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}))

vi.mock('@/lib/finance/expense-payment-ledger', () => ({
  recordExpensePayment: vi.fn()
}))

vi.mock('@/lib/finance/payroll-expense-reactive', () => ({
  materializePayrollExpensesForExportedPeriod: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

import { query, withTransaction } from '@/lib/db'
import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderSettlementBlockedError
} from './errors'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedRecordExpensePayment = recordExpensePayment as unknown as ReturnType<typeof vi.fn>

const mockedMaterialize = materializePayrollExpensesForExportedPeriod as unknown as ReturnType<
  typeof vi.fn
>

const mockedPublishOutboxEvent = publishOutboxEvent as unknown as ReturnType<typeof vi.fn>

const buildOrderHeader = (overrides: Record<string, unknown> = {}) => ({
  order_id: 'por-test-001',
  state: 'paid',
  payment_method: 'transfer',
  source_account_id: 'acc-santander-clp',
  paid_at: '2026-05-01',
  external_reference: null,
  ...overrides
})

const buildLine = (overrides: Record<string, unknown> = {}) => ({
  line_id: 'pol-line-001',
  obligation_id: 'obl-001',
  amount: 148312.5,
  currency: 'CLP',
  state: 'queued',
  expense_payment_id: null,
  beneficiary_type: 'member',
  beneficiary_id: 'mem-luis-reyes',
  obligation_kind: 'employee_net_pay',
  source_kind: 'payroll',
  source_ref: null,
  period_id: 'payroll-2026-04',
  ...overrides
})

describe('recordPaymentForOrder (TASK-765 Slice 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path: payroll line con expense encontrado registra expense_payment', async () => {
    const order = buildOrderHeader()
    const line = buildLine()

    mockedQuery
      .mockResolvedValueOnce([order]) // SELECT order header
      .mockResolvedValueOnce([line]) // SELECT lines

    // withTransaction lookup → expense found
    mockedWithTransaction.mockImplementation(async (cb: (c: unknown) => Promise<unknown>) =>
      cb({
        query: vi.fn().mockResolvedValueOnce({ rows: [{ expense_id: 'exp-001' }] })
      })
    )

    mockedRecordExpensePayment.mockResolvedValueOnce({
      payment: { paymentId: 'exp-pay-001' },
      expenseId: 'exp-001',
      paymentStatus: 'paid',
      amountPaid: 148312.5,
      amountPending: 0
    })

    const { recordPaymentForOrder } = await import('./record-payment-from-order')
    const result = await recordPaymentForOrder({ orderId: 'por-test-001' })

    expect(mockedRecordExpensePayment).toHaveBeenCalledTimes(1)
    expect(mockedPublishOutboxEvent).not.toHaveBeenCalled()
    expect(result.recordedExpensePayments).toHaveLength(1)
    expect(result.recordedExpensePayments[0]).toMatchObject({
      lineId: 'pol-line-001',
      expensePaymentId: 'exp-pay-001',
      expenseId: 'exp-001'
    })
    expect(result.skipped).toHaveLength(0)
  })

  it('already_linked: line con expense_payment_id se skipea silenciosamente', async () => {
    const order = buildOrderHeader()
    const line = buildLine({ expense_payment_id: 'exp-pay-existing' })

    mockedQuery.mockResolvedValueOnce([order]).mockResolvedValueOnce([line])

    const { recordPaymentForOrder } = await import('./record-payment-from-order')
    const result = await recordPaymentForOrder({ orderId: 'por-test-001' })

    expect(mockedRecordExpensePayment).not.toHaveBeenCalled()
    expect(mockedMaterialize).not.toHaveBeenCalled()
    expect(mockedPublishOutboxEvent).not.toHaveBeenCalled()
    expect(result.recordedExpensePayments).toHaveLength(0)
    expect(result.skipped).toEqual([{ lineId: 'pol-line-001', reason: 'already_linked' }])
  })

  it('expense_not_found dispara materializer y re-lookup encuentra expense', async () => {
    const order = buildOrderHeader()
    const line = buildLine()

    mockedQuery.mockResolvedValueOnce([order]).mockResolvedValueOnce([line])

    // Primer lookup: expense ausente. Segundo lookup post-materialize: encontrado.
    let lookupCount = 0

    mockedWithTransaction.mockImplementation(async (cb: (c: unknown) => Promise<unknown>) => {
      lookupCount++

      return cb({
        query: vi.fn().mockResolvedValueOnce({
          rows: lookupCount === 1 ? [] : [{ expense_id: 'exp-after-mat' }]
        })
      })
    })

    mockedMaterialize.mockResolvedValueOnce({
      payrollCreated: 1,
      payrollSkipped: 0,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    })

    mockedRecordExpensePayment.mockResolvedValueOnce({
      payment: { paymentId: 'exp-pay-recovered' },
      expenseId: 'exp-after-mat',
      paymentStatus: 'paid',
      amountPaid: 148312.5,
      amountPending: 0
    })

    const { recordPaymentForOrder } = await import('./record-payment-from-order')
    const result = await recordPaymentForOrder({ orderId: 'por-test-001' })

    expect(mockedMaterialize).toHaveBeenCalledTimes(1)
    expect(mockedMaterialize).toHaveBeenCalledWith({
      periodId: 'payroll-2026-04',
      year: 2026,
      month: 4
    })
    expect(mockedRecordExpensePayment).toHaveBeenCalledTimes(1)
    expect(mockedPublishOutboxEvent).not.toHaveBeenCalled()
    expect(result.recordedExpensePayments).toHaveLength(1)
  })

  it('expense aun missing post-materializer: throw PaymentOrderExpenseUnresolvedError + publica settlement_blocked', async () => {
    const order = buildOrderHeader()
    const line = buildLine()

    mockedQuery.mockResolvedValueOnce([order]).mockResolvedValueOnce([line])

    // Ambos lookups (pre y post materializer) devuelven empty.
    mockedWithTransaction.mockImplementation(async (cb: (c: unknown) => Promise<unknown>) =>
      cb({ query: vi.fn().mockResolvedValueOnce({ rows: [] }) })
    )

    mockedMaterialize.mockResolvedValueOnce({
      payrollCreated: 0,
      payrollSkipped: 0,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    })

    const { recordPaymentForOrder } = await import('./record-payment-from-order')

    await expect(recordPaymentForOrder({ orderId: 'por-test-001' })).rejects.toBeInstanceOf(
      PaymentOrderExpenseUnresolvedError
    )

    expect(mockedPublishOutboxEvent).toHaveBeenCalledTimes(1)

    const publishedArg = mockedPublishOutboxEvent.mock.calls[0]![0] as {
      aggregateType: string
      aggregateId: string
      eventType: string
      payload: Record<string, unknown>
    }

    expect(publishedArg.aggregateType).toBe('payment_order')
    expect(publishedArg.aggregateId).toBe('por-test-001')
    expect(publishedArg.eventType).toBe('finance.payment_order.settlement_blocked')
    expect(publishedArg.payload.eventVersion).toBe('v1')
    expect(publishedArg.payload.reason).toBe('expense_unresolved')
    expect(publishedArg.payload.affectedLineIds).toEqual(['pol-line-001'])
    expect(publishedArg.payload.state).toBe('paid')
    expect(typeof publishedArg.payload.detail).toBe('string')
    expect(typeof publishedArg.payload.blockedAt).toBe('string')
  })

  it('out_of_scope_v1 (employer_social_security): throw PaymentOrderSettlementBlockedError + publica evento', async () => {
    const order = buildOrderHeader()

    const line = buildLine({
      obligation_kind: 'employer_social_security',
      source_kind: 'payroll'
    })

    mockedQuery.mockResolvedValueOnce([order]).mockResolvedValueOnce([line])

    const { recordPaymentForOrder } = await import('./record-payment-from-order')

    await expect(recordPaymentForOrder({ orderId: 'por-test-001' })).rejects.toThrow(
      PaymentOrderSettlementBlockedError
    )

    // Verificacion fina del reason del error.
    try {
      await recordPaymentForOrder({ orderId: 'por-test-001' })
    } catch {
      // Re-fetched para inspeccionar — la primera invocacion ya consumio mocks.
    }

    expect(mockedRecordExpensePayment).not.toHaveBeenCalled()
    expect(mockedMaterialize).not.toHaveBeenCalled()
    expect(mockedPublishOutboxEvent).toHaveBeenCalledTimes(1)

    const publishedArg = mockedPublishOutboxEvent.mock.calls[0]![0] as {
      payload: Record<string, unknown>
    }

    expect(publishedArg.payload.reason).toBe('out_of_scope_v1')
    expect(publishedArg.payload.affectedLineIds).toEqual(['pol-line-001'])
  })

  it('recordExpensePayment falla: wrap con PaymentOrderSettlementBlockedError + cause original + publica evento', async () => {
    const order = buildOrderHeader()
    const line = buildLine()

    mockedQuery.mockResolvedValueOnce([order]).mockResolvedValueOnce([line])

    mockedWithTransaction.mockImplementation(async (cb: (c: unknown) => Promise<unknown>) =>
      cb({
        query: vi.fn().mockResolvedValueOnce({ rows: [{ expense_id: 'exp-001' }] })
      })
    )

    const originalError = new Error(
      'new row violates check constraint "expense_payments_account_required_after_cutover"'
    )

    mockedRecordExpensePayment.mockRejectedValueOnce(originalError)

    const { recordPaymentForOrder } = await import('./record-payment-from-order')

    let caught: unknown

    try {
      await recordPaymentForOrder({ orderId: 'por-test-001' })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(PaymentOrderSettlementBlockedError)
    const wrapped = caught as PaymentOrderSettlementBlockedError & { cause?: unknown }

    expect(wrapped.reason).toBe('cutover_violation')
    expect(wrapped.lineId).toBe('pol-line-001')
    expect(wrapped.cause).toBe(originalError)

    expect(mockedPublishOutboxEvent).toHaveBeenCalledTimes(1)

    const publishedArg = mockedPublishOutboxEvent.mock.calls[0]![0] as {
      payload: Record<string, unknown>
    }

    expect(publishedArg.payload.reason).toBe('cutover_violation')
    expect(typeof publishedArg.payload.detail).toBe('string')
  })
})
