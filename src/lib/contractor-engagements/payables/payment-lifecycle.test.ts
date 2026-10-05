import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ query: vi.fn(), tx: vi.fn(), clientQuery: vi.fn() }))

vi.mock('@/lib/db', () => ({ query: m.query, withGreenhousePostgresTransaction: m.tx }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
import { markPayablePaymentOrderCreated, markPayablePaid } from './store'

const row = {
  contractor_payable_id: 'pay-own',
  contractor_engagement_id: 'eng-own',
  payment_order_id: 'old-order',
  finance_obligation_id: 'obligation-own',
  status: 'payment_order_created',
  gross_amount: 1000,
  withholding_amount: 0,
  net_payable: 1000,
  currency: 'USD',
  created_at: '2026-10-05',
  updated_at: '2026-10-05'
}

let current: typeof row
let orderState: string
let wasSettled: boolean
let matching: boolean
let fullyPaid: boolean
let writes: number

describe('contractor payment lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    current = { ...row }
    orderState = 'cancelled'
    wasSettled = false
    matching = true
    fullyPaid = true
    writes = 0
    m.tx.mockImplementation(fn => fn({ query: m.clientQuery }))
    m.clientQuery.mockImplementation(async (sql: string, args: unknown[]) => {
      if (sql.includes('FOR UPDATE') && sql.includes('contractor_payables')) return { rows: [current] }
      if (sql.includes('SELECT o.state')) return { rows: [{ state: orderState, settled: wasSettled }] }
      if (sql.includes('AS valid')) return { rows: [{ valid: matching }] }
      if (sql.includes('AS paid')) return { rows: [{ paid: fullyPaid }] }

      if (sql.includes('UPDATE greenhouse_hr.contractor_payables')) {
        writes++
        current = {
          ...current,
          ...(sql.includes("SET status = 'paid'") ? { status: 'paid' } : { payment_order_id: args[1] as string })
        }

        return { rows: [current] }
      }

      return { rows: [] }
    })
  })
  it('binds a replacement after a cancelled unpaid order and replays without another event/write', async () => {
    const args = { contractorPayableId: 'pay-own', paymentOrderId: 'new-order', actorUserId: 'finance' }

    await markPayablePaymentOrderCreated(args)
    await markPayablePaymentOrderCreated(args)
    expect(current.payment_order_id).toBe('new-order')
    expect(writes).toBe(1)
  })
  it.each(['approved', 'submitted', 'paid'])('does not replace a %s order', async state => {
    orderState = state
    await expect(
      markPayablePaymentOrderCreated({
        contractorPayableId: 'pay-own',
        paymentOrderId: 'new-order',
        actorUserId: 'finance'
      })
    ).rejects.toMatchObject({ code: 'payable_order_still_live' })
    expect(writes).toBe(0)
  })
  it('does not replace a cancelled order containing a settled line or bind an unrelated obligation', async () => {
    wasSettled = true
    const args = { contractorPayableId: 'pay-own', paymentOrderId: 'new-order', actorUserId: 'finance' }

    await expect(markPayablePaymentOrderCreated(args)).rejects.toMatchObject({ code: 'payable_order_still_live' })
    wasSettled = false
    matching = false
    await expect(markPayablePaymentOrderCreated(args)).rejects.toMatchObject({ code: 'payable_order_mismatch' })
    expect(writes).toBe(0)
  })
  it('refuses partial/unconfirmed settlement and a foreign order', async () => {
    fullyPaid = false
    await expect(
      markPayablePaid({ contractorPayableId: 'pay-own', paymentOrderId: 'old-order', actorUserId: 'cascade' })
    ).rejects.toMatchObject({ code: 'payable_not_fully_settled' })
    await expect(
      markPayablePaid({ contractorPayableId: 'pay-own', paymentOrderId: 'foreign-order', actorUserId: 'cascade' })
    ).rejects.toMatchObject({ code: 'payable_order_mismatch' })
    expect(writes).toBe(0)
  })
  it('marks fully settled paid once', async () => {
    const args = { contractorPayableId: 'pay-own', paymentOrderId: 'old-order', actorUserId: 'cascade' }

    await markPayablePaid(args)
    await markPayablePaid(args)
    expect(current.status).toBe('paid')
    expect(writes).toBe(1)
  })
  it('replays the binding after another cascade has already completed the same payment', async () => {
    const args = { contractorPayableId: 'pay-own', paymentOrderId: 'old-order', actorUserId: 'cascade' }

    // Both consumers may have read the candidate before either acquires its lock.
    await markPayablePaid(args)
    const replay = await markPayablePaymentOrderCreated(args)

    await markPayablePaid(args)
    expect(replay.status).toBe('paid')
    expect(replay.paymentOrderId).toBe('old-order')
    expect(writes).toBe(1)
  })
  it('does not rebind an already paid payable to a different order', async () => {
    current = { ...row, status: 'paid' }
    await expect(
      markPayablePaymentOrderCreated({
        contractorPayableId: 'pay-own',
        paymentOrderId: 'new-order',
        actorUserId: 'cascade'
      })
    ).rejects.toMatchObject({ code: 'payable_not_obligation_created' })
    expect(writes).toBe(0)
  })
})
