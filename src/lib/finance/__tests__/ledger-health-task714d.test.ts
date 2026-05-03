/**
 * TASK-714d — Internal transfer pair invariant detector test.
 *
 * Asserts that getFinanceLedgerHealth correctly:
 *   1. Reports task714d.internalTransferGroupsWithMissingPair = 0 in steady state.
 *   2. Surfaces sample of imbalanced groups (group_id, out_count, in_count, instruments).
 *   3. healthy = false when count > 0 (imbalance is structural drift).
 *   4. SQL excludes superseded/by_otb_id legs from the count.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'

const SAMPLE_IMBALANCED_GROUP = {
  settlement_group_id: 'stlgrp-itx-20260306-iecc',
  out_count: 1,
  in_count: 0,
  instruments: ['santander-clp']
}

const setupCleanResponses = (overrides: Partial<{
  task714dCount: number
  task714dSample: typeof SAMPLE_IMBALANCED_GROUP[]
}> = {}) => {
  mockRunQuery.mockReset()
  mockRunQuery.mockImplementation((sql: string) => {
    // settlement_drift / phantoms / freshness / unanchored — empty
    if (sql.includes('income_settlement_reconciliation')) return Promise.resolve([])
    if (sql.includes("payment_source = 'nubox_bank_sync'")) return Promise.resolve([])
    if (sql.includes("payment_source IN ('nubox_sync', 'manual')")) return Promise.resolve([])
    if (sql.includes('FRESHNESS') || sql.includes('account_balances ab')) return Promise.resolve([])
    if (sql.includes('FROM greenhouse_finance.expenses e')) return Promise.resolve([])

    // task708 metrics — all 0
    if (sql.includes("created_at >= TIMESTAMPTZ") && sql.includes('payment_account_id IS NULL')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes('settlement_legs') && sql.includes("leg_type IN ('receipt', 'payout')")) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes('matched_settlement_leg_id') && sql.includes('reconciliation_periods rp')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes("account_resolution_status = 'unresolved'")) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes('promoted_payment_id IS NOT NULL')) {
      return Promise.resolve([{ total: '0' }])
    }

    // task714d — internal transfer pair imbalance
    if (sql.includes('imbalanced')) {
      return Promise.resolve([{ total: String(overrides.task714dCount ?? 0) }])
    }

    if (sql.includes("HAVING SUM(CASE WHEN direction = 'outgoing'") || (sql.includes("LIMIT 20") && sql.includes("SUM(CASE WHEN direction = 'outgoing'"))) {
      return Promise.resolve(overrides.task714dSample ?? [])
    }

    // cohort D — empty
    if (sql.includes('cohort_d')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes('d5_active_adoptions')) return Promise.resolve([])

    return Promise.resolve([])
  })
}

beforeEach(() => {
  setupCleanResponses()
})

describe('TASK-714d internal_transfer pair invariant detector', () => {
  it('reports zero imbalanced groups in steady state and healthy=true', async () => {
    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task714d.internalTransferGroupsWithMissingPair).toBe(0)
    expect(snapshot.task714d.sampleImbalancedGroups).toEqual([])
    expect(snapshot.healthy).toBe(true)
  })

  it('flags non-zero imbalance as unhealthy and surfaces sample', async () => {
    setupCleanResponses({
      task714dCount: 1,
      task714dSample: [SAMPLE_IMBALANCED_GROUP]
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task714d.internalTransferGroupsWithMissingPair).toBe(1)
    expect(snapshot.task714d.sampleImbalancedGroups).toEqual([
      {
        settlementGroupId: 'stlgrp-itx-20260306-iecc',
        outCount: 1,
        inCount: 0,
        instruments: ['santander-clp']
      }
    ])
    expect(snapshot.healthy).toBe(false)
  })

  it('SQL filters out superseded legs from imbalance count', async () => {
    await getFinanceLedgerHealth()

    const sqlCalls = mockRunQuery.mock.calls
      .map(([sql]) => sql)
      .filter(sql => sql.includes('internal_transfer') && (sql.includes('imbalanced') || sql.includes("SUM(CASE WHEN direction")))

    expect(sqlCalls.length).toBeGreaterThanOrEqual(2)

    const allSql = sqlCalls.join('\n')

    // Must exclude both supersede axes
    expect(allSql).toContain('superseded_at IS NULL')
    expect(allSql).toContain('superseded_by_otb_id IS NULL')

    // Must filter only internal_transfer
    expect(allSql).toContain("leg_type = 'internal_transfer'")

    // Must compare out vs in counts
    expect(allSql).toContain("direction = 'outgoing'")
    expect(allSql).toContain("direction = 'incoming'")
  })

  it('handles SQL failure gracefully (returns 0 + empty sample)', async () => {
    mockRunQuery.mockReset()
    mockRunQuery.mockImplementation((sql: string) => {
      if (sql.includes('imbalanced') || (sql.includes("HAVING SUM") && sql.includes("internal_transfer"))) {
        return Promise.reject(new Error('schema not migrated'))
      }

      if (sql.includes('total')) return Promise.resolve([{ total: '0' }])

      return Promise.resolve([])
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task714d.internalTransferGroupsWithMissingPair).toBe(0)
    expect(snapshot.task714d.sampleImbalancedGroups).toEqual([])
  })
})
