/**
 * TASK-929 — Honest degradation guard for getFinanceLedgerHealth.
 *
 * Regression test for the false-healthy bug class (ISSUE-071 / Pillar 3):
 * before TASK-929 every check query was wrapped in `.catch(() => [])`, so a
 * transient error on a DECISION-CRITICAL query (e.g. settlement drift) silently
 * collapsed to "0 drift" and the probe reported `healthy=true` while the ledger
 * was actually drifting. Verified live 2026-05-24: a probe returned
 * healthy=true while the VIEW had 4 drift rows.
 *
 * Contract:
 *   1. Clean responses → healthy=true, degradedChecks=[].
 *   2. A decision-critical query rejecting → healthy=false + the check name in
 *      degradedChecks (we cannot claim healthy while blind to it).
 *   3. A sample/informational query rejecting → healthy stays true but the
 *      check name is still surfaced in degradedChecks for observability.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'

type RejectMatcher = (sql: string) => boolean

const setupResponses = (rejectIf?: RejectMatcher) => {
  mockRunQuery.mockReset()
  mockRunQuery.mockImplementation((sql: string) => {
    if (rejectIf && rejectIf(sql)) {
      return Promise.reject(new Error('connection blip'))
    }

    // Count-style queries return { total: '0' }; row/sample queries return [].
    if (
      sql.includes('total') &&
      (sql.includes('settlement_legs') ||
        sql.includes('payment_account_id IS NULL') ||
        sql.includes('promoted_payment_id') ||
        sql.includes('account_resolution_status') ||
        sql.includes('cohort_d') ||
        sql.includes('matched_settlement_leg_id') ||
        sql.includes('instrument_category_kpi_rules') ||
        sql.includes('evidence_asset_id'))
    ) {
      return Promise.resolve([{ total: '0' }])
    }

    return Promise.resolve([])
  })
}

beforeEach(() => {
  setupResponses()
})

describe('TASK-929 honest degradation', () => {
  it('clean responses → healthy=true with no degraded checks', async () => {
    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.healthy).toBe(true)
    expect(snapshot.degradedChecks).toEqual([])
  })

  it('decision-critical query failure forces healthy=false and is surfaced', async () => {
    setupResponses(sql => sql.includes('income_settlement_reconciliation'))

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.healthy).toBe(false)
    expect(snapshot.degradedChecks).toContain('settlement_drift')
    // It must NOT lie: settlement count defaults to 0 but healthy is false.
    expect(snapshot.settlementDrift.driftedIncomesCount).toBe(0)
  })

  it('sample query failure surfaces in degradedChecks but does NOT flip healthy', async () => {
    setupResponses(sql => sql.includes('d5_active_adoptions'))

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.degradedChecks).toContain('task708d_cohort_d_sample')
    expect(snapshot.healthy).toBe(true)
  })
})
