import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const executedSql: string[] = []
const queuedResults: Array<{ rows: Array<Record<string, unknown>> }> = []
const mockTransactionExecute = vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({}))

const mockGetDb: (...args: unknown[]) => Promise<{ transaction: () => { execute: typeof mockTransactionExecute } }> = vi.fn(async () => ({
  transaction: () => ({
    execute: mockTransactionExecute
  })
}))

const renderSql = (strings: TemplateStringsArray, values: unknown[]) =>
  strings.reduce((query, fragment, index) => {
    const value = index < values.length ? `$${index + 1}` : ''

    return `${query}${fragment}${value}`
  }, '')

vi.mock('kysely', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    execute: vi.fn(async () => {
      executedSql.push(renderSql(strings, values))

      return queuedResults.shift() ?? { rows: [] }
    })
  })
}))

vi.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args)
}))

vi.mock('@/lib/finance/reporting', () => ({
  getFinanceCurrentPeriod: () => ({ year: 2026, month: 4 })
}))

import { materializeVatLedgerForPeriod } from '@/lib/finance/vat-ledger'

describe('materializeVatLedgerForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0

    queuedResults.push(
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
      {
        rows: [
          {
            positions_materialized: 2,
            ledger_entries_materialized: 5,
            debit_fiscal_amount_clp: '1000',
            credit_fiscal_amount_clp: '400',
            non_recoverable_vat_amount_clp: '75'
          }
        ]
      }
    )
  })

  it('casts text placeholders explicitly in VAT materialization SQL', async () => {
    const summary = await materializeVatLedgerForPeriod(
      2026,
      4,
      'reactive-refresh:finance.expense.nubox_synced:2026-04'
    )

    expect(mockGetDb).toHaveBeenCalledTimes(1)
    expect(mockTransactionExecute).toHaveBeenCalledTimes(1)
    expect(executedSql).toHaveLength(6)

    const incomeInsert = executedSql.find(query =>
      query.includes('INSERT INTO greenhouse_finance.vat_ledger_entries') && query.includes('FROM scoped_income')
    )

    const expenseInsert = executedSql.find(query =>
      query.includes('INSERT INTO greenhouse_finance.vat_ledger_entries') && query.includes("'credito_fiscal'::text AS vat_bucket")
    )

    const monthlyPositionInsert = executedSql.find(query =>
      query.includes('INSERT INTO greenhouse_finance.vat_monthly_positions')
    )

    // After the explicit-cast refactor, all params use postfix `::text` / `::int`
    // form (PG canonical) instead of `CAST(... AS text)`. This unblocks the
    // "could not determine data type of parameter $N" error from PG's parser
    // when a parameter sits inside a deeply nested SELECT projection.
    expect(incomeInsert).toContain("'materializationReason', $")
    expect(incomeInsert).toMatch(/\$\d+::text/)
    expect(incomeInsert?.match(/\$\d+::int/g)?.length).toBeGreaterThanOrEqual(4)

    expect(expenseInsert).toContain("'materializationReason', $")
    expect(expenseInsert).toMatch(/\$\d+::text/)
    expect(expenseInsert?.match(/\$\d+::int/g)?.length).toBeGreaterThanOrEqual(4)

    expect(monthlyPositionInsert).toMatch(/concat_ws\(':', space_id, \$\d+::text\)/)
    expect(monthlyPositionInsert).toMatch(/'periodId', \$\d+::text/)
    expect(monthlyPositionInsert).toMatch(/'materializationReason', \$\d+::text/)
    expect(monthlyPositionInsert?.match(/\$\d+::text/g)?.length).toBeGreaterThanOrEqual(5)

    expect(summary).toEqual({
      periodId: '2026-04',
      positionsMaterialized: 2,
      ledgerEntriesMaterialized: 5,
      debitFiscalAmountClp: 1000,
      creditFiscalAmountClp: 400,
      nonRecoverableVatAmountClp: 75
    })
  })
})
