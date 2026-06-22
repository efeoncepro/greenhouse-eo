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

// TASK-725 — el materializador resuelve la operating entity (dueño fiscal).
vi.mock('@/lib/account-360/organization-identity', () => ({
  getOperatingEntityIdentity: vi.fn(async () => ({
    organizationId: 'org-efeonce-test',
    legalName: 'Efeonce Group SpA',
    taxId: '77.357.182-1',
    taxIdType: 'RUT',
    legalAddress: null,
    country: 'CL'
  }))
}))

import { materializeVatLedgerForPeriod } from '@/lib/finance/vat-ledger'

describe('materializeVatLedgerForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0

    queuedResults.push(
      { rows: [] }, // TASK-1185 Slice 2: pg_advisory_xact_lock (1er statement de la tx)
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
    // TASK-1185 Slice 2: el advisory lock agrega un statement al inicio de la tx
    // (advisory lock + 2 DELETE + 2 INSERT entries + INSERT position + summary).
    expect(executedSql).toHaveLength(7)

    // TASK-1185 Slice 2: advisory lock por período (namespaced) es el 1er statement.
    expect(executedSql[0]).toMatch(/pg_advisory_xact_lock\(hashtext\('vat_materialize'\), hashtext\(\$\d+::text\)\)/)

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

    // TASK-725 — la posición se llavea/agrupa por organization_id (entidad
    // legal), no por space_id.
    expect(monthlyPositionInsert).toMatch(/concat_ws\(':', organization_id, \$\d+::text\)/)
    expect(monthlyPositionInsert).toMatch(/GROUP BY e\.organization_id/)
    expect(monthlyPositionInsert).toMatch(/'periodId', \$\d+::text/)
    expect(monthlyPositionInsert).toMatch(/'materializationReason', \$\d+::text/)
    expect(monthlyPositionInsert?.match(/\$\d+::text/g)?.length).toBeGreaterThanOrEqual(5)

    // TASK-725 anti-regresión ISSUE-101: NUNCA re-introducir el gate de WHERE
    // `space_id IS NOT NULL` que excluía el crédito fiscal del overhead. (El
    // CASE `space_resolution_source` sí usa `q.space_id IS NOT NULL` como
    // etiqueta — no es un gate y debe poder coexistir.)
    expect(incomeInsert).not.toMatch(/COALESCE\(q\.space_id, cb\.space_id\) IS NOT NULL/)
    expect(expenseInsert).not.toMatch(/AND e\.space_id IS NOT NULL/)

    // TASK-1185 Slice 1: guard FX — los CTEs income/expense omiten docs no-CLP
    // con FX nulo/0 (evita la sub-declaración ×1 silenciosa).
    expect(incomeInsert).toMatch(/i\.currency = 'CLP' OR COALESCE\(NULLIF\(i\.exchange_rate_to_clp, 0\), 0\) <> 0/)
    expect(expenseInsert).toMatch(/e\.currency = 'CLP' OR COALESCE\(NULLIF\(e\.exchange_rate_to_clp, 0\), 0\) <> 0/)

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
