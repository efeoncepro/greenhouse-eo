import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ tx: vi.fn(), clientQuery: vi.fn(), link: vi.fn() }))

vi.mock('@/lib/db', () => ({ withTransaction: m.tx }))
vi.mock('@/lib/contractor-engagements/payables/store', () => ({ markPayablePaymentOrderCreated: m.link }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
vi.mock('./source-instrument-policy', () => ({ resolvePaymentOrderSourcePolicy: async () => ({ snapshot: {} }) }))
import { createPaymentOrderFromObligations } from './create-from-obligations'

const obligation = {
  obligation_id: 'obl',
  amount: '1000',
  currency: 'CLP',
  source_kind: 'contractor_payable',
  source_ref: 'cpay',
  beneficiary_type: 'identity_profile',
  beneficiary_id: 'profile',
  obligation_kind: 'provider_payroll',
  status: 'generated'
}

const args = {
  obligationIds: ['obl'],
  title: 'fixture',
  createdBy: 'finance',
  paymentMethod: 'bank_transfer' as const,
  sourceAccountId: 'account',
  batchKind: 'manual' as const
}

describe('all contractor order entrypoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.tx.mockImplementation(fn => fn({ query: m.clientQuery }))
    m.clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM greenhouse_finance.payment_obligations')) return { rows: [obligation], rowCount: 1 }
      if (sql.includes('INSERT INTO greenhouse_finance.payment_orders'))
        return {
          rows: [{ order_id: params[0], state: 'pending_approval', created_at: '2026-10-05', updated_at: '2026-10-05' }]
        }

      return { rows: [], rowCount: 0 }
    })
  })
  it.each([0, 500])('rejects contractor partial amount %s before creating an order', async amount => {
    await expect(createPaymentOrderFromObligations({ ...args, partialAmounts: { obl: amount } })).rejects.toMatchObject(
      { code: 'contractor_partial_payment_unsupported' }
    )
    expect(
      m.clientQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO greenhouse_finance.payment_orders'))
    ).toBe(false)
    expect(m.link).not.toHaveBeenCalled()
  })
  it('binds the payable inside the same transaction for a manual/full order', async () => {
    const result = await createPaymentOrderFromObligations(args)

    expect(m.link).toHaveBeenCalledWith(
      { contractorPayableId: 'cpay', paymentOrderId: result.order.orderId, actorUserId: 'finance' },
      expect.objectContaining({ query: m.clientQuery })
    )
  })
  it('does not order the full amount again for a contractor already partially paid', async () => {
    m.clientQuery.mockResolvedValue({ rows: [{ ...obligation, status: 'partially_paid' }], rowCount: 1 })
    // No live line: the previous partial may have been archived/failed.
    m.clientQuery.mockImplementation(async (sql: string) => ({
      rows: sql.includes('FROM greenhouse_finance.payment_obligations')
        ? [{ ...obligation, status: 'partially_paid' }]
        : [],
      rowCount: sql.includes('FROM greenhouse_finance.payment_obligations') ? 1 : 0
    }))
    await expect(createPaymentOrderFromObligations(args)).rejects.toMatchObject({
      code: 'contractor_partial_payment_unsupported'
    })
    expect(m.link).not.toHaveBeenCalled()
  })
  it.each(['payroll', 'manual', 'vendor_invoice'])(
    'preserves generic partial payment creation for %s obligations',
    async sourceKind => {
      const normalQuery = m.clientQuery.getMockImplementation()!

      m.clientQuery.mockImplementation(async (sql: string, params: unknown[]) =>
        sql.includes('FROM greenhouse_finance.payment_obligations')
          ? { rows: [{ ...obligation, source_kind: sourceKind }], rowCount: 1 }
          : normalQuery(sql, params)
      )
      await createPaymentOrderFromObligations({ ...args, partialAmounts: { obl: 500 } })

      const line = m.clientQuery.mock.calls.find(([sql]) =>
        sql.includes('INSERT INTO greenhouse_finance.payment_order_lines')
      )

      expect(line).toBeDefined()
      expect(line![1][7]).toBe(500)
      expect(line![1][9]).toBe(true)
      expect(m.link).not.toHaveBeenCalled()
    }
  )
})
