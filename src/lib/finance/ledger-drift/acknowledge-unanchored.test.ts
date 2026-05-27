/**
 * TASK-934 — acknowledgeUnanchoredExpense helper tests.
 *
 * Mirrors the dismiss-phantom contract but for acceptance (NOT void): reason
 * gate, not-found, idempotency, defensive guards (not paid / already anchored),
 * and the happy path (UPDATE acknowledgment columns + outbox event).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const publishOutboxEventMock = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  withTransaction: (callback: (client: { query: typeof queryMock }) => Promise<unknown>) =>
    callback({ query: queryMock })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

import { acknowledgeUnanchoredExpense } from './acknowledge-unanchored'

const unanchoredPaidRow = {
  expense_id: 'EXP-RECON-1',
  payment_status: 'paid',
  economic_category: 'labor_cost_external',
  payroll_entry_id: null,
  tool_catalog_id: null,
  supplier_id: null,
  tax_type: null,
  loan_account_id: null,
  linked_income_id: null,
  unanchored_acknowledged_at: null
}

beforeEach(() => {
  queryMock.mockReset()
  publishOutboxEventMock.mockReset()
})

describe('acknowledgeUnanchoredExpense', () => {
  it('rejects reason shorter than 10 chars before touching the DB', async () => {
    await expect(
      acknowledgeUnanchoredExpense({ expenseId: 'EXP-1', reason: 'corto' })
    ).rejects.toMatchObject({ name: 'FinanceValidationError', statusCode: 422 })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('throws 404 when the expense does not exist', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    await expect(
      acknowledgeUnanchoredExpense({ expenseId: 'EXP-missing', reason: 'pago de nómina externo clasificado' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('is idempotent: already acknowledged → no-op without UPDATE/outbox', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ ...unanchoredPaidRow, unanchored_acknowledged_at: new Date() }]
    })

    const result = await acknowledgeUnanchoredExpense({
      expenseId: 'EXP-RECON-1',
      reason: 'pago de nómina externo clasificado'
    })

    expect(result).toEqual({ expenseId: 'EXP-RECON-1', alreadyAcknowledged: true })
    expect(queryMock).toHaveBeenCalledTimes(1) // only the SELECT FOR UPDATE
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('rejects an expense that is not paid', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ...unanchoredPaidRow, payment_status: 'pending' }] })

    await expect(
      acknowledgeUnanchoredExpense({ expenseId: 'EXP-RECON-1', reason: 'pago de nómina externo clasificado' })
    ).rejects.toMatchObject({ statusCode: 422 })
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('rejects an expense that already has an FK anchor', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ...unanchoredPaidRow, supplier_id: 'SUP-1' }] })

    await expect(
      acknowledgeUnanchoredExpense({ expenseId: 'EXP-RECON-1', reason: 'pago de nómina externo clasificado' })
    ).rejects.toMatchObject({ statusCode: 422 })
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('acknowledges a genuinely unanchored paid expense: UPDATE + outbox', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [unanchoredPaidRow] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // UPDATE

    const result = await acknowledgeUnanchoredExpense({
      expenseId: 'EXP-RECON-1',
      reason: 'pago de nómina externo a Daniela (España) clasificado por economic_category',
      actorUserId: 'user-admin'
    })

    expect(result).toEqual({ expenseId: 'EXP-RECON-1', alreadyAcknowledged: false })
    expect(publishOutboxEventMock).toHaveBeenCalledOnce()
    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event).toMatchObject({
      aggregateType: 'finance.expense',
      aggregateId: 'EXP-RECON-1',
      eventType: 'finance.expense.unanchored_acknowledged'
    })
  })
})
