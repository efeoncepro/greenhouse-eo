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

// NOTE: the consumer writes `deltaNet` to the expense row (the base payroll
// expense tracks net_total, so the delta must be in the same dimension).
// Gross values stay in the params for audit-trail notes and to keep the
// event payload shape stable, but they no longer drive the amount.
const baseParams = {
  periodId: '2026-03',
  memberId: 'member-42',
  operationalYear: 2026,
  operationalMonth: 3,
  previousNet: 800_000,
  newNet: 950_000,
  deltaNet: 150_000,
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

  it('inserts a positive NET delta expense and returns "applied"', async () => {
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
    //   $1=expenseId, $2=description, $3=currency, $4=amount (NET delta),
    //   $5=exchangeRateToClp, $6=totalAmountClp, $7=expenseDate,
    //   $8=periodId, $9=memberId, $10=notes, $11=reopenAuditId
    expect(values).toBeDefined()
    expect(values?.[0]).toMatch(/^EXP-RELIQ-2026-03-member-42-/)
    expect(values?.[1]).toBe('Reliquidación nómina 2026-03 (bono_retroactivo)')
    expect(values?.[2]).toBe('CLP')
    expect(values?.[3]).toBe(150_000) // ← NET delta, not gross
    expect(values?.[4]).toBe(1) // CLP exchange rate
    expect(values?.[5]).toBe(150_000) // CLP total_amount_clp = net delta
    expect(values?.[6]).toBe('2026-03-31') // last day of operational month
    expect(values?.[7]).toBe('2026-03')
    expect(values?.[8]).toBe('member-42')
    expect(String(values?.[9])).toContain('eventId=evt-123')
    expect(String(values?.[9])).toContain('deltaNet=150000')

    // Gross values survive in the notes for audit trail but do NOT drive
    // the amount.
    expect(String(values?.[9])).toContain('deltaGross=200000')
    expect(values?.[10]).toBe('audit-001')
  })

  it('Chile scenario: gross and net deltas differ — uses NET consistently with base expense', async () => {
    // Reproduces Valentina Hoyos / Marzo 2026 on 2026-04-15:
    // - v1 gross 832121 / v1 net 595656.75
    // - v2 gross 832944 / v2 net 595713.70
    // Gross delta = 823, but net delta = 56.95.
    // The base expense for Chile stores net_total, so the delta MUST be
    // the net delta, otherwise the sum (base + delta) diverges from the
    // actual post-reliquidación net.
    const { query, client } = createClient()

    await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      previousNet: 595_656.75,
      newNet: 595_713.7,
      deltaNet: 56.95,
      previousGross: 832_121,
      newGross: 832_944,
      deltaGross: 823
    })

    const values = query.mock.calls[0]?.[1]

    // The amount is net delta (56.95), NOT gross delta (823)
    expect(values?.[3]).toBe(56.95)
    expect(values?.[5]).toBe(56.95)
  })

  it('inserts a negative NET delta and returns "applied"', async () => {
    const { query, client } = createClient()

    const result = await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      previousNet: 950_000,
      newNet: 700_000,
      deltaNet: -250_000,
      previousGross: 1_200_000,
      newGross: 900_000,
      deltaGross: -300_000
    })

    expect(result).toBe('applied')
    expect(query).toHaveBeenCalledTimes(1)

    const values = query.mock.calls[0]?.[1]

    expect(values?.[3]).toBe(-250_000)
    expect(values?.[5]).toBe(-250_000)
  })

  it('returns "noop" and does not insert when net delta is zero', async () => {
    // A net delta of zero is a noop even if the gross delta is non-zero.
    // For Chile contracts the worker's deductions can shift without moving
    // the net — in that case no Finance row is necessary.
    const { query, client } = createClient()
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      previousNet: 595_656.75,
      newNet: 595_656.75,
      deltaNet: 0,
      previousGross: 832_121,
      newGross: 832_944,
      deltaGross: 823
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

  it('rounds USD NET deltas and posts them with exchange_rate_to_clp=0', async () => {
    // For international / Deel USD contracts gross == net, so both
    // dimensions drive the same amount. Rounding happens to 2 decimals.
    const { query, client } = createClient()

    await applyPayrollReliquidationDelta({
      client,
      ...baseParams,
      currency: 'USD',
      previousNet: 1000,
      newNet: 1250.125,
      deltaNet: 250.125,
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
