/**
 * TASK-979 Slice 1 — tests del orquestador prepareMonthlyContractorPaymentRun.
 *
 * Cubre: dry-run (preview sin mutar), corrida real multi-moneda (una orden por
 * moneda + transición de cada payable a payment_order_created), barrido vacío
 * (idempotente alreadyPrepared), y failure (failContractorPaymentRun + rethrow).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const txMock = vi.fn()
const createOrderMock = vi.fn()
const markPocMock = vi.fn()
const beginMock = vi.fn()
const completeMock = vi.fn()
const failMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withGreenhousePostgresTransaction: (cb: (client: unknown) => unknown) => txMock(cb)
}))

vi.mock('@/lib/finance/payment-orders/create-from-obligations', () => ({
  createPaymentOrderFromObligations: (...args: unknown[]) => createOrderMock(...args)
}))

vi.mock('./store', () => ({
  markPayablePaymentOrderCreated: (...args: unknown[]) => markPocMock(...args)
}))

vi.mock('./payment-run-store', () => ({
  beginContractorPaymentRun: (...args: unknown[]) => beginMock(...args),
  completeContractorPaymentRun: (...args: unknown[]) => completeMock(...args),
  failContractorPaymentRun: (...args: unknown[]) => failMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import { prepareMonthlyContractorPaymentRun } from './monthly-run'

const CAL = { calendarOptions: { timezone: 'America/Santiago' as const } }

beforeEach(() => {
  queryMock.mockReset()
  txMock.mockReset()
  createOrderMock.mockReset()
  markPocMock.mockReset()
  beginMock.mockReset()
  completeMock.mockReset()
  failMock.mockReset()
  captureMock.mockReset()
  // Default: la tx invoca el callback con un client fake.
  txMock.mockImplementation((cb: (client: unknown) => unknown) => cb({ fake: 'client' }))
  markPocMock.mockResolvedValue(undefined)
  beginMock.mockResolvedValue('run-1')
  completeMock.mockResolvedValue(undefined)
  failMock.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('prepareMonthlyContractorPaymentRun', () => {
  it('dry-run: agrupa por moneda y NO muta (sin run row, sin órdenes)', async () => {
    queryMock.mockResolvedValueOnce([
      { obligation_id: 'o1', contractor_payable_id: 'p1', currency: 'CLP', amount: '100.00', due_date: '2026-05-10' },
      { obligation_id: 'o2', contractor_payable_id: 'p2', currency: 'CLP', amount: '200.00', due_date: '2026-05-11' },
      { obligation_id: 'o3', contractor_payable_id: 'p3', currency: 'USD', amount: '50.00', due_date: null }
    ])

    const result = await prepareMonthlyContractorPaymentRun({
      periodYear: 2026,
      periodMonth: 5,
      triggeredByUserId: 'user-1',
      dryRun: true,
      ...CAL
    })

    expect(result.dryRun).toBe(true)
    expect(result.paymentRunId).toBeNull()
    expect(result.preparedOrderIds).toEqual([])
    expect(result.obligationsSwept).toBe(3)
    expect(result.payablesIncluded).toBe(3)
    expect(result.alreadyPrepared).toBe(false)
    expect(result.groups).toHaveLength(2)
    expect(result.totalsByCurrency.CLP).toEqual({ payables: 2, netTotal: '300.00' })
    expect(result.totalsByCurrency.USD).toEqual({ payables: 1, netTotal: '50.00' })
    expect(beginMock).not.toHaveBeenCalled()
    expect(txMock).not.toHaveBeenCalled()
    expect(createOrderMock).not.toHaveBeenCalled()
  })

  it('corrida real: una orden por moneda + transición de cada payable', async () => {
    queryMock.mockResolvedValueOnce([
      { obligation_id: 'o1', contractor_payable_id: 'p1', currency: 'CLP', amount: '100.00', due_date: '2026-05-10' },
      { obligation_id: 'o2', contractor_payable_id: 'p2', currency: 'CLP', amount: '200.00', due_date: '2026-05-11' },
      { obligation_id: 'o3', contractor_payable_id: 'p3', currency: 'USD', amount: '50.00', due_date: '2026-05-12' }
    ])
    createOrderMock
      .mockResolvedValueOnce({ order: { orderId: 'po-CLP' }, eventId: 'e1' })
      .mockResolvedValueOnce({ order: { orderId: 'po-USD' }, eventId: 'e2' })

    const result = await prepareMonthlyContractorPaymentRun({
      periodYear: 2026,
      periodMonth: 5,
      triggeredByUserId: 'user-1',
      ...CAL
    })

    expect(beginMock).toHaveBeenCalledTimes(1)
    expect(createOrderMock).toHaveBeenCalledTimes(2)
    expect(markPocMock).toHaveBeenCalledTimes(3)
    // payables del grupo CLP → po-CLP
    expect(markPocMock).toHaveBeenCalledWith(
      expect.objectContaining({ contractorPayableId: 'p1', paymentOrderId: 'po-CLP', actorUserId: 'user-1' }),
      expect.anything()
    )
    expect(markPocMock).toHaveBeenCalledWith(
      expect.objectContaining({ contractorPayableId: 'p3', paymentOrderId: 'po-USD' }),
      expect.anything()
    )
    expect(result.preparedOrderIds).toEqual(['po-CLP', 'po-USD'])
    expect(result.alreadyPrepared).toBe(false)
    expect(completeMock).toHaveBeenCalledWith(
      expect.objectContaining({ paymentRunId: 'run-1', preparedOrderIds: ['po-CLP', 'po-USD'], payablesIncluded: 3, obligationsSwept: 3 })
    )
    expect(failMock).not.toHaveBeenCalled()
    // single-currency invariant: cada orden recibe solo obligaciones de una moneda
    expect(createOrderMock.mock.calls[0][0].obligationIds).toEqual(['o1', 'o2'])
    expect(createOrderMock.mock.calls[1][0].obligationIds).toEqual(['o3'])
    expect(createOrderMock.mock.calls[0][0].batchKind).toBe('supplier')
    expect(createOrderMock.mock.calls[0][0].requireApproval).toBe(true)
  })

  it('barrido vacío: idempotente (alreadyPrepared, 0 órdenes, run completado en 0)', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await prepareMonthlyContractorPaymentRun({
      periodYear: 2026,
      periodMonth: 5,
      triggeredByUserId: 'user-1',
      ...CAL
    })

    expect(result.alreadyPrepared).toBe(true)
    expect(result.preparedOrderIds).toEqual([])
    expect(createOrderMock).not.toHaveBeenCalled()
    expect(completeMock).toHaveBeenCalledWith(
      expect.objectContaining({ paymentRunId: 'run-1', preparedOrderIds: [], obligationsSwept: 0 })
    )
  })

  it('failure: marca la corrida failed + re-lanza (sin complete)', async () => {
    queryMock.mockResolvedValueOnce([
      { obligation_id: 'o1', contractor_payable_id: 'p1', currency: 'CLP', amount: '100.00', due_date: '2026-05-10' }
    ])
    createOrderMock.mockRejectedValueOnce(new Error('obligation_already_locked'))

    await expect(
      prepareMonthlyContractorPaymentRun({
        periodYear: 2026,
        periodMonth: 5,
        triggeredByUserId: 'user-1',
        ...CAL
      })
    ).rejects.toThrow('obligation_already_locked')

    expect(failMock).toHaveBeenCalledWith(
      expect.objectContaining({ paymentRunId: 'run-1', errorMessage: 'obligation_already_locked' })
    )
    expect(completeMock).not.toHaveBeenCalled()
    expect(captureMock).toHaveBeenCalled()
  })
})
