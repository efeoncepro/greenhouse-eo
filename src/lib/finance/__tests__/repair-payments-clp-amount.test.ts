import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const withTransactionMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (...args: unknown[]) => withTransactionMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { repairPaymentsClpAmount } from '@/lib/finance/repair-payments-clp-amount'

describe('repairPaymentsClpAmount (TASK-766 Slice 5)', () => {
  beforeEach(() => {
    queryMock.mockReset()
    withTransactionMock.mockReset()
  })

  it('rejects invalid kind', async () => {
    await expect(
      // @ts-expect-error — testing invalid kind
      repairPaymentsClpAmount({ kind: 'invalid_table' })
    ).rejects.toThrow(/kind debe ser/)
  })

  it('rejects invalid date format', async () => {
    await expect(
      repairPaymentsClpAmount({ kind: 'expense_payments', fromDate: '2026-4-1' })
    ).rejects.toThrow(/fromDate debe matchear YYYY-MM-DD/)
  })

  it('returns dryRun summary without executing UPDATEs', async () => {
    queryMock.mockResolvedValueOnce([
      {
        payment_id: 'exp-pay-1',
        payment_date: '2026-04-15',
        amount: '500',
        currency: 'USD',
        amount_clp: null,
        requires_fx_repair: true
      },
      {
        payment_id: 'exp-pay-2',
        payment_date: '2026-04-16',
        amount: '300',
        currency: 'USD',
        amount_clp: null,
        requires_fx_repair: true
      }
    ])

    const result = await repairPaymentsClpAmount({
      kind: 'expense_payments',
      dryRun: true
    })

    expect(result.dryRun).toBe(true)
    expect(result.candidatesScanned).toBe(2)
    expect(result.repaired).toBe(0)
    expect(result.skipped).toEqual([])
    expect(result.errors).toEqual([])
    // Solo el SELECT de candidatos, ningún UPDATE.
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('repairs CLP-trivial idempotent case (amount_clp already populated)', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          payment_id: 'exp-pay-clp-1',
          payment_date: '2026-04-20',
          amount: '1106321',
          currency: 'CLP',
          amount_clp: '1106321',
          requires_fx_repair: true
        }
      ])
      .mockResolvedValueOnce([]) // UPDATE flag-clear

    const result = await repairPaymentsClpAmount({ kind: 'expense_payments' })

    expect(result.candidatesScanned).toBe(1)
    expect(result.repaired).toBe(1)
    expect(result.skipped).toEqual([])
    expect(result.errors).toEqual([])
    // Idempotent path: solo limpia el flag, NO computa rate.
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('resolves historical rate and updates amount_clp atomically (USD payment)', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          payment_id: 'exp-pay-usd-1',
          payment_date: '2026-04-15',
          amount: '500',
          currency: 'USD',
          amount_clp: null,
          requires_fx_repair: true
        }
      ])
      .mockResolvedValueOnce([
        {
          rate: '910.55',
          rate_date: '2026-04-15'
        }
      ])

    withTransactionMock.mockImplementation(async (callback: (client: unknown) => Promise<void>) => {
      await callback({ query: vi.fn(async () => ({ rowCount: 1 })) })
    })

    const result = await repairPaymentsClpAmount({ kind: 'expense_payments' })

    expect(result.repaired).toBe(1)
    expect(result.skipped).toEqual([])
    expect(result.errors).toEqual([])
    expect(withTransactionMock).toHaveBeenCalledOnce()
  })

  it('skips payment when no historical rate found at or before payment_date', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          payment_id: 'exp-pay-old-usd',
          payment_date: '2010-01-01',
          amount: '100',
          currency: 'USD',
          amount_clp: null,
          requires_fx_repair: true
        }
      ])
      .mockResolvedValueOnce([]) // empty rate lookup

    const result = await repairPaymentsClpAmount({ kind: 'expense_payments' })

    expect(result.candidatesScanned).toBe(1)
    expect(result.repaired).toBe(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].paymentId).toBe('exp-pay-old-usd')
    expect(result.skipped[0].reason).toMatch(/no exchange_rates row/)
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('captures errors per-row and continues processing remaining candidates', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          payment_id: 'exp-pay-fails',
          payment_date: '2026-04-15',
          amount: '500',
          currency: 'USD',
          amount_clp: null,
          requires_fx_repair: true
        },
        {
          payment_id: 'exp-pay-succeeds',
          payment_date: '2026-04-16',
          amount: '300',
          currency: 'USD',
          amount_clp: null,
          requires_fx_repair: true
        }
      ])
      .mockResolvedValueOnce([{ rate: '910', rate_date: '2026-04-15' }])
      .mockResolvedValueOnce([{ rate: '912', rate_date: '2026-04-16' }])

    let txCallCount = 0

    withTransactionMock.mockImplementation(async (callback: (client: unknown) => Promise<void>) => {
      txCallCount += 1

      if (txCallCount === 1) {
        throw new Error('UPDATE constraint violation')
      }

      await callback({ query: vi.fn(async () => ({ rowCount: 1 })) })
    })

    const result = await repairPaymentsClpAmount({ kind: 'expense_payments' })

    expect(result.candidatesScanned).toBe(2)
    expect(result.repaired).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].paymentId).toBe('exp-pay-fails')
    expect(result.errors[0].message).toMatch(/UPDATE constraint violation/)
  })

  it('clamps batchSize to 1..500', async () => {
    queryMock.mockResolvedValueOnce([])

    await repairPaymentsClpAmount({ kind: 'income_payments', batchSize: 10000 })

    expect(queryMock).toHaveBeenCalledOnce()
    const limitParam = queryMock.mock.calls[0][1] as unknown[]

    expect(limitParam[limitParam.length - 1]).toBe(500)
  })

  it('always filters 3-axis supersede (defense canonical)', async () => {
    queryMock.mockResolvedValueOnce([])

    await repairPaymentsClpAmount({ kind: 'expense_payments' })

    const sql = queryMock.mock.calls[0][0] as string

    expect(sql).toContain('superseded_by_payment_id IS NULL')
    expect(sql).toContain('superseded_by_otb_id IS NULL')
    expect(sql).toContain('superseded_at IS NULL')
    expect(sql).toContain('requires_fx_repair = TRUE')
  })

  it('mirrors behavior for income_payments kind', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await repairPaymentsClpAmount({ kind: 'income_payments' })

    expect(result.kind).toBe('income_payments')
    const sql = queryMock.mock.calls[0][0] as string

    expect(sql).toContain('greenhouse_finance.income_payments')
  })
})
