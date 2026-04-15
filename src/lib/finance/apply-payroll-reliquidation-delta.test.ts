import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PoolClient } from 'pg'

import { applyPayrollReliquidationDelta } from '@/lib/finance/apply-payroll-reliquidation-delta'

type QueryMock = ReturnType<typeof vi.fn>

const createClient = () => {
  const query: QueryMock = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 })

  return {
    query,
    client: { query } as unknown as PoolClient
  }
}

const baseParams = {
  periodId: '2026-03',
  memberId: 'member-42',
  operationalYear: 2026,
  operationalMonth: 3,
  previousGross: 1_000_000,
  newGross: 1_200_000,
  deltaGross: 200_000,
  currency: 'CLP' as const,
  reopenAuditId: 'audit-001',
  reason: 'bono_retroactivo',
  eventId: 'evt-123'
}

describe('applyPayrollReliquidationDelta', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('inserts a positive delta expense and returns "applied"', async () => {
    const { query, client } = createClient()

    const result = await applyPayrollReliquidationDelta({
      client,
      ...baseParams
    })

    expect(result).toBe('applied')
    expect(query).toHaveBeenCalledTimes(1)

    const [sql, values] = query.mock.calls[0] ?? []

    expect(sql).toContain('INSERT INTO greenhouse_finance.expenses')
    expect(sql).toContain("'payroll_reliquidation'")
    expect(sql).toContain("'payroll'")
    expect(sql).toContain("'direct_labor'")

    // Positional parameters, in the order defined in the helper:
    //   $1=expenseId, $2=description, $3=currency, $4=amount,
    //   $5=exchangeRateToClp, $6=totalAmountClp, $7=expenseDate,
    //   $8=periodId, $9=memberId, $10=notes, $11=reopenAuditId
    expect(values).toBeDefined()
    expect(values?.[0]).toMatch(/^EXP-RELIQ-2026-03-member-42-/)
    expect(values?.[1]).toBe('Reliquidación nómina 2026-03 (bono_retroactivo)')
    expect(values?.[2]).toBe('CLP')
    expect(values?.[3]).toBe(200_000)
    expect(values?.[4]).toBe(1) // CLP exchange rate
    expect(values?.[5]).toBe(200_000) // CLP total_amount_clp = amount
    expect(values?.[6]).toBe('2026-03-31') // last day of operational month
    expect(values?.[7]).toBe('2026-03')
    expect(values?.[8]).toBe('member-42')
    expect(String(values?.[9])).toContain('eventId=evt-123')
    expect(String(values?.[9])).toContain('deltaGross=200000')
    expect(values?.[10]).toBe('audit-001')
  })

  it('inserts a negative delta and returns "applied"', async () => {
    const { query, client } = createClient()

    const result = await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      previousGross: 1_200_000,
      newGross: 900_000,
      deltaGross: -300_000
    })

    expect(result).toBe('applied')
    expect(query).toHaveBeenCalledTimes(1)

    const values = query.mock.calls[0]?.[1]

    expect(values?.[3]).toBe(-300_000)
    expect(values?.[5]).toBe(-300_000)
  })

  it('returns "noop" and does not insert when delta is zero', async () => {
    const { query, client } = createClient()
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      previousGross: 1_000_000,
      newGross: 1_000_000,
      deltaGross: 0
    })

    expect(result).toBe('noop')
    expect(query).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalled()
  })

  it('uses operational year/month for expense_date (not current date)', async () => {
    const { query, client } = createClient()

    await applyPayrollReliquidationDelta({
      client,
      ...baseParams,

      // Operational month = Feb 2024 (a leap month) — force a value that
      // cannot be mistaken for `new Date()` on the current wall clock.
      operationalYear: 2024,
      operationalMonth: 2,
      periodId: '2024-02'
    })

    const values = query.mock.calls[0]?.[1]

    expect(values?.[6]).toBe('2024-02-29')
  })

  it('rounds USD deltas and posts them with exchange_rate_to_clp=0', async () => {
    const { query, client } = createClient()

    await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      currency: 'USD',
      previousGross: 1000,
      newGross: 1250.125,
      deltaGross: 250.125
    })

    const values = query.mock.calls[0]?.[1]

    expect(values?.[2]).toBe('USD')
    expect(values?.[3]).toBe(250.13)
    expect(values?.[4]).toBe(0)
    expect(values?.[5]).toBe(0)
  })

  it('throws on invalid operational month', async () => {
    const { client } = createClient()

    await expect(
      applyPayrollReliquidationDelta({
        client,
        ...baseParams,
        operationalMonth: 13
      })
    ).rejects.toThrow(/invalid operational period/)
  })
})
