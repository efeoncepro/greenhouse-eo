import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PaymentOrderConflictError,
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderMissingSourceAccountError,
  PaymentOrderSettlementBlockedError,
  PaymentOrderValidationError
} from './errors'

// TASK-765 Slice 5 contract tests. Verifican el comportamiento atomic de
// markPaymentOrderPaidAtomic con mocks de las dependencias DB. Tests
// integration con DB real viven en slice 8 + smoke staging.

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  recordExpensePayment: vi.fn(),
  materializePayrollExpensesForExportedPeriod: vi.fn(),
  publishOutboxEvent: vi.fn(),
  recordPaymentOrderStateTransition: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction
}))

vi.mock('@/lib/finance/expense-payment-ledger', () => ({
  recordExpensePayment: mocks.recordExpensePayment
}))

vi.mock('@/lib/finance/payroll-expense-reactive', () => ({
  materializePayrollExpensesForExportedPeriod: mocks.materializePayrollExpensesForExportedPeriod
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

vi.mock('./state-transitions-audit', () => ({
  recordPaymentOrderStateTransition: mocks.recordPaymentOrderStateTransition
}))

// row-mapper does pure mapping — no need to mock; let it run real.

const { markPaymentOrderPaidAtomic } = await import('./mark-paid-atomic')

interface FakeClientCallSequence {
  selectForUpdate: { rows: Array<Record<string, unknown>>; rowCount?: number }
  updatePaymentOrders: { rows: Array<Record<string, unknown>>; rowCount?: number }
  updateLines: { rows: Array<{ obligation_id: string }>; rowCount?: number }
  updateObligations?: { rows: []; rowCount?: number }
  selectLinesForExecution: { rows: Array<Record<string, unknown>>; rowCount?: number }
}

const buildFakeClient = (sequence: FakeClientCallSequence) => {
  const calls: Array<{ sql: string; params: unknown[] }> = []

  const queue = [
    sequence.selectForUpdate,
    sequence.updatePaymentOrders,
    sequence.updateLines,
    sequence.updateObligations ?? { rows: [], rowCount: 0 },
    sequence.selectLinesForExecution
  ]

  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params })

      if (sql.includes('FROM greenhouse_finance.accounts')) {
        return {
          rows: [{
            account_id: params[0] ?? 'santander-clp',
            currency: 'CLP',
            instrument_category: 'bank_account',
            provider_slug: 'santander',
            is_active: true,
            default_for: ['payroll']
          }],
          rowCount: 1
        }
      }

      const next = queue.shift()

      // Si se acaba la cola, devolver vacio (las consultas extras se manejan
      // por mocks individuales — recordExpensePayment, etc).
      return next ?? { rows: [], rowCount: 0 }
    })
  }

  return { client, calls }
}

const baseOrderRow = {
  order_id: 'por-test-001',
  state: 'submitted',
  payment_method: 'bank_transfer',
  source_account_id: 'santander-clp',
  paid_at: null,
  external_reference: null,
  total_amount: 254250,
  currency: 'CLP',
  batch_kind: 'payroll',
  title: 'Nomina 2026-04 — Test Member',
  description: null,
  processor_slug: null,
  period_id: '2026-04',
  scheduled_for: null,
  due_date: null,
  submitted_at: '2026-05-01T20:00:00Z',
  fx_rate_snapshot: null,
  fx_locked_at: null,
  require_approval: true,
  created_by: 'user-test',
  approved_by: 'user-other',
  approved_at: '2026-05-01T19:00:00Z',
  cancelled_by: null,
  cancelled_reason: null,
  cancelled_at: null,
  superseded_by: null,
  external_status: null,
  failure_reason: null,
  metadata_json: {},
  created_at: '2026-05-01T17:00:00Z',
  updated_at: '2026-05-01T20:00:00Z'
}

const baseLineRow = {
  line_id: 'pol-test-line-001',
  obligation_id: 'pob-test-001',
  amount: '254250.00',
  currency: 'CLP',
  state: 'submitted',
  expense_payment_id: null,
  beneficiary_type: 'member',
  beneficiary_id: 'humberly-henriquez',
  obligation_kind: 'employee_net_pay',
  source_kind: 'payroll',
  source_ref: '2026-04',
  period_id: '2026-04'
}

const activeSourceAccountResponse = (accountId: unknown = 'santander-clp') => ({
  rows: [{
    account_id: accountId,
    currency: 'CLP',
    instrument_category: 'bank_account',
    provider_slug: 'santander',
    is_active: true,
    default_for: ['payroll']
  }],
  rowCount: 1
})

const accountAwareSequenceQuery = (allResponses: Array<{ rows: Array<Record<string, unknown>>; rowCount?: number }>) =>
  vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_finance.accounts')) {
      return activeSourceAccountResponse(params[0])
    }

    return allResponses.shift() ?? { rows: [], rowCount: 0 }
  })

const setupHappyPath = () => {
  const fakeClient = buildFakeClient({
    selectForUpdate: { rows: [baseOrderRow], rowCount: 1 },
    updatePaymentOrders: {
      rows: [{ ...baseOrderRow, state: 'paid', paid_at: '2026-05-02T00:00:00Z' }],
      rowCount: 1
    },
    updateLines: { rows: [{ obligation_id: 'pob-test-001' }], rowCount: 1 },
    selectLinesForExecution: { rows: [baseLineRow], rowCount: 1 }
  })

  // Resolver expense lookup (corre en client.query inside resolvePayrollExpenseIdInTx)
  // se anade al final de la cola dinamica.
  fakeClient.client.query.mockImplementationOnce(async () => ({
    rows: [baseOrderRow],
    rowCount: 1
  }))

  // Reset to use a single sequenced mock with all expected calls in order.
  fakeClient.client.query.mockReset()

  const allResponses = [
    { rows: [baseOrderRow], rowCount: 1 }, // SELECT FOR UPDATE
    {
      rows: [{ ...baseOrderRow, state: 'paid', paid_at: '2026-05-02T00:00:00Z' }],
      rowCount: 1
    }, // UPDATE payment_orders
    { rows: [{ obligation_id: 'pob-test-001' }], rowCount: 1 }, // UPDATE lines
    { rows: [], rowCount: 0 }, // UPDATE obligations
    { rows: [baseLineRow], rowCount: 1 }, // SELECT lines for execution
    { rows: [{ expense_id: 'EXP-202604-003' }], rowCount: 1 } // resolve expense
  ]

  fakeClient.client.query.mockImplementation(accountAwareSequenceQuery(allResponses))

  mocks.withTransaction.mockImplementation(async fn => fn(fakeClient.client))
  mocks.recordPaymentOrderStateTransition.mockResolvedValue({
    transitionId: 'pst-test-1',
    orderId: 'por-test-001',
    fromState: 'submitted',
    toState: 'paid',
    occurredAt: '2026-05-02T00:00:00Z'
  })
  mocks.recordExpensePayment.mockResolvedValue({
    payment: {
      paymentId: 'exp-pay-test-1',
      settlementGroupId: 'sg-test-1'
    },
    expenseId: 'EXP-202604-003',
    paymentStatus: 'paid',
    amountPaid: 254250,
    amountPending: 0
  })
  mocks.publishOutboxEvent.mockResolvedValue('outbox-test-1')

  return fakeClient
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('markPaymentOrderPaidAtomic', () => {
  it('happy path: state transition + expense_payment + audit + outbox dentro de la misma tx', async () => {
    setupHappyPath()

    const result = await markPaymentOrderPaidAtomic({
      orderId: 'por-test-001',
      paidBy: 'user-julio'
    })

    expect(result.order.orderId).toBe('por-test-001')
    expect(result.order.state).toBe('paid')
    expect(result.expensePaymentIds).toEqual(['exp-pay-test-1'])
    expect(result.settlementGroupIds).toEqual(['sg-test-1'])
    expect(result.eventId).toBe('outbox-test-1')
    expect(result.auditTransitionId).toBe('pst-test-1')

    expect(mocks.withTransaction).toHaveBeenCalledOnce()
    expect(mocks.recordExpensePayment).toHaveBeenCalledOnce()
    expect(mocks.recordPaymentOrderStateTransition).toHaveBeenCalledOnce()
    expect(mocks.publishOutboxEvent).toHaveBeenCalledOnce()
  })

  it('rechaza orderId vacio (validation)', async () => {
    await expect(
      markPaymentOrderPaidAtomic({ orderId: '', paidBy: 'user-x' })
    ).rejects.toBeInstanceOf(PaymentOrderValidationError)
  })

  it('rechaza paidBy vacio (validation)', async () => {
    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-x', paidBy: '' })
    ).rejects.toBeInstanceOf(PaymentOrderValidationError)
  })

  it('lanza 404 si order no existe', async () => {
    mocks.withTransaction.mockImplementation(async fn => {
      const c = {
        query: vi.fn(async () => ({ rows: [], rowCount: 0 }))
      }

      return fn(c)
    })

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-missing', paidBy: 'user-x' })
    ).rejects.toBeInstanceOf(PaymentOrderValidationError)
  })

  it('lanza conflict si state no es submitted', async () => {
    mocks.withTransaction.mockImplementation(async fn => {
      const c = {
        query: vi.fn(async () => ({
          rows: [{ ...baseOrderRow, state: 'paid' }],
          rowCount: 1
        }))
      }

      return fn(c)
    })

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-x', paidBy: 'user-x' })
    ).rejects.toBeInstanceOf(PaymentOrderConflictError)
  })

  it('lanza source_account_required si source_account_id NULL (slice 1 hard-gate)', async () => {
    mocks.withTransaction.mockImplementation(async fn => {
      const c = {
        query: vi.fn(async () => ({
          rows: [{ ...baseOrderRow, source_account_id: null }],
          rowCount: 1
        }))
      }

      return fn(c)
    })

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-x', paidBy: 'user-x' })
    ).rejects.toBeInstanceOf(PaymentOrderMissingSourceAccountError)
  })

  it('lanza out_of_scope_v1 cuando line es non-payroll (rollback)', async () => {
    const allResponses = [
      { rows: [baseOrderRow], rowCount: 1 },
      {
        rows: [{ ...baseOrderRow, state: 'paid', paid_at: '2026-05-02T00:00:00Z' }],
        rowCount: 1
      },
      { rows: [{ obligation_id: 'pob-supplier-001' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      {
        rows: [
          {
            ...baseLineRow,
            obligation_kind: 'processor_fee',
            source_kind: 'manual'
          }
        ],
        rowCount: 1
      }
    ]

    const c = {
      query: accountAwareSequenceQuery(allResponses)
    }

    mocks.withTransaction.mockImplementation(async fn => fn(c))
    mocks.recordPaymentOrderStateTransition.mockResolvedValue({
      transitionId: 'pst-x',
      orderId: 'por-x',
      fromState: 'submitted',
      toState: 'paid',
      occurredAt: '2026-05-02T00:00:00Z'
    })

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-test-001', paidBy: 'user-x' })
    ).rejects.toMatchObject({
      code: 'settlement_blocked',
      reason: 'out_of_scope_v1'
    })
  })

  it('lanza expense_unresolved si materializer corre y aun NO encuentra expense', async () => {
    const allResponses = [
      { rows: [baseOrderRow], rowCount: 1 },
      {
        rows: [{ ...baseOrderRow, state: 'paid', paid_at: '2026-05-02T00:00:00Z' }],
        rowCount: 1
      },
      { rows: [{ obligation_id: 'pob-test-001' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [baseLineRow], rowCount: 1 },
      // Primer lookup expense: 0 filas
      { rows: [], rowCount: 0 },
      // Segundo lookup despues de materializer: 0 filas (ghost member)
      { rows: [], rowCount: 0 }
    ]

    const c = {
      query: accountAwareSequenceQuery(allResponses)
    }

    mocks.withTransaction.mockImplementation(async fn => fn(c))
    mocks.recordPaymentOrderStateTransition.mockResolvedValue({
      transitionId: 'pst-x',
      orderId: 'por-x',
      fromState: 'submitted',
      toState: 'paid',
      occurredAt: '2026-05-02T00:00:00Z'
    })
    mocks.materializePayrollExpensesForExportedPeriod.mockResolvedValue({
      payrollCreated: 0,
      payrollSkipped: 0,
      socialSecurityCreated: false,
      socialSecuritySkipped: true
    })

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-test-001', paidBy: 'user-x' })
    ).rejects.toBeInstanceOf(PaymentOrderExpenseUnresolvedError)

    expect(mocks.materializePayrollExpensesForExportedPeriod).toHaveBeenCalledOnce()
  })

  it('lanza materializer_dead_letter si el materializer mismo throw', async () => {
    const allResponses = [
      { rows: [baseOrderRow], rowCount: 1 },
      {
        rows: [{ ...baseOrderRow, state: 'paid', paid_at: '2026-05-02T00:00:00Z' }],
        rowCount: 1
      },
      { rows: [{ obligation_id: 'pob-test-001' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [baseLineRow], rowCount: 1 },
      { rows: [], rowCount: 0 } // primer lookup miss
    ]

    const c = {
      query: accountAwareSequenceQuery(allResponses)
    }

    mocks.withTransaction.mockImplementation(async fn => fn(c))
    mocks.recordPaymentOrderStateTransition.mockResolvedValue({
      transitionId: 'pst-x',
      orderId: 'por-x',
      fromState: 'submitted',
      toState: 'paid',
      occurredAt: '2026-05-02T00:00:00Z'
    })
    mocks.materializePayrollExpensesForExportedPeriod.mockRejectedValue(
      new Error('INSERT has more target columns than expressions')
    )

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-test-001', paidBy: 'user-x' })
    ).rejects.toMatchObject({
      code: 'settlement_blocked',
      reason: 'materializer_dead_letter'
    })
  })

  it('cualquier failure de recordExpensePayment se wrappea como settlement_blocked + rollback', async () => {
    setupHappyPath()
    mocks.recordExpensePayment.mockRejectedValueOnce(
      new Error('CHECK constraint expense_payments_account_required_after_cutover')
    )

    await expect(
      markPaymentOrderPaidAtomic({ orderId: 'por-test-001', paidBy: 'user-x' })
    ).rejects.toBeInstanceOf(PaymentOrderSettlementBlockedError)
  })

  it('idempotencia: line con expense_payment_id ya existente se skipea silenciosa', async () => {
    const allResponses = [
      { rows: [baseOrderRow], rowCount: 1 },
      {
        rows: [{ ...baseOrderRow, state: 'paid', paid_at: '2026-05-02T00:00:00Z' }],
        rowCount: 1
      },
      { rows: [{ obligation_id: 'pob-test-001' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      {
        rows: [
          {
            ...baseLineRow,
            expense_payment_id: 'exp-pay-already-existing'
          }
        ],
        rowCount: 1
      }
    ]

    const c = {
      query: accountAwareSequenceQuery(allResponses)
    }

    mocks.withTransaction.mockImplementation(async fn => fn(c))
    mocks.recordPaymentOrderStateTransition.mockResolvedValue({
      transitionId: 'pst-x',
      orderId: 'por-x',
      fromState: 'submitted',
      toState: 'paid',
      occurredAt: '2026-05-02T00:00:00Z'
    })
    mocks.publishOutboxEvent.mockResolvedValue('outbox-idem-1')

    const result = await markPaymentOrderPaidAtomic({
      orderId: 'por-test-001',
      paidBy: 'user-x'
    })

    // recordExpensePayment NO llamado porque la line ya estaba wired.
    expect(mocks.recordExpensePayment).not.toHaveBeenCalled()
    // Pero el state transition + audit log + outbox SI corren — son parte
    // de la transicion de estado, no del per-line settlement.
    expect(result.expensePaymentIds).toEqual([])
  })
})
