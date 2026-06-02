import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockListPayableIds = vi.fn()
const mockMarkPaid = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/contractor-engagements/payables/store', () => ({
  listPayableIdsByPaymentOrderForPaidCascade: (...args: unknown[]) => mockListPayableIds(...args),
  markPayablePaid: (...args: unknown[]) => mockMarkPaid(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

import { contractorPayablePaidCascadeProjection as projection } from './contractor-payable-paid-cascade'

describe('contractorPayablePaidCascadeProjection (TASK-981)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares the canonical trigger + finance domain + retries', () => {
    expect(projection.name).toBe('contractor_payable_paid_cascade')
    expect(projection.domain).toBe('finance')
    expect(projection.triggerEvents).toContain('finance.payment_order.paid')
    expect(projection.maxRetries).toBe(5)
  })

  it('extractScope reads orderId (or order_id) from the payload', () => {
    expect(projection.extractScope({ orderId: 'po-1' })).toEqual({
      entityType: 'payment_order',
      entityId: 'po-1'
    })
    expect(projection.extractScope({ order_id: 'po-2' })).toEqual({
      entityType: 'payment_order',
      entityId: 'po-2'
    })
    expect(projection.extractScope({})).toBeNull()
    expect(projection.extractScope({ orderId: 42 })).toBeNull()
  })

  it('no-op (clean skip) for an order with no contractor payables in payment_order_created', async () => {
    mockListPayableIds.mockResolvedValueOnce([])

    const res = await projection.refresh(
      { entityType: 'payment_order', entityId: 'po-other' },
      { orderId: 'po-other', paidAt: '2026-06-01T12:00:00Z' }
    )

    expect(res).toContain('no contractor payables')
    expect(mockMarkPaid).not.toHaveBeenCalled()
  })

  it('marks every linked payable paid, passing paidAt + paymentOrderId', async () => {
    mockListPayableIds.mockResolvedValueOnce(['cpay-1', 'cpay-2'])
    mockMarkPaid.mockResolvedValue({ status: 'paid' })

    const res = await projection.refresh(
      { entityType: 'payment_order', entityId: 'po-1' },
      { orderId: 'po-1', paidAt: '2026-06-01T12:00:00Z' }
    )

    expect(mockMarkPaid).toHaveBeenCalledTimes(2)
    expect(mockMarkPaid).toHaveBeenCalledWith(
      expect.objectContaining({
        contractorPayableId: 'cpay-1',
        paymentOrderId: 'po-1',
        paidAt: '2026-06-01T12:00:00Z',
        actorUserId: 'system:contractor-payable-paid-cascade'
      })
    )
    expect(mockMarkPaid).toHaveBeenCalledWith(
      expect.objectContaining({ contractorPayableId: 'cpay-2' })
    )
    expect(res).toContain('2 contractor payable(s) marked paid')
  })

  it('passes paidAt=null when the payload lacks it', async () => {
    mockListPayableIds.mockResolvedValueOnce(['cpay-1'])
    mockMarkPaid.mockResolvedValue({ status: 'paid' })

    await projection.refresh({ entityType: 'payment_order', entityId: 'po-1' }, { orderId: 'po-1' })

    expect(mockMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ paidAt: null }))
  })

  it('one failing payable does not block the others; captures + re-throws for retry', async () => {
    mockListPayableIds.mockResolvedValueOnce(['cpay-ok', 'cpay-bad'])
    mockMarkPaid
      .mockResolvedValueOnce({ status: 'paid' }) // cpay-ok
      .mockRejectedValueOnce(new Error('boom')) // cpay-bad

    await expect(
      projection.refresh(
        { entityType: 'payment_order', entityId: 'po-1' },
        { orderId: 'po-1', paidAt: '2026-06-01T12:00:00Z' }
      )
    ).rejects.toThrow(/1 payable\(s\) paid, 1 failed/)

    expect(mockMarkPaid).toHaveBeenCalledTimes(2) // attempted both
    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture.mock.calls[0][1]).toBe('finance')
  })
})
