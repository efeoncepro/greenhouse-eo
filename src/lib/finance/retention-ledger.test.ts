import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSiiRetentionRate, SII_RETENTION_RATES } from '@/types/hr-contracts'

vi.mock('server-only', () => ({}))

const executedSql: string[] = []
const queuedResults: Array<{ rows: Array<Record<string, unknown>> }> = []
const mockTransactionExecute = vi.fn(async (callback: (trx: unknown) => Promise<unknown>) => callback({}))

const mockGetDb: (...args: unknown[]) => Promise<{ transaction: () => { execute: typeof mockTransactionExecute } }> = vi.fn(
  async () => ({
    transaction: () => ({
      execute: mockTransactionExecute
    })
  })
)

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

import { buildRetentionPeriodId, materializeRetentionLedgerForPeriod } from '@/lib/finance/retention-ledger'

describe('SII_RETENTION_RATES (SSOT — acceptance criterion: tasa por año)', () => {
  it('expone las tasas escalonadas SII 2024→2028 sin hardcode en el materializador', () => {
    expect(SII_RETENTION_RATES[2024]).toBe(0.1375)
    expect(SII_RETENTION_RATES[2025]).toBe(0.145)
    expect(SII_RETENTION_RATES[2026]).toBe(0.1525)
    expect(SII_RETENTION_RATES[2027]).toBe(0.16)
    expect(SII_RETENTION_RATES[2028]).toBe(0.17)
    // Año fuera de rango → cae al último conocido (fail-safe forward).
    expect(getSiiRetentionRate(2030)).toBe(SII_RETENTION_RATES[2028])
  })
})

describe('buildRetentionPeriodId', () => {
  it('formatea period_id YYYY-MM con mes padded', () => {
    expect(buildRetentionPeriodId(2026, 5)).toBe('2026-05')
    expect(buildRetentionPeriodId(2026, 12)).toBe('2026-12')
  })
})

describe('materializeRetentionLedgerForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0

    queuedResults.push(
      { rows: [] }, // advisory lock
      { rows: [] }, // DELETE positions
      { rows: [] }, // DELETE ledger
      { rows: [] }, // INSERT ledger entries (scoped_bhe)
      { rows: [] }, // INSERT monthly position (aggregated)
      {
        rows: [
          {
            positions_materialized: 1,
            ledger_entries_materialized: 3,
            total_retention_amount_clp: '242623'
          }
        ]
      }
    )
  })

  it('materializa desde BHE con advisory lock, guard FX, tasa SSOT y scope entidad legal', async () => {
    const summary = await materializeRetentionLedgerForPeriod(2026, 5, 'TASK-1188 test')

    expect(mockGetDb).toHaveBeenCalledTimes(1)
    expect(mockTransactionExecute).toHaveBeenCalledTimes(1)
    // advisory lock + 2 DELETE + INSERT ledger + INSERT position + summary = 6
    expect(executedSql).toHaveLength(6)

    // Advisory lock por período namespaced (lección TASK-1185), 1er statement.
    expect(executedSql[0]).toMatch(/pg_advisory_xact_lock\(hashtext\('retention_materialize'\), hashtext\(\$\d+::text\)\)/)

    const ledgerInsert = executedSql.find(query =>
      query.includes('INSERT INTO greenhouse_finance.retention_ledger_entries') && query.includes('FROM scoped_bhe')
    )

    const positionInsert = executedSql.find(query =>
      query.includes('INSERT INTO greenhouse_finance.retention_monthly_positions')
    )

    // Single-source BHE etiquetado, dedup guard counted, bucket honorarios.
    expect(ledgerInsert).toContain("'expense_bhe'")
    expect(ledgerInsert).toContain("'honorarios'")
    expect(ledgerInsert).toContain("'counted'")
    // Guard FX (TASK-1185): omite no-CLP sin FX resoluble.
    expect(ledgerInsert).toMatch(/e\.currency = 'CLP' OR COALESCE\(NULLIF\(e\.exchange_rate_to_clp, 0\), 0\) <> 0/)
    // Solo documentos con retención.
    expect(ledgerInsert).toMatch(/COALESCE\(e\.withholding_amount, 0\) > 0/)
    // TASK-1204 guard: excluye documentos anulados (boleta anulada en SII NUNCA declara retención).
    expect(ledgerInsert).toMatch(/COALESCE\(e\.is_annulled, false\) = false/)
    // Casts explícitos (gate TASK-893 SQL embebido).
    expect(ledgerInsert?.match(/\$\d+::int/g)?.length).toBeGreaterThanOrEqual(2)
    expect(ledgerInsert).toMatch(/\$\d+::text/)

    // Scope = entidad legal: posición agrupada/llaveada por organization_id, NUNCA space_id.
    expect(positionInsert).toMatch(/GROUP BY e\.organization_id/)
    expect(positionInsert).not.toMatch(/space_id/)
    // Solo asientos counted entran a la posición (dedup guard).
    expect(positionInsert).toMatch(/e\.dedup_status = 'counted'/)

    expect(summary).toEqual({
      periodId: '2026-05',
      positionsMaterialized: 1,
      ledgerEntriesMaterialized: 3,
      totalRetentionAmountClp: 242623
    })
  })
})
