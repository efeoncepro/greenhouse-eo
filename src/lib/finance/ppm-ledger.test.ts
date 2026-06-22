import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { buildPpmPeriodId, materializePpmForPeriod } from '@/lib/finance/ppm-ledger'

describe('buildPpmPeriodId', () => {
  it('formatea period_id YYYY-MM con mes padded', () => {
    expect(buildPpmPeriodId(2026, 6)).toBe('2026-06')
    expect(buildPpmPeriodId(2026, 11)).toBe('2026-11')
  })
})

describe('materializePpmForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0

    queuedResults.push(
      { rows: [] }, // advisory lock
      { rows: [] }, // DELETE position
      { rows: [] }, // INSERT position (base × rate)
      {
        rows: [
          {
            positions_materialized: 1,
            base_amount_clp: '5800000',
            ppm_amount_clp: '14500'
          }
        ]
      }
    )
  })

  it('computa PPM = base ventas netas × tasa resuelta (SSOT), advisory lock, scope entidad legal', async () => {
    const summary = await materializePpmForPeriod(2026, 6, 'TASK-1189 test')

    expect(mockGetDb).toHaveBeenCalledTimes(1)
    expect(mockTransactionExecute).toHaveBeenCalledTimes(1)
    // advisory lock + DELETE + INSERT + summary = 4
    expect(executedSql).toHaveLength(4)

    expect(executedSql[0]).toMatch(/pg_advisory_xact_lock\(hashtext\('ppm_materialize'\), hashtext\(\$\d+::text\)\)/)

    const positionInsert = executedSql.find(query =>
      query.includes('INSERT INTO greenhouse_finance.ppm_monthly_positions')
    )

    // Base = ventas netas (income.subtotal) CLP-normalizado, sin anuladas, guard FX.
    expect(positionInsert).toMatch(/FROM greenhouse_finance\.income i/)
    expect(positionInsert).toMatch(/COALESCE\(i\.is_annulled, false\) = false/)
    expect(positionInsert).toMatch(/i\.currency = 'CLP' OR COALESCE\(NULLIF\(i\.exchange_rate_to_clp, 0\), 0\) <> 0/)
    // Tasa resuelta desde la SSOT ppm_rate_config (NUNCA hardcode); org-specific > default.
    expect(positionInsert).toMatch(/FROM greenhouse_finance\.ppm_rate_config/)
    expect(positionInsert).toMatch(/organization_id = \$\d+::text OR organization_id IS NULL/)
    expect(positionInsert).toMatch(/ORDER BY \(organization_id IS NOT NULL\) DESC, effective_period_start DESC/)
    // PPM = base × rate.
    expect(positionInsert).toMatch(/base\.base_amount_clp \* COALESCE\(rr\.rate, 0\)/)
    // Scope entidad legal, sin space_id.
    expect(positionInsert).not.toMatch(/space_id/)

    expect(summary).toEqual({
      periodId: '2026-06',
      positionsMaterialized: 1,
      baseAmountClp: 5800000,
      ppmAmountClp: 14500
    })
  })
})
