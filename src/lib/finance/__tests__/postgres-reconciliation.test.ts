import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock implementations declared BEFORE vi.mock() ─────────────────
const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockAssertFinanceSlice2PostgresReady = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn(),
}))

vi.mock('@/lib/finance/postgres-store-slice2', async () => {
  const actual = await vi.importActual('@/lib/finance/postgres-store-slice2')

  return {
    ...actual,
    assertFinanceSlice2PostgresReady: (...args: unknown[]) =>
      mockAssertFinanceSlice2PostgresReady(...args),
  }
})

import { FinanceValidationError } from '@/lib/finance/shared'
import {
  createReconciliationPeriodInPostgres,
  listReconciliationPeriodsFromPostgres,
  updateStatementRowMatchInPostgres,
  clearStatementRowMatchInPostgres,
  assertReconciliationPeriodIsMutableFromPostgres,
  validateReconciledTransitionFromPostgres,
} from '@/lib/finance/postgres-reconciliation'

// ─── Shared mock data ────────────────────────────────────────────────

const mockPeriodRow = {
  period_id: 'period-1',
  account_id: 'acc-1',
  year: 2026,
  month: 3,
  opening_balance: '0',
  closing_balance_bank: null,
  closing_balance_system: null,
  difference: null,
  status: 'open',
  statement_imported: false,
  statement_imported_at: null,
  statement_row_count: 0,
  reconciled_by_user_id: null,
  reconciled_at: null,
  notes: null,
  instrument_category_snapshot: null,
  provider_slug_snapshot: null,
  provider_name_snapshot: null,
  period_currency_snapshot: 'CLP',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
}

const mockAccountRow = {
  instrument_category: 'bank',
  provider_slug: 'banco-estado',
  bank_name: 'Banco Estado',
  currency: 'CLP',
}

const mockStatementRow = {
  row_id: 'row-1',
  period_id: 'period-1',
  transaction_date: '2026-03-15',
  value_date: '2026-03-15',
  description: 'Wire transfer',
  reference: 'REF-001',
  amount: '500',
  balance: '1500',
  match_status: 'unmatched',
  matched_type: null,
  matched_id: null,
  matched_payment_id: null,
  matched_settlement_leg_id: null,
  match_confidence: null,
  notes: null,
  matched_by_user_id: null,
  matched_at: null,
  created_at: '2026-03-15T00:00:00.000Z',
  updated_at: '2026-03-15T00:00:00.000Z',
}

// ─── createReconciliationPeriodInPostgres ────────────────────────────

describe('createReconciliationPeriodInPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
  })

  it('happy path: creates period and returns { periodId, created: true }', async () => {
    // 1. Duplicate check → not found
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])

      // 2. Account lookup → found
      .mockResolvedValueOnce([mockAccountRow])

      // 3. INSERT period
      .mockResolvedValueOnce([])

    const result = await createReconciliationPeriodInPostgres({
      periodId: 'period-1',
      accountId: 'acc-1',
      year: 2026,
      month: 3,
      openingBalance: 0,
      notes: null,
    })

    expect(result.periodId).toBe('period-1')
    expect(result.created).toBe(true)
  })

  it('throws FinanceValidationError 409 when period already exists (duplicate periodId)', async () => {
    // Duplicate check → existing record found
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ period_id: 'period-1' }])

    await expect(
      createReconciliationPeriodInPostgres({
        periodId: 'period-1',
        accountId: 'acc-1',
        year: 2026,
        month: 3,
        openingBalance: 0,
        notes: null,
      })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 409 &&
        err.message.includes('already exists')
      )
    })
  })

  it('throws FinanceValidationError 404 when account is not found', async () => {
    // Duplicate check → none
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])

      // Account query → none
      .mockResolvedValueOnce([])

    await expect(
      createReconciliationPeriodInPostgres({
        periodId: 'period-new',
        accountId: 'acc-nonexistent',
        year: 2026,
        month: 3,
        openingBalance: 0,
        notes: null,
      })
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 404
      )
    })
  })

  it('INSERT uses the account currency and bank_name as snapshots', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockAccountRow])
      .mockResolvedValueOnce([])

    await createReconciliationPeriodInPostgres({
      periodId: 'period-2',
      accountId: 'acc-1',
      year: 2026,
      month: 4,
      openingBalance: 500000,
      notes: 'April reconciliation',
    })

    const insertSql = mockRunGreenhousePostgresQuery.mock.calls[2]?.[0] as string

    expect(insertSql).toContain('INSERT INTO greenhouse_finance.reconciliation_periods')
    expect(insertSql).toContain("'open'")
  })
})

// ─── listReconciliationPeriodsFromPostgres ───────────────────────────

describe('listReconciliationPeriodsFromPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
  })

  it('returns items and total count for all periods when no filter is applied', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockPeriodRow])

    const result = await listReconciliationPeriodsFromPostgres()

    expect(Array.isArray(result.items)).toBe(true)
    expect(typeof result.total).toBe('number')
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('filters by accountId when provided', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockPeriodRow])

    const result = await listReconciliationPeriodsFromPostgres({ accountId: 'acc-1' })

    expect(result.items[0]?.periodId).toBe('period-1')

    const sql = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(sql).toContain('account_id')
  })

  it('returns empty items and total 0 when no periods exist', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const result = await listReconciliationPeriodsFromPostgres({ accountId: 'acc-empty' })

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('filters by status when provided', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([mockPeriodRow])

    await listReconciliationPeriodsFromPostgres({ status: 'open' })

    const sql = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(sql).toContain('status')
  })
})

// ─── updateStatementRowMatchInPostgres ───────────────────────────────

describe('updateStatementRowMatchInPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
  })

  const matchPayload = {
    matchStatus: 'matched',
    matchedType: 'income_payment',
    matchedId: 'pay-001',
    matchedPaymentId: 'pay-001',
    matchedSettlementLegId: null,
    matchConfidence: 1.0,
    matchedByUserId: 'user-1',
    notes: null,
  }

  it('uses runGreenhousePostgresQuery when no external client is provided', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    await updateStatementRowMatchInPostgres('row-1', 'period-1', matchPayload)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    const sql = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(sql).toContain('UPDATE greenhouse_finance.bank_statement_rows')
    expect(sql).toContain('match_status')
  })

  it('uses external client when opts.client is provided and skips runGreenhousePostgresQuery', async () => {
    const mockExternalClientQuery = vi.fn().mockResolvedValue({ rows: [mockStatementRow] })
    const externalClient = { query: mockExternalClientQuery }

    await updateStatementRowMatchInPostgres('row-1', 'period-1', matchPayload, {
      client: externalClient,
    })

    expect(mockExternalClientQuery).toHaveBeenCalledTimes(1)
    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
  })
})

// ─── clearStatementRowMatchInPostgres ────────────────────────────────

describe('clearStatementRowMatchInPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
  })

  it('issues UPDATE that resets all match fields to NULL', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    await clearStatementRowMatchInPostgres('row-1', 'period-1')

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    const sql = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(sql).toContain("match_status = 'unmatched'")
    expect(sql).toContain('matched_type = NULL')
    expect(sql).toContain('matched_id = NULL')
    expect(sql).toContain('matched_payment_id = NULL')
  })

  it('uses external client when opts.client is provided', async () => {
    const mockExternalClientQuery = vi.fn().mockResolvedValue({ rows: [] })
    const externalClient = { query: mockExternalClientQuery }

    await clearStatementRowMatchInPostgres('row-1', 'period-1', { client: externalClient })

    expect(mockExternalClientQuery).toHaveBeenCalledTimes(1)
    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
  })
})

// ─── assertReconciliationPeriodIsMutableFromPostgres ─────────────────

describe('assertReconciliationPeriodIsMutableFromPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
  })

  it('throws FinanceValidationError 409 when period status is reconciled', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        period_id: 'period-1',
        account_id: 'acc-1',
        year: 2026,
        month: 3,
        status: 'reconciled',
      },
    ])

    await expect(
      assertReconciliationPeriodIsMutableFromPostgres('period-1')
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 409
      )
    })
  })

  it('throws FinanceValidationError 409 when period status is closed', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        period_id: 'period-1',
        account_id: 'acc-1',
        year: 2026,
        month: 3,
        status: 'closed',
      },
    ])

    await expect(
      assertReconciliationPeriodIsMutableFromPostgres('period-1')
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 409
      )
    })
  })

  it('returns period context when status is open (mutable)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        period_id: 'period-1',
        account_id: 'acc-1',
        year: 2026,
        month: 3,
        status: 'open',
      },
    ])

    const context = await assertReconciliationPeriodIsMutableFromPostgres('period-1')

    expect(context.periodId).toBe('period-1')
    expect(context.status).toBe('open')
  })

  it('throws FinanceValidationError 404 when period does not exist', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    await expect(
      assertReconciliationPeriodIsMutableFromPostgres('nonexistent-period')
    ).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof FinanceValidationError &&
        err.statusCode === 404
      )
    })
  })
})

// ─── validateReconciledTransitionFromPostgres ─────────────────────────

describe('validateReconciledTransitionFromPostgres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
  })

  it('returns totalRows, remainingRows, and statementImported from the query', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { total: '10', pending: '2' },
    ])

    const result = await validateReconciledTransitionFromPostgres('period-1', true)

    expect(result.totalRows).toBe(10)
    expect(result.remainingRows).toBe(2)
    expect(result.statementImported).toBe(true)
  })

  it('returns zero counts when no statement rows exist', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { total: '0', pending: '0' },
    ])

    const result = await validateReconciledTransitionFromPostgres('period-empty', false)

    expect(result.totalRows).toBe(0)
    expect(result.remainingRows).toBe(0)
    expect(result.statementImported).toBe(false)
  })
})
