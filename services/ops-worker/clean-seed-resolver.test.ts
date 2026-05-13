import { describe, expect, it } from 'vitest'

import { resolveCleanSeedDate } from './clean-seed-resolver'

/**
 * TASK-871 Slice 2B — resolveCleanSeedDate integrity check tests.
 *
 * The resolver uses a single SQL query per candidate day with three
 * sub-selects: `settlement_legs`, `income_payments_normalized`,
 * `expense_payments_normalized`. We mock the `client.query` to return
 * deterministic movement counts per day under test.
 */

interface MockDay {
  date: string
  settlementLegs?: number
  incomePayments?: number
  expensePayments?: number
}

const createMockClient = (days: MockDay[]) => {
  const byDate = new Map(days.map(d => [d.date, d]))
  let callCount = 0

  const lookup = (date: string) => {
    const day = byDate.get(date) ?? { date }

    return {
      settlement_legs: String(day.settlementLegs ?? 0),
      income_payments: String(day.incomePayments ?? 0),
      expense_payments: String(day.expensePayments ?? 0)
    }
  }

  return {
    query: async (_sql: string, params: readonly unknown[]) => {
      callCount += 1
      const balanceDate = params[1] as string

      return { rows: [lookup(balanceDate)] }
    },
    get callCount() {
      return callCount
    }
  }
}

describe('resolveCleanSeedDate — TASK-871 Slice 2B', () => {
  it('returns ok=true daysExpanded=0 when candidate is already clean', async () => {
    const client = createMockClient([{ date: '2026-05-05' }])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.cleanSeed).toBe('2026-05-05')
      expect(result.originalSeed).toBe('2026-05-05')
      expect(result.daysExpanded).toBe(0)
      expect(result.movementBlockers).toHaveLength(0)
    }

    expect(client.callCount).toBe(1)
  })

  it('expands 1 day backward when candidate has settlement legs', async () => {
    const client = createMockClient([
      { date: '2026-05-05', settlementLegs: 3 },
      { date: '2026-05-04' }
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-corp-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.cleanSeed).toBe('2026-05-04')
      expect(result.originalSeed).toBe('2026-05-05')
      expect(result.daysExpanded).toBe(1)
      expect(result.movementBlockers).toHaveLength(1)
      expect(result.movementBlockers[0]).toEqual({
        balanceDate: '2026-05-05',
        settlementLegs: 3,
        incomePayments: 0,
        expensePayments: 0
      })
    }
  })

  it('detects income payments alone as movements (no settlement legs needed)', async () => {
    const client = createMockClient([
      { date: '2026-05-05', incomePayments: 1 },
      { date: '2026-05-04' }
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'global66-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.cleanSeed).toBe('2026-05-04')
      expect(result.daysExpanded).toBe(1)
      expect(result.movementBlockers[0].incomePayments).toBe(1)
    }
  })

  it('detects expense payments alone as movements', async () => {
    const client = createMockClient([
      { date: '2026-05-05', expensePayments: 2 },
      { date: '2026-05-04' }
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.cleanSeed).toBe('2026-05-04')
      expect(result.movementBlockers[0].expensePayments).toBe(2)
    }
  })

  it('expands multiple days when run of consecutive dirty days', async () => {
    const client = createMockClient([
      { date: '2026-05-05', settlementLegs: 2 },
      { date: '2026-05-04', settlementLegs: 1 },
      { date: '2026-05-03', incomePayments: 1 },
      { date: '2026-05-02', expensePayments: 1 },
      { date: '2026-05-01' } // clean
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-corp-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.cleanSeed).toBe('2026-05-01')
      expect(result.daysExpanded).toBe(4)
      expect(result.movementBlockers).toHaveLength(4)
      expect(result.movementBlockers.map(b => b.balanceDate)).toEqual([
        '2026-05-05',
        '2026-05-04',
        '2026-05-03',
        '2026-05-02'
      ])
    }
  })

  it('respects maxExpandDays bound and returns exceeded_max_expand', async () => {
    // All days dirty within the bound.
    const days: Array<{ date: string; settlementLegs: number }> = []
    const start = new Date('2026-05-05T00:00:00.000Z')

    for (let i = 0; i <= 5; i++) {
      days.push({
        date: new Date(start.getTime() - i * 86_400_000).toISOString().slice(0, 10),
        settlementLegs: 1
      })
    }

    const client = createMockClient(days)

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-clp',
      candidateSeedDate: '2026-05-05',
      maxExpandDays: 3
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('exceeded_max_expand')
      expect(result.originalSeed).toBe('2026-05-05')
      expect(result.daysExpanded).toBe(3)
      // walked through 4 days (5,4,3,2) before giving up.
      expect(result.movementBlockers).toHaveLength(4)
      expect(result.lastCheckedSeed).toBe('2026-05-02')
    }
  })

  it('defaults maxExpandDays to 30 when not provided', async () => {
    // All 32 days dirty so the default bound kicks in.
    const days: Array<{ date: string; settlementLegs: number }> = []
    const start = new Date('2026-05-13T00:00:00.000Z')

    for (let i = 0; i <= 32; i++) {
      days.push({
        date: new Date(start.getTime() - i * 86_400_000).toISOString().slice(0, 10),
        settlementLegs: 1
      })
    }

    const client = createMockClient(days)

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-clp',
      candidateSeedDate: '2026-05-13'
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('exceeded_max_expand')
      expect(result.daysExpanded).toBe(30)
    }
  })

  it('detects mixed movement types in same day', async () => {
    const client = createMockClient([
      {
        date: '2026-05-05',
        settlementLegs: 2,
        incomePayments: 1,
        expensePayments: 3
      },
      { date: '2026-05-04' }
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'global66-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.movementBlockers[0]).toEqual({
        balanceDate: '2026-05-05',
        settlementLegs: 2,
        incomePayments: 1,
        expensePayments: 3
      })
    }
  })

  it('crosses month boundary correctly when expanding backward', async () => {
    const client = createMockClient([
      { date: '2026-05-01', settlementLegs: 1 },
      { date: '2026-04-30' } // clean
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-clp',
      candidateSeedDate: '2026-05-01'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.cleanSeed).toBe('2026-04-30')
      expect(result.daysExpanded).toBe(1)
    }
  })

  it('reproduces the 2026-05-13 incident shape (the bug class this resolver closes)', async () => {
    // Simulates the real incident: cron runs on 2026-05-13 with lookback=7
    // → candidate seed = 2026-05-05. Day has 3 settlement legs (the real
    // outflows that became invisible). Walking back, 2026-05-04 is clean.
    const client = createMockClient([
      { date: '2026-05-05', settlementLegs: 3 }, // santander-corp-clp + santander-clp + global66-clp shape
      { date: '2026-05-04' }
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-corp-clp',
      candidateSeedDate: '2026-05-05'
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      // Caller (cron handler) now passes cleanSeed=2026-05-04 to
      // rematerializeAccountBalanceRange, which materializes from
      // 2026-05-05 onward INCLUSIVE — fixing the seed blind spot.
      expect(result.cleanSeed).toBe('2026-05-04')
      expect(result.daysExpanded).toBe(1)
    }
  })

  it('handles maxExpandDays=0 (no expansion allowed, only original candidate)', async () => {
    const client = createMockClient([
      { date: '2026-05-05', settlementLegs: 1 }
    ])

    const result = await resolveCleanSeedDate({
      client: client as never,
      accountId: 'santander-clp',
      candidateSeedDate: '2026-05-05',
      maxExpandDays: 0
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.reason).toBe('exceeded_max_expand')
      expect(result.daysExpanded).toBe(0)
      expect(result.movementBlockers).toHaveLength(1)
      expect(result.lastCheckedSeed).toBe('2026-05-05')
    }
  })
})
