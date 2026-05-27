/**
 * TASK-929 Slice 3 — finance.ledger.unresolved_drift_items signal tests.
 *
 * Tiered severity contract:
 *   - settlement=0, unanchored=0 → ok
 *   - settlement>0              → error (balance integrity)
 *   - only unanchored>0         → warning (data completeness)
 *   - query throws              → unknown (honest degradation)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/db', () => ({
  query: (sql: string, params?: unknown[]) => mockQuery(sql, params)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getLedgerUnresolvedDriftItemsSignal,
  LEDGER_UNRESOLVED_DRIFT_ITEMS_SIGNAL_ID
} from './ledger-unresolved-drift-items'

beforeEach(() => {
  mockQuery.mockReset()
})

describe('finance.ledger.unresolved_drift_items', () => {
  it('ok when settlement=0 and unanchored=0', async () => {
    mockQuery.mockResolvedValue([{ settlement_drift: 0, unanchored_expenses: 0 }])

    const signal = await getLedgerUnresolvedDriftItemsSignal()

    expect(signal.signalId).toBe(LEDGER_UNRESOLVED_DRIFT_ITEMS_SIGNAL_ID)
    expect(signal.moduleKey).toBe('finance')
    expect(signal.severity).toBe('ok')
  })

  it('error when settlement drift > 0 (balance integrity)', async () => {
    mockQuery.mockResolvedValue([{ settlement_drift: 2, unanchored_expenses: 5 }])

    const signal = await getLedgerUnresolvedDriftItemsSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('settlement=2')
  })

  it('warning when only unanchored > 0 (data completeness)', async () => {
    mockQuery.mockResolvedValue([{ settlement_drift: 0, unanchored_expenses: 37 }])

    const signal = await getLedgerUnresolvedDriftItemsSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('gastos sin anchor=37')
  })

  it('unknown when the query throws (honest degradation)', async () => {
    mockQuery.mockRejectedValue(new Error('connection blip'))

    const signal = await getLedgerUnresolvedDriftItemsSignal()

    expect(signal.severity).toBe('unknown')
  })
})
