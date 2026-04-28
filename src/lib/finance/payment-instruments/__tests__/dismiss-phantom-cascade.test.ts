/**
 * Tests for dismiss-phantom cascade-supersede of linked settlement_legs.
 *
 * Structural invariant: when an income/expense phantom payment is dismissed,
 * the materializer (which prefers settlement_legs over fallback payments) must
 * stop counting the orphan legs. This is enforced via cascade UPDATE inside
 * the same transaction.
 *
 * Idempotency: re-calling for an already-dismissed payment that still has
 * orphan legs MUST cascade them (backfill scenario from TASK-708b residue).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type FakeClient = { query: ReturnType<typeof vi.fn> }
const mockClientQuery = vi.fn()
const mockWithTransaction = vi.fn<(fn: (client: FakeClient) => Promise<unknown>) => Promise<unknown>>(
  async fn => fn({ query: mockClientQuery })
)
interface OutboxEventInput {
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
}
const mockPublishOutboxEvent = vi.fn<(event: OutboxEventInput, client?: unknown) => Promise<void>>(
  async () => undefined
)

vi.mock('@/lib/db', () => ({
  withTransaction: (fn: (client: unknown) => Promise<unknown>) => mockWithTransaction(fn)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (event: OutboxEventInput, client?: unknown) =>
    mockPublishOutboxEvent(event, client)
}))

import {
  dismissExpensePhantom,
  dismissIncomePhantom
} from '@/lib/finance/payment-instruments/dismiss-phantom'

const FRESH_INCOME_ROW = {
  payment_id: 'PAY-NUBOX-inc-3968936',
  income_id: 'INC-NB-26004360',
  amount: '752730.00',
  superseded_at: null,
  superseded_by_payment_id: null
}

const ALREADY_DISMISSED_INCOME_ROW = {
  ...FRESH_INCOME_ROW,
  superseded_at: new Date('2026-04-28T17:00:00Z')
}

const FRESH_EXPENSE_ROW = {
  payment_id: 'exp-pay-test-001',
  expense_id: 'EXP-NB-test',
  amount: '500000.00',
  superseded_at: null
}

const REASON = 'TASK-708b residual — phantom sin evidencia de cash en cartola'

beforeEach(() => {
  mockClientQuery.mockReset()
  mockWithTransaction.mockClear()
  mockPublishOutboxEvent.mockReset()
})

describe('dismissIncomePhantom cascade', () => {
  it('cascades supersede to linked settlement_legs in the same transaction', async () => {
    mockClientQuery
      // SELECT phantom row FOR UPDATE
      .mockResolvedValueOnce({ rows: [FRESH_INCOME_ROW] })
      // UPDATE income_payments SET superseded_at
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      // UPDATE settlement_legs cascade
      .mockResolvedValueOnce({
        rows: [{ settlement_leg_id: 'stlleg-PAY-NUBOX-inc-3968936' }],
        rowCount: 1
      })
      // SELECT fn_recompute_income_amount_paid
      .mockResolvedValueOnce({ rows: [{ result: 0 }] })

    const result = await dismissIncomePhantom({
      phantomPaymentId: FRESH_INCOME_ROW.payment_id,
      reason: REASON
    })

    expect(result).toEqual({
      incomeId: FRESH_INCOME_ROW.income_id,
      alreadyDismissed: false,
      recomputed: 0
    })

    const cascadeQueryCall = mockClientQuery.mock.calls.find(call =>
      typeof call[0] === 'string' && call[0].includes('UPDATE greenhouse_finance.settlement_legs')
    )

    expect(cascadeQueryCall).toBeDefined()
    expect(cascadeQueryCall?.[0]).toContain("linked_payment_type = 'income_payment'")
    expect(cascadeQueryCall?.[0]).toContain('superseded_at IS NULL')
    expect(cascadeQueryCall?.[1]).toEqual([REASON, FRESH_INCOME_ROW.payment_id])

    expect(mockPublishOutboxEvent).toHaveBeenCalledTimes(1)
    const outboxCall = mockPublishOutboxEvent.mock.calls[0][0]

    expect(outboxCall.payload.cascadedSettlementLegIds).toEqual([
      'stlleg-PAY-NUBOX-inc-3968936'
    ])
  })

  it('backfills cascade when payment already dismissed but legs remain active', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [ALREADY_DISMISSED_INCOME_ROW] })
      // No UPDATE income_payments call expected (already dismissed)
      // UPDATE settlement_legs cascade — finds 1 orphan
      .mockResolvedValueOnce({
        rows: [{ settlement_leg_id: 'stlleg-orphan-leg' }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [{ result: 0 }] })

    const result = await dismissIncomePhantom({
      phantomPaymentId: ALREADY_DISMISSED_INCOME_ROW.payment_id,
      reason: REASON
    })

    expect(result.alreadyDismissed).toBe(false)

    const incomeUpdateCall = mockClientQuery.mock.calls.find(call =>
      typeof call[0] === 'string'
        && call[0].includes('UPDATE greenhouse_finance.income_payments')
    )

    expect(incomeUpdateCall).toBeUndefined()

    const cascadeCall = mockClientQuery.mock.calls.find(call =>
      typeof call[0] === 'string'
        && call[0].includes('UPDATE greenhouse_finance.settlement_legs')
    )

    expect(cascadeCall).toBeDefined()
  })

  it('is a true no-op when payment dismissed and no orphan legs', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [ALREADY_DISMISSED_INCOME_ROW] })
      // cascade UPDATE finds zero orphans
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const result = await dismissIncomePhantom({
      phantomPaymentId: ALREADY_DISMISSED_INCOME_ROW.payment_id,
      reason: REASON
    })

    expect(result).toEqual({
      incomeId: ALREADY_DISMISSED_INCOME_ROW.income_id,
      alreadyDismissed: true,
      recomputed: -1
    })

    expect(mockPublishOutboxEvent).not.toHaveBeenCalled()
  })
})

describe('dismissExpensePhantom cascade', () => {
  it('cascades supersede to linked settlement_legs', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [FRESH_EXPENSE_ROW] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ settlement_leg_id: 'stlleg-exp-001' }],
        rowCount: 1
      })

    const result = await dismissExpensePhantom({
      phantomPaymentId: FRESH_EXPENSE_ROW.payment_id,
      reason: REASON
    })

    expect(result.alreadyDismissed).toBe(false)

    const cascadeCall = mockClientQuery.mock.calls.find(call =>
      typeof call[0] === 'string'
        && call[0].includes('UPDATE greenhouse_finance.settlement_legs')
    )

    expect(cascadeCall?.[0]).toContain("linked_payment_type = 'expense_payment'")

    const outboxCall = mockPublishOutboxEvent.mock.calls[0][0]

    expect(outboxCall.payload.cascadedSettlementLegIds).toEqual(['stlleg-exp-001'])
  })
})
