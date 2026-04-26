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

    expect(incomeInsert).toContain("'materializationReason', CAST($")
    expect(incomeInsert).toContain('AS text)')
    expect(incomeInsert?.match(/CAST\(\$\d+ AS text\)/g)).toHaveLength(2)

    expect(expenseInsert).toContain("'materializationReason', CAST($")
    expect(expenseInsert).toContain('AS text)')
    expect(expenseInsert?.match(/CAST\(\$\d+ AS text\)/g)).toHaveLength(2)

    expect(monthlyPositionInsert).toMatch(/concat_ws\(':', space_id, CAST\(\$\d+ AS text\)\)/)
    expect(monthlyPositionInsert).toMatch(/'periodId', CAST\(\$\d+ AS text\)/)
    expect(monthlyPositionInsert).toMatch(/'materializationReason', CAST\(\$\d+ AS text\)/)
    expect(monthlyPositionInsert?.match(/CAST\(\$\d+ AS text\)/g)).toHaveLength(5)

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
