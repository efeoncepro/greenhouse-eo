import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

const withTransactionMock = vi.fn(async (callback: (client: { query: typeof queryMock }) => Promise<unknown>) =>
  callback({ query: queryMock })
)

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  withTransaction: (callback: (client: { query: typeof queryMock }) => Promise<unknown>) =>
    withTransactionMock(callback)
}))

import { query } from '@/lib/db'
import {
  approveExpenseServiceAllocation,
  createExpenseServiceAllocation,
  ExpenseServiceAllocationConflictError,
  ExpenseServiceAllocationError,
  listExpenseServiceAllocationsForExpense,
  rejectExpenseServiceAllocation
} from './expense-service-allocations'

const listQueryMock = query as unknown as ReturnType<typeof vi.fn>

const baseRow = {
  allocation_id: 'esa-123',
  expense_id: 'exp-1',
  service_id: 'svc-1',
  client_id: 'cli-1',
  period_year: 2026,
  period_month: 5,
  allocated_amount_clp: '15000.50',
  allocation_source: 'manual',
  evidence_json: { source: 'unit-test' },
  review_status: 'draft',
  created_by: 'user-1',
  created_at: '2026-05-07T12:00:00.000Z',
  updated_at: '2026-05-07T12:00:00.000Z',
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  rejection_reason: null
}

beforeEach(() => {
  queryMock.mockReset()
  listQueryMock.mockReset()
  withTransactionMock.mockClear()
})

describe('expense service allocations', () => {
  it('creates a draft allocation through a transaction', async () => {
    queryMock.mockResolvedValueOnce({ rows: [baseRow] })

    const result = await createExpenseServiceAllocation({
      expenseId: ' exp-1 ',
      serviceId: ' svc-1 ',
      clientId: ' cli-1 ',
      periodYear: 2026,
      periodMonth: 5,
      allocatedAmountClp: 15000.499,
      evidence: { source: 'unit-test' },
      actorId: ' user-1 '
    })

    expect(withTransactionMock).toHaveBeenCalledOnce()
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO greenhouse_finance.expense_service_allocations'), [
      expect.stringMatching(/^esa-/),
      'exp-1',
      'svc-1',
      'cli-1',
      2026,
      5,
      15000.5,
      'manual',
      JSON.stringify({ source: 'unit-test' }),
      'user-1'
    ])
    expect(result).toMatchObject({
      allocationId: 'esa-123',
      expenseId: 'exp-1',
      serviceId: 'svc-1',
      allocatedAmountClp: 15000.5,
      reviewStatus: 'draft'
    })
  })

  it('maps duplicate active expense-service pairs to a conflict error', async () => {
    queryMock.mockRejectedValueOnce({ code: '23505' })

    await expect(createExpenseServiceAllocation({
      expenseId: 'exp-1',
      serviceId: 'svc-1',
      allocatedAmountClp: 1000,
      actorId: 'user-1'
    })).rejects.toBeInstanceOf(ExpenseServiceAllocationConflictError)
  })

  it('rejects invalid amount before touching the database', async () => {
    await expect(createExpenseServiceAllocation({
      expenseId: 'exp-1',
      serviceId: 'svc-1',
      allocatedAmountClp: 0,
      actorId: 'user-1'
    })).rejects.toBeInstanceOf(ExpenseServiceAllocationError)

    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('approves draft allocations atomically', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        ...baseRow,
        review_status: 'approved',
        approved_by: 'approver-1',
        approved_at: '2026-05-07T13:00:00.000Z'
      }]
    })

    const result = await approveExpenseServiceAllocation({
      allocationId: 'esa-123',
      actorId: 'approver-1'
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("review_status = 'approved'"), ['esa-123', 'approver-1'])
    expect(result.reviewStatus).toBe('approved')
    expect(result.approvedBy).toBe('approver-1')
  })

  it('rejects draft allocations with a review reason', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        ...baseRow,
        review_status: 'rejected',
        rejected_by: 'approver-1',
        rejected_at: '2026-05-07T13:00:00.000Z',
        rejection_reason: 'Wrong service anchor'
      }]
    })

    const result = await rejectExpenseServiceAllocation({
      allocationId: 'esa-123',
      actorId: 'approver-1',
      rejectionReason: 'Wrong service anchor'
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("review_status = 'rejected'"), [
      'esa-123',
      'approver-1',
      'Wrong service anchor'
    ])
    expect(result.reviewStatus).toBe('rejected')
    expect(result.rejectionReason).toBe('Wrong service anchor')
  })

  it('enforces meaningful rejection reasons', async () => {
    await expect(rejectExpenseServiceAllocation({
      allocationId: 'esa-123',
      actorId: 'approver-1',
      rejectionReason: 'too short'
    })).rejects.toThrow('rejectionReason must be at least 10 characters.')

    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('lists allocations for an expense', async () => {
    listQueryMock.mockResolvedValueOnce([baseRow])

    const result = await listExpenseServiceAllocationsForExpense(' exp-1 ')

    expect(listQueryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE expense_id = $1'), ['exp-1'])
    expect(result).toHaveLength(1)
    expect(result[0].allocationId).toBe('esa-123')
  })
})
