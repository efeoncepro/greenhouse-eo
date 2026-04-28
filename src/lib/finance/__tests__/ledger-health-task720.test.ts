/**
 * TASK-720 — instrument_category KPI rule detector test.
 *
 * Asserts that getFinanceLedgerHealth correctly:
 *   1. Reports task720.instrumentCategoriesWithoutKpiRule = 0 in steady state
 *   2. Surfaces sample of accounts with missing rule
 *   3. healthy = false when count > 0
 *   4. SQL filters by is_active and excludes NULL instrument_category
 *   5. Handles SQL failure gracefully (returns 0 + empty sample)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'

const SAMPLE_ACCOUNT_WITHOUT_RULE = {
  account_id: 'wallet-employee-X',
  account_name: 'Wallet Empleado X',
  instrument_category: 'employee_wallet_v2',
  currency: 'CLP'
}

const setupCleanResponses = (overrides: Partial<{
  task720Count: number
  task720Sample: typeof SAMPLE_ACCOUNT_WITHOUT_RULE[]
}> = {}) => {
  mockRunQuery.mockReset()
  mockRunQuery.mockImplementation((sql: string) => {
    // settlement_drift / phantoms / freshness / unanchored — empty
    if (sql.includes('income_settlement_reconciliation')) return Promise.resolve([])
    if (sql.includes("payment_source = 'nubox_bank_sync'")) return Promise.resolve([])
    if (sql.includes("payment_source IN ('nubox_sync', 'manual')")) return Promise.resolve([])
    if (sql.includes('FRESHNESS') || (sql.includes('account_balances ab') && !sql.includes('instrument_category_kpi_rules'))) return Promise.resolve([])
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

    // task714d
    if (sql.includes('imbalanced')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes("HAVING SUM(CASE WHEN direction = 'outgoing'")) {
      return Promise.resolve([])
    }

    // cohort D — empty
    if (sql.includes('cohort_d')) {
      return Promise.resolve([{ total: '0' }])
    }

    if (sql.includes('d5_active_adoptions')) return Promise.resolve([])

    // TASK-720 — instrument_category_kpi_rules
    if (sql.includes('instrument_category_kpi_rules')) {
      if (sql.includes('SELECT COUNT(*)')) {
        return Promise.resolve([{ total: String(overrides.task720Count ?? 0) }])
      }

      // Sample query
      return Promise.resolve(overrides.task720Sample ?? [])
    }

    return Promise.resolve([])
  })
}

beforeEach(() => {
  setupCleanResponses()
})

describe('TASK-720 instrument_category KPI rule detector', () => {
  it('reports zero accounts without rule in steady state', async () => {
    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task720.instrumentCategoriesWithoutKpiRule).toBe(0)
    expect(snapshot.task720.sampleAccountsWithoutRule).toEqual([])
    expect(snapshot.healthy).toBe(true)
  })

  it('flags non-zero accounts without rule as unhealthy', async () => {
    setupCleanResponses({
      task720Count: 1,
      task720Sample: [SAMPLE_ACCOUNT_WITHOUT_RULE]
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task720.instrumentCategoriesWithoutKpiRule).toBe(1)
    expect(snapshot.task720.sampleAccountsWithoutRule).toEqual([
      {
        accountId: 'wallet-employee-X',
        accountName: 'Wallet Empleado X',
        instrumentCategory: 'employee_wallet_v2',
        currency: 'CLP'
      }
    ])
    expect(snapshot.healthy).toBe(false)
  })

  it('SQL filters by is_active and NOT NULL instrument_category', async () => {
    await getFinanceLedgerHealth()

    const sqlCalls = mockRunQuery.mock.calls
      .map(([sql]) => sql)
      .filter(sql => sql.includes('instrument_category_kpi_rules'))

    expect(sqlCalls.length).toBeGreaterThanOrEqual(2)

    const allSql = sqlCalls.join('\n')

    expect(allSql).toContain('is_active = TRUE')
    expect(allSql).toContain('instrument_category IS NOT NULL')
    expect(allSql).toContain('NOT EXISTS')
  })

  it('handles SQL failure gracefully (returns 0 + empty sample)', async () => {
    mockRunQuery.mockReset()
    mockRunQuery.mockImplementation((sql: string) => {
      if (sql.includes('instrument_category_kpi_rules')) {
        return Promise.reject(new Error('relation does not exist'))
      }

      if (sql.includes('total')) return Promise.resolve([{ total: '0' }])

      return Promise.resolve([])
    })

    const snapshot = await getFinanceLedgerHealth()

    expect(snapshot.task720.instrumentCategoriesWithoutKpiRule).toBe(0)
    expect(snapshot.task720.sampleAccountsWithoutRule).toEqual([])
  })
})
