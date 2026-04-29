/**
 * TASK-722 — getReconciliationFullContext bridge helper tests.
 *
 * Cubre:
 * - nextAction state machine (declare_snapshot → create_period → import_statement
 *   → resolve_matches → mark_reconciled → close_period → closed → archived)
 * - Composition de las 5 lecturas (account, period, snapshot, asset, counts)
 * - Modo de query: por periodId vs por (accountId, year, month)
 * - Defensive: account no existente → null
 * - Defensive: archived period → 'archived' (no avanza state)
 * - listOrphanSnapshotsForPeriod retorna solo snapshots sin period linked
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import {
  buildDeterministicPeriodId,
  getReconciliationFullContext,
  listOrphanSnapshotsForPeriod
} from '@/lib/finance/reconciliation/full-context'

const ACCOUNT_ROW = {
  account_id: 'santander-clp',
  account_name: 'Santander',
  currency: 'CLP',
  instrument_category: 'bank_account',
  account_kind: 'asset'
}

const SNAPSHOT_ROW = {
  snapshot_id: 'recon-santander-clp-20260428-abc12345',
  snapshot_at: '2026-04-28T19:57:00Z',
  bank_closing_balance: '4172563',
  pg_closing_balance: '4172563',
  drift_amount: '0',
  drift_status: 'reconciled',
  drift_explanation: null,
  source_kind: 'officebanking_screenshot',
  source_evidence_ref: null,
  evidence_asset_id: 'asset-123',
  reconciliation_period_id: null,
  declared_by_user_id: 'user-1',
  created_at: '2026-04-28T19:57:00Z'
}

const ASSET_ROW = {
  asset_id: 'asset-123',
  public_id: 'EO-AST-ABC12345',
  filename: 'cartola-santander-20260428.pdf',
  mime_type: 'application/pdf',
  size_bytes: '524288',
  content_hash: 'sha256:abc...',
  uploaded_at: '2026-04-28T19:50:00Z',
  status: 'attached'
}

type PeriodRow = {
  period_id: string
  year: number
  month: number
  status: string
  opening_balance: string
  closing_balance_bank: string | null
  closing_balance_system: string | null
  difference: string | null
  statement_imported: boolean
  statement_row_count: number
  archived_at: string | null
  archive_kind: string | null
}

const PERIOD_ROW_OPEN: PeriodRow = {
  period_id: 'santander-clp_2026_04',
  year: 2026,
  month: 4,
  status: 'in_progress',
  opening_balance: '0',
  closing_balance_bank: null,
  closing_balance_system: null,
  difference: null,
  statement_imported: false,
  statement_row_count: 0,
  archived_at: null,
  archive_kind: null
}

const PERIOD_ROW_WITH_STATEMENT = {
  ...PERIOD_ROW_OPEN,
  closing_balance_bank: '4172563',
  closing_balance_system: '4172563',
  difference: '0',
  statement_imported: true,
  statement_row_count: 10
}

const COUNTS_ALL_MATCHED = {
  total: '10', matched: '10', suggested: '0', excluded: '0', unmatched: '0'
}

const COUNTS_HAS_UNMATCHED = {
  total: '10', matched: '8', suggested: '0', excluded: '0', unmatched: '2'
}

const COUNTS_EMPTY = {
  total: '0', matched: '0', suggested: '0', excluded: '0', unmatched: '0'
}

const setup = (responses: {
  account?: typeof ACCOUNT_ROW | null
  period?: PeriodRow | null
  snapshot?: typeof SNAPSHOT_ROW | null
  asset?: typeof ASSET_ROW | null
  counts?: typeof COUNTS_EMPTY
  periodById?: (PeriodRow & { account_id: string }) | null
}) => {
  mockRunQuery.mockReset()
  mockRunQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM greenhouse_finance.accounts') && sql.includes('LIMIT 1')) {
      return Promise.resolve(responses.account ? [responses.account] : [])
    }

    if (sql.includes('FROM greenhouse_finance.reconciliation_periods') && sql.includes('account_id = $1 AND year')) {
      return Promise.resolve(responses.period ? [responses.period] : [])
    }

    if (sql.includes('FROM greenhouse_finance.reconciliation_periods') && sql.includes('period_id = $1')) {
      return Promise.resolve(responses.periodById ? [responses.periodById] : [])
    }

    if (sql.includes('FROM greenhouse_finance.account_reconciliation_snapshots') && sql.includes('reconciliation_period_id IS NULL')) {
      return Promise.resolve([])
    }

    if (sql.includes('FROM greenhouse_finance.account_reconciliation_snapshots')) {
      return Promise.resolve(responses.snapshot ? [responses.snapshot] : [])
    }

    if (sql.includes('FROM greenhouse_core.assets')) {
      return Promise.resolve(responses.asset ? [responses.asset] : [])
    }

    if (sql.includes('FROM greenhouse_finance.bank_statement_rows')) {
      return Promise.resolve([responses.counts ?? COUNTS_EMPTY])
    }

    return Promise.resolve([])
  })
}

beforeEach(() => {
  mockRunQuery.mockReset()
})

describe('TASK-722 buildDeterministicPeriodId', () => {
  it('format consistente: accountId_year_MM', () => {
    expect(buildDeterministicPeriodId('santander-clp', 2026, 4)).toBe('santander-clp_2026_04')
    expect(buildDeterministicPeriodId('global66-clp', 2026, 12)).toBe('global66-clp_2026_12')
    expect(buildDeterministicPeriodId('cca-julio', 2025, 1)).toBe('cca-julio_2025_01')
  })
})

describe('TASK-722 getReconciliationFullContext — nextAction state machine', () => {
  it('declare_snapshot: account exists, no snapshot, no period', async () => {
    setup({ account: ACCOUNT_ROW, snapshot: null, period: null })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('declare_snapshot')
    expect(ctx?.account.accountId).toBe('santander-clp')
    expect(ctx?.latestSnapshot).toBeNull()
    expect(ctx?.period).toBeNull()
  })

  it('create_period: snapshot exists, no period linked', async () => {
    setup({ account: ACCOUNT_ROW, snapshot: SNAPSHOT_ROW, period: null, asset: ASSET_ROW })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('create_period')
    expect(ctx?.latestSnapshot).not.toBeNull()
    expect(ctx?.evidenceAsset?.assetId).toBe('asset-123')
  })

  it('import_statement: period created, no statement imported', async () => {
    setup({ account: ACCOUNT_ROW, snapshot: SNAPSHOT_ROW, period: PERIOD_ROW_OPEN, asset: ASSET_ROW })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('import_statement')
    expect(ctx?.period?.statementImported).toBe(false)
  })

  it('resolve_matches: statement imported, has unmatched rows', async () => {
    setup({
      account: ACCOUNT_ROW,
      snapshot: SNAPSHOT_ROW,
      period: PERIOD_ROW_WITH_STATEMENT,
      asset: ASSET_ROW,
      counts: COUNTS_HAS_UNMATCHED
    })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('resolve_matches')
    expect(ctx?.statementRows.unmatched).toBe(2)
    expect(ctx?.statementRows.matched).toBe(8)
  })

  it('mark_reconciled: all matched, diff zero, status not yet reconciled', async () => {
    setup({
      account: ACCOUNT_ROW,
      snapshot: SNAPSHOT_ROW,
      period: PERIOD_ROW_WITH_STATEMENT,
      asset: ASSET_ROW,
      counts: COUNTS_ALL_MATCHED
    })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('mark_reconciled')
    expect(ctx?.difference).toBe(0)
  })

  it('close_period: period status reconciled', async () => {
    setup({
      account: ACCOUNT_ROW,
      snapshot: SNAPSHOT_ROW,
      period: { ...PERIOD_ROW_WITH_STATEMENT, status: 'reconciled' },
      asset: ASSET_ROW,
      counts: COUNTS_ALL_MATCHED
    })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('close_period')
  })

  it('closed: terminal state', async () => {
    setup({
      account: ACCOUNT_ROW,
      snapshot: SNAPSHOT_ROW,
      period: { ...PERIOD_ROW_WITH_STATEMENT, status: 'closed' },
      asset: ASSET_ROW,
      counts: COUNTS_ALL_MATCHED
    })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('closed')
  })

  it('archived: archive_at supersede status', async () => {
    setup({
      account: ACCOUNT_ROW,
      snapshot: SNAPSHOT_ROW,
      period: { ...PERIOD_ROW_WITH_STATEMENT, status: 'reconciled', archived_at: '2026-04-29T00:00:00Z', archive_kind: 'test_period' },
      asset: ASSET_ROW,
      counts: COUNTS_ALL_MATCHED
    })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('archived')
    expect(ctx?.period?.archiveKind).toBe('test_period')
  })

  it('resolve_matches even when all flagged matched but difference is non-zero', async () => {
    setup({
      account: ACCOUNT_ROW,
      snapshot: SNAPSHOT_ROW,
      period: { ...PERIOD_ROW_WITH_STATEMENT, difference: '1500' },
      asset: ASSET_ROW,
      counts: COUNTS_ALL_MATCHED
    })

    const ctx = await getReconciliationFullContext({ accountId: 'santander-clp', year: 2026, month: 4 })

    expect(ctx?.nextAction).toBe('resolve_matches')
    expect(ctx?.difference).toBe(1500)
  })
})

describe('TASK-722 getReconciliationFullContext — query modes', () => {
  it('por periodId resuelve account + year + month implícitos', async () => {
    setup({
      account: ACCOUNT_ROW,
      periodById: { ...PERIOD_ROW_WITH_STATEMENT, account_id: 'santander-clp' },
      snapshot: SNAPSHOT_ROW,
      asset: ASSET_ROW,
      counts: COUNTS_ALL_MATCHED
    })

    const ctx = await getReconciliationFullContext({ periodId: 'santander-clp_2026_04' })

    expect(ctx).not.toBeNull()
    expect(ctx?.account.accountId).toBe('santander-clp')
    expect(ctx?.period?.periodId).toBe('santander-clp_2026_04')
  })

  it('por periodId con period inexistente → null', async () => {
    setup({ periodById: null })

    const ctx = await getReconciliationFullContext({ periodId: 'nope_2026_04' })

    expect(ctx).toBeNull()
  })

  it('por (accountId, year, month) con account inexistente → null', async () => {
    setup({ account: null })

    const ctx = await getReconciliationFullContext({ accountId: 'unknown', year: 2026, month: 4 })

    expect(ctx).toBeNull()
  })
})

describe('TASK-722 listOrphanSnapshotsForPeriod', () => {
  it('SQL filtra por reconciliation_period_id IS NULL', async () => {
    mockRunQuery.mockReset()
    mockRunQuery.mockImplementation((sql: string) => {
      // Validate SQL guards
      expect(sql).toContain('reconciliation_period_id IS NULL')
      expect(sql).toContain('is_active = TRUE')

      return Promise.resolve([
        {
          snapshot_id: 'snap-1',
          account_id: 'global66-clp',
          account_name: 'Global66',
          currency: 'CLP',
          snapshot_at: '2026-04-27T18:00:00Z',
          drift_status: 'reconciled',
          drift_amount: '0',
          bank_closing_balance: '8562',
          evidence_asset_id: null
        }
      ])
    })

    const orphans = await listOrphanSnapshotsForPeriod(2026, 4)

    expect(orphans).toHaveLength(1)
    expect(orphans[0].accountId).toBe('global66-clp')
    expect(orphans[0].driftAmount).toBe(0)
  })
})
