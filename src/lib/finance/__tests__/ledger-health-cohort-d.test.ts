/**
 * TASK-708d — Cohort D detector test.
 *
 * Asserts that getFinanceLedgerHealth correctly:
 *   1. Reports postCutoverPhantomsWithoutBankEvidence count + sample.
 *   2. Marks `healthy=false` when cohort D > 0.
 *   3. Marks `healthy=true` when cohort D = 0 and other dimensions clean.
 *   4. Maps the SQL row shape into the canonical sample type.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'

const COHORT_D_SAMPLE_ROW = {
  payment_kind: 'income' as const,
  payment_id: 'PAY-NUBOX-inc-3968936',
  document_id: 'INC-NB-26004360',
  account_id: 'santander-clp',
  payment_date: '2026-04-13',
  amount: '752730.00',
  signal_id: 'signal-cohort-d-001'
}

const setupCleanResponses = (overrides: Partial<{
  cohortDCount: number
  cohortDSample: typeof COHORT_D_SAMPLE_ROW[]
}> = {}) => {
  mockRunQuery.mockReset()
  // The order of Promise.all in getFinanceLedgerHealth is fixed; we drive
  // it by inspecting SQL substrings rather than position to stay resilient.
  mockRunQuery.mockImplementation((sql: string) => {
    if (sql.includes('income_settlement_reconciliation')) return Promise.resolve([])
    if (sql.includes("payment_source = 'nubox_bank_sync'")) return Promise.resolve([])
    if (sql.includes("payment_source IN ('nubox_sync', 'manual')")) return Promise.resolve([])
    if (sql.includes('FRESHNESS') || sql.includes('account_balances ab')) return Promise.resolve([])
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

    if (sql.includes('cohort_d')) {
      return Promise.resolve([{ total: String(overrides.cohortDCount ?? 0) }])
    }

    if (sql.includes('d5_active_adoptions')) {
      return Promise.resolve(overrides.cohortDSample ?? [])
    }

    return Promise.resolve([])
  })
}

beforeEach(() => {
  setupCleanResponses()
})

describe('TASK-708d Cohort D detector', () => {
  it('reports zero phantoms in steady state and healthy=true', async () => {
    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task708d.postCutoverPhantomsWithoutBankEvidence).toBe(0)
    expect(snapshot.task708d.samplePhantoms).toEqual([])
    expect(snapshot.healthy).toBe(true)
  })

  it('flags non-zero cohort D as unhealthy and surfaces sample', async () => {
    setupCleanResponses({
      cohortDCount: 1,
      cohortDSample: [COHORT_D_SAMPLE_ROW]
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task708d.postCutoverPhantomsWithoutBankEvidence).toBe(1)
    expect(snapshot.task708d.samplePhantoms).toEqual([
      {
        paymentKind: 'income',
        paymentId: 'PAY-NUBOX-inc-3968936',
        documentId: 'INC-NB-26004360',
        accountId: 'santander-clp',
        paymentDate: '2026-04-13',
        amount: 752730,
        signalId: 'signal-cohort-d-001'
      }
    ])
    expect(snapshot.healthy).toBe(false)
  })

  it('cohort D detector SQL excludes superseded chains and reconciled evidence', async () => {
    await getFinanceLedgerHealth()

    const cohortDSqlCalls = mockRunQuery.mock.calls
      .map(([sql]) => sql)
      .filter(sql => sql.includes('d5_active_adoptions') || sql.includes('cohort_d'))

    expect(cohortDSqlCalls.length).toBeGreaterThanOrEqual(2)

    const allCohortDSql = cohortDSqlCalls.join('\n')

    // Three-axis supersede filter on payments
    expect(allCohortDSql).toContain('superseded_at IS NULL')
    expect(allCohortDSql).toContain('superseded_by_payment_id IS NULL')
    expect(allCohortDSql).toContain('superseded_by_otb_id IS NULL')

    // D5 rule signature
    expect(allCohortDSql).toContain("resolution_method = 'auto_exact_match'")
    expect(allCohortDSql).toContain("account_resolution_status = 'adopted'")

    // Bank evidence guards
    expect(allCohortDSql).toContain('matched_payment_id')
    expect(allCohortDSql).toContain('matched_settlement_leg_id')
    expect(allCohortDSql).toContain('reconciliation_row_id')

    // Post-cutover boundary
    expect(allCohortDSql).toMatch(/created_at >= TIMESTAMPTZ '\d{4}-\d{2}-\d{2}/)
  })

  it('handles SQL failure by reporting 0 and degrading gracefully', async () => {
    mockRunQuery.mockReset()
    mockRunQuery.mockImplementation((sql: string) => {
      if (sql.includes('cohort_d') || sql.includes('d5_active_adoptions')) {
        return Promise.reject(new Error('schema not migrated'))
      }

      // Default clean for other queries
      if (sql.includes('total')) return Promise.resolve([{ total: '0' }])

      return Promise.resolve([])
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task708d.postCutoverPhantomsWithoutBankEvidence).toBe(0)
    expect(snapshot.task708d.samplePhantoms).toEqual([])
  })
})
