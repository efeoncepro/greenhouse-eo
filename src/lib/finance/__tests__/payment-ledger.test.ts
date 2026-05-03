import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock implementations declared BEFORE vi.mock() ─────────────────
const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockEnsureSettlement = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn(),
}))

vi.mock('@/lib/finance/settlement-orchestration', () => ({
  ensureSettlementForIncomePayment: (...args: unknown[]) => mockEnsureSettlement(...args),
}))

import { FinanceValidationError } from '@/lib/finance/shared'
import {
  recordPayment,
  getPaymentsForIncome,
  reconcilePaymentTotals,
} from '@/lib/finance/payment-ledger'

// ─── Shared mock data ────────────────────────────────────────────────

const mockPaymentRow = {
  payment_id: 'pay-001',
  income_id: 'INC-001',
  settlement_group_id: null,
  payment_date: '2026-03-15',
  amount: '500',
  currency: 'CLP',
  reference: null,
  payment_method: 'transfer',
  payment_account_id: null,
  payment_source: 'client_direct',
  notes: null,
  recorded_at: '2026-03-15T00:00:00.000Z',
  is_reconciled: false,
  reconciliation_row_id: null,
  reconciled_at: null,
  created_at: '2026-03-15T00:00:00.000Z',
  exchange_rate_at_payment: '1',
  amount_clp: '500',
  fx_gain_loss_clp: '0',
}

const mockIncomeRowPartial = {
  income_id: 'INC-001',
  currency: 'CLP',
  total_amount: '1000',
  amount_paid: '0',
  payment_status: 'pending',
  exchange_rate_to_clp: '1',
}

/**
 * Helper that wires up withGreenhousePostgresTransaction to call the
 * callback with a mock PoolClient whose `query` method is the provided fn.
 */
const setupTransactionMock = (clientQueryFn: ReturnType<typeof vi.fn>) => {
  mockWithGreenhousePostgresTransaction.mockImplementation(
    async (callback: (client: { query: typeof clientQueryFn }) => Promise<unknown>) =>
      callback({ query: clientQueryFn })
  )
}

// ─── recordPayment ───────────────────────────────────────────────────

describe('recordPayment', () => {
  let mockClientQuery: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClientQuery = vi.fn()
    setupTransactionMock(mockClientQuery)
    mockEnsureSettlement.mockResolvedValue({ settlementGroup: { settlementGroupId: 'sg-1' } })
  })

  it('happy path CLP payment: returns partial status when amount is below total', async () => {
    // 1. SELECT income FOR UPDATE → income row with 0 paid on 1000 total
    mockClientQuery
      .mockResolvedValueOnce({ rows: [mockIncomeRowPartial] })

      // 2. INSERT income_payments RETURNING
      .mockResolvedValueOnce({ rows: [mockPaymentRow] })

      // 3. SUM(amount) → 500 paid
      .mockResolvedValueOnce({ rows: [{ total: '500' }] })

      // 4. UPDATE income SET amount_paid
      .mockResolvedValueOnce({ rows: [] })

      // 5. publishOutboxEvent → client.query for outbox INSERT
      .mockResolvedValueOnce({ rows: [] })

    const result = await recordPayment({
      incomeId: 'INC-001',
      paymentDate: '2026-03-15',
      amount: 500,
      currency: 'CLP',
    })

    expect(result.incomeId).toBe('INC-001')
    expect(result.paymentStatus).toBe('partial')
    expect(result.amountPaid).toBe(500)
    expect(result.amountPending).toBe(500)
    expect(result.payment.paymentId).toBe('pay-001')
    expect(result.payment.settlementGroupId).toBe('sg-1')
  })

  it('throws FinanceValidationError 409 when payment would exceed remaining balance', async () => {
    // income has 800 already paid → only 200 remaining; we try to pay 500
    mockClientQuery.mockResolvedValueOnce({
      rows: [{
        ...mockIncomeRowPartial,
        amount_paid: '800',
        payment_status: 'partial',
      }],
    })

    await expect(
      recordPayment({
        incomeId: 'INC-001',
        paymentDate: '2026-03-15',
        amount: 500,
        currency: 'CLP',
      })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 409 &&
        err.message.includes('exceeds')
      )
    })
  })

  it('throws FinanceValidationError 409 on duplicate reference', async () => {
    // 1. income SELECT
    mockClientQuery
      .mockResolvedValueOnce({ rows: [mockIncomeRowPartial] })

      // 2. duplicate reference check → existing payment found
      .mockResolvedValueOnce({ rows: [{ payment_id: 'existing-pay' }] })

    await expect(
      recordPayment({
        incomeId: 'INC-001',
        paymentDate: '2026-03-15',
        amount: 500,
        currency: 'CLP',
        reference: 'REF-001',
      })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 409 &&
        err.message.includes('reference')
      )
    })
  })

  it('marks income as paid when full amount is recorded in one payment', async () => {
    const fullPaymentRow = { ...mockPaymentRow, amount: '1000', amount_clp: '1000' }

    mockClientQuery
      .mockResolvedValueOnce({ rows: [mockIncomeRowPartial] })
      .mockResolvedValueOnce({ rows: [fullPaymentRow] })

      // SUM returns the full amount
      .mockResolvedValueOnce({ rows: [{ total: '1000' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const result = await recordPayment({
      incomeId: 'INC-001',
      paymentDate: '2026-03-15',
      amount: 1000,
      currency: 'CLP',
    })

    expect(result.paymentStatus).toBe('paid')
    expect(result.amountPaid).toBe(1000)
    expect(result.amountPending).toBe(0)
  })

  it('throws FinanceValidationError 404 when income record is not found', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [] })

    await expect(
      recordPayment({
        incomeId: 'NONEXISTENT',
        paymentDate: '2026-03-15',
        amount: 100,
        currency: 'CLP',
      })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 404
      )
    })
  })

  it('does not invoke duplicate-reference check when no reference is provided', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [mockIncomeRowPartial] })
      .mockResolvedValueOnce({ rows: [mockPaymentRow] })
      .mockResolvedValueOnce({ rows: [{ total: '500' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    await recordPayment({
      incomeId: 'INC-001',
      paymentDate: '2026-03-15',
      amount: 500,
      currency: 'CLP',

      // no reference
    })

    // The 2nd client.query call should be the INSERT (not a duplicate check SELECT)
    const secondCall = mockClientQuery.mock.calls[1]?.[0] as string

    expect(secondCall).toContain('INSERT INTO greenhouse_finance.income_payments')
  })
})

// ─── getPaymentsForIncome ────────────────────────────────────────────

describe('getPaymentsForIncome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns payments list with correct totalPaid and paymentCount', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockPaymentRow])

    const result = await getPaymentsForIncome('INC-001')

    expect(result.incomeId).toBe('INC-001')
    expect(result.payments).toHaveLength(1)
    expect(result.paymentCount).toBe(1)
    expect(result.totalPaid).toBe(500)
    expect(result.payments[0].paymentId).toBe('pay-001')
  })

  it('returns empty payments list when no payments exist', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const result = await getPaymentsForIncome('INC-999')

    expect(result.payments).toHaveLength(0)
    expect(result.totalPaid).toBe(0)
    expect(result.paymentCount).toBe(0)
  })

  it('sums totalPaid correctly across multiple payment rows', async () => {
    const secondPaymentRow = { ...mockPaymentRow, payment_id: 'pay-002', amount: '300', amount_clp: '300' }

    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockPaymentRow, secondPaymentRow])

    const result = await getPaymentsForIncome('INC-001')

    expect(result.payments).toHaveLength(2)
    expect(result.totalPaid).toBe(800)
  })

  it('queries using ORDER BY payment_date DESC', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    await getPaymentsForIncome('INC-001')

    const sql = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(sql).toContain('ORDER BY payment_date DESC')
    expect(sql).toContain('income_id = $1')
  })
})

// ─── reconcilePaymentTotals ──────────────────────────────────────────

describe('reconcilePaymentTotals', () => {
  let mockClientQuery: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClientQuery = vi.fn()
    setupTransactionMock(mockClientQuery)
  })

  it('reports consistent state and does not update when amount_paid matches SUM', async () => {
    // SELECT income FOR UPDATE
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          income_id: 'INC-001',
          total_amount: '1000',
          amount_paid: '500',
          payment_status: 'partial',
        }],
        rowCount: 1,
      })

      // SUM + COUNT from income_payments
      .mockResolvedValueOnce({
        rows: [{ total: '500.00', cnt: '1' }],
        rowCount: 1,
      })

    const result = await reconcilePaymentTotals('INC-001')

    expect(result.incomeId).toBe('INC-001')
    expect(result.isConsistent).toBe(true)
    expect(result.corrected).toBe(false)
    expect(result.amountPaid).toBe(500)
    expect(result.sumPayments).toBe(500)
    expect(result.paymentCount).toBe(1)
  })

  it('detects inconsistency and corrects drift (amount_paid diverges from SUM)', async () => {
    // SELECT income: reports 300 paid but actual sum is 500
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          income_id: 'INC-001',
          total_amount: '1000',
          amount_paid: '300',
          payment_status: 'partial',
        }],
        rowCount: 1,
      })

      // SUM query: actual is 500
      .mockResolvedValueOnce({
        rows: [{ total: '500.00', cnt: '2' }],
        rowCount: 1,
      })

      // UPDATE income SET amount_paid
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const result = await reconcilePaymentTotals('INC-001')

    expect(result.isConsistent).toBe(false)
    expect(result.corrected).toBe(true)
    expect(result.amountPaid).toBe(500) // corrected to sumPayments
    expect(result.sumPayments).toBe(500)
    expect(result.paymentCount).toBe(2)
  })

  it('throws FinanceValidationError 404 when income record is not found', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    await expect(reconcilePaymentTotals('NONEXISTENT')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof FinanceValidationError && err.statusCode === 404
    )
  })

  it('reports paymentStatus as paid when SUM equals totalAmount', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          income_id: 'INC-001',
          total_amount: '1000',
          amount_paid: '1000',
          payment_status: 'paid',
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ total: '1000.00', cnt: '2' }],
        rowCount: 1,
      })

    const result = await reconcilePaymentTotals('INC-001')

    expect(result.paymentStatus).toBe('paid')
    expect(result.isConsistent).toBe(true)
  })

  it('reports paymentStatus as pending when SUM is zero', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [{
          income_id: 'INC-001',
          total_amount: '1000',
          amount_paid: '0',
          payment_status: 'pending',
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ total: '0.00', cnt: '0' }],
        rowCount: 1,
      })

    const result = await reconcilePaymentTotals('INC-001')

    expect(result.paymentStatus).toBe('pending')
    expect(result.sumPayments).toBe(0)
    expect(result.paymentCount).toBe(0)
    expect(result.isConsistent).toBe(true)
  })
})
