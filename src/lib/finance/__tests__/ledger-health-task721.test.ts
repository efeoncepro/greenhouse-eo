/**
 * TASK-721 — Reconciliation evidence broken-link detector test.
 *
 * Asserts that getFinanceLedgerHealth correctly:
 *   1. Reports task721.reconciliationSnapshotsWithBrokenEvidence = 0 in steady state
 *   2. Surfaces sample of snapshots with broken evidence link
 *   3. healthy = false when count > 0
 *   4. SQL filters by evidence_asset_id NOT NULL and excludes deleted assets
 *   5. Handles SQL failure gracefully
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'

const SAMPLE_BROKEN_SNAPSHOT = {
  snapshot_id: 'recon-santander-clp-20260428-abc12345',
  account_id: 'santander-clp',
  snapshot_at: '2026-04-28T19:57:00Z',
  evidence_asset_id: 'asset-deadbeef-0000-0000-0000-000000000000',
  asset_status: null
}

const setupCleanResponses = (overrides: Partial<{
  task721Count: number
  task721Sample: typeof SAMPLE_BROKEN_SNAPSHOT[]
}> = {}) => {
  mockRunQuery.mockReset()
  mockRunQuery.mockImplementation((sql: string) => {
    if (sql.includes('income_settlement_reconciliation')) return Promise.resolve([])
    if (sql.includes("payment_source = 'nubox_bank_sync'")) return Promise.resolve([])
    if (sql.includes("payment_source IN ('nubox_sync', 'manual')")) return Promise.resolve([])
    if (sql.includes('FRESHNESS') || (sql.includes('account_balances ab') && !sql.includes('instrument_category_kpi_rules') && !sql.includes('account_reconciliation_snapshots'))) return Promise.resolve([])
    if (sql.includes('FROM greenhouse_finance.expenses e')) return Promise.resolve([])

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

    if (sql.includes('imbalanced')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes("HAVING SUM(CASE WHEN direction = 'outgoing'")) {
      return Promise.resolve([])
    }

    if (sql.includes('cohort_d')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes('d5_active_adoptions')) return Promise.resolve([])

    if (sql.includes('instrument_category_kpi_rules')) {
      if (sql.includes('SELECT COUNT(*)')) {
        return Promise.resolve([{ total: '0' }])
      }

      return Promise.resolve([])
    }

    // TASK-721 — broken evidence
    if (sql.includes('evidence_asset_id') && sql.includes('account_reconciliation_snapshots')) {
      if (sql.includes('SELECT COUNT(*)')) {
        return Promise.resolve([{ total: String(overrides.task721Count ?? 0) }])
      }

      return Promise.resolve(overrides.task721Sample ?? [])
    }

    return Promise.resolve([])
  })
}

beforeEach(() => {
  setupCleanResponses()
})

describe('TASK-721 reconciliation evidence broken-link detector', () => {
  it('reports zero broken evidence in steady state', async () => {
    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task721.reconciliationSnapshotsWithBrokenEvidence).toBe(0)
    expect(snapshot.task721.sampleBrokenSnapshots).toEqual([])
    expect(snapshot.healthy).toBe(true)
  })

  it('flags non-zero broken evidence as unhealthy', async () => {
    setupCleanResponses({
      task721Count: 1,
      task721Sample: [SAMPLE_BROKEN_SNAPSHOT]
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task721.reconciliationSnapshotsWithBrokenEvidence).toBe(1)
    expect(snapshot.task721.sampleBrokenSnapshots).toEqual([
      {
        snapshotId: 'recon-santander-clp-20260428-abc12345',
        accountId: 'santander-clp',
        snapshotAt: '2026-04-28T19:57:00Z',
        evidenceAssetId: 'asset-deadbeef-0000-0000-0000-000000000000',
        assetStatus: null
      }
    ])
    expect(snapshot.healthy).toBe(false)
  })

  it('SQL filters by evidence_asset_id NOT NULL and excludes deleted assets', async () => {
    await getFinanceLedgerHealth()

    const sqlCalls = mockRunQuery.mock.calls
      .map(([sql]) => sql)
      .filter(sql => sql.includes('account_reconciliation_snapshots') && sql.includes('evidence_asset_id'))

    expect(sqlCalls.length).toBeGreaterThanOrEqual(2)

    const allSql = sqlCalls.join('\n')

    expect(allSql).toContain('evidence_asset_id IS NOT NULL')
    expect(allSql).toContain("status <> 'deleted'")
    expect(allSql).toContain('greenhouse_core.assets')
  })

  it('handles SQL failure gracefully (returns 0 + empty sample)', async () => {
    mockRunQuery.mockReset()
    mockRunQuery.mockImplementation((sql: string) => {
      if (sql.includes('evidence_asset_id') && sql.includes('account_reconciliation_snapshots')) {
        return Promise.reject(new Error('column does not exist'))
      }

      if (sql.includes('total')) return Promise.resolve([{ total: '0' }])

      return Promise.resolve([])
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task721.reconciliationSnapshotsWithBrokenEvidence).toBe(0)
    expect(snapshot.task721.sampleBrokenSnapshots).toEqual([])
  })
})
