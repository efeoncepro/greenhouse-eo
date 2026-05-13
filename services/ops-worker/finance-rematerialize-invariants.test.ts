import { describe, expect, it } from 'vitest'

import { resolveCleanSeedDate } from '@/lib/finance/account-balances-clean-seed-resolver'

import { computeRollingRematerializationWindow } from './finance-rematerialize-seed'

/**
 * TASK-871 — End-to-end anti-regression invariants.
 *
 * These tests pin the structural contract that the daily cron
 * `ops-finance-rematerialize-balances` honors:
 *
 *   Invariant A. The seedDate produced by
 *     `computeRollingRematerializationWindow` always equals
 *     `materializeStartDate − 1 day`.
 *
 *   Invariant B. After running the candidate seedDate through
 *     `resolveCleanSeedDate`, the resulting `cleanSeed` (when `ok=true`)
 *     never has canonical movements (settlement legs, normalized income
 *     payments, normalized expense payments). The day with movements ALWAYS
 *     ends up inside the materialized range — never as a mute anchor.
 *
 *   Invariant C. When integrity check exceeds maxExpandDays, no
 *     materialization is attempted. The caller MUST escalate to
 *     historical_restatement (the cron handler skips the account and emits
 *     `captureWithDomain('finance', ...)` + outbox event).
 *
 * If these invariants break, the cron will silently lose movements on the
 * boundary day exactly like the 2026-05-13 incident did. This file is the
 * contract.
 */

interface MockDay {
  date: string
  settlementLegs?: number
  incomePayments?: number
  expensePayments?: number
}

const createMockClient = (days: MockDay[]) => {
  const byDate = new Map(days.map(d => [d.date, d]))

  return {
    query: async (_sql: string, params: readonly unknown[]) => {
      const day = byDate.get(params[1] as string) ?? { date: '' }

      return {
        rows: [{
          settlement_legs: String(day.settlementLegs ?? 0),
          income_payments: String(day.incomePayments ?? 0),
          expense_payments: String(day.expensePayments ?? 0)
        }]
      }
    }
  }
}

describe('TASK-871 — end-to-end rolling rematerialize invariants', () => {
  describe('Invariant A: seedDate is always one day BEFORE the materialized window', () => {
    it('holds for the 2026-05-13 incident scenario (lookback=7)', () => {
      const today = new Date('2026-05-13T00:00:00.000Z')
      const window = computeRollingRematerializationWindow(today, 7)

      const seedPlusOne = new Date(`${window.seedDate}T00:00:00.000Z`)

      seedPlusOne.setUTCDate(seedPlusOne.getUTCDate() + 1)

      expect(seedPlusOne.toISOString().slice(0, 10)).toBe(window.materializeStartDate)
      expect(window.materializeStartDate).toBe(window.targetStartDate)
    })

    it('holds across a 30-iteration randomized property check (today + lookback)', () => {
      const baseTime = Date.UTC(2025, 0, 1)

      for (let i = 0; i < 30; i++) {
        const offsetDays = Math.floor(Math.random() * 730)
        const lookback = 1 + Math.floor(Math.random() * 30)
        const today = new Date(baseTime + offsetDays * 86_400_000)

        const window = computeRollingRematerializationWindow(today, lookback)

        const seedPlusOne = new Date(`${window.seedDate}T00:00:00.000Z`)

        seedPlusOne.setUTCDate(seedPlusOne.getUTCDate() + 1)

        expect(seedPlusOne.toISOString().slice(0, 10)).toBe(window.materializeStartDate)
        expect(window.materializeStartDate).toBe(window.targetStartDate)
        expect(window.materializeEndDate).toBe(today.toISOString().slice(0, 10))
      }
    })
  })

  describe('Invariant B: cleanSeed never has canonical movements', () => {
    it('reproduces the 2026-05-13 incident: 2026-05-05 has movements → resolver returns clean prior day', async () => {
      const today = new Date('2026-05-13T00:00:00.000Z')
      const window = computeRollingRematerializationWindow(today, 7)

      // window.seedDate = 2026-05-05 — the day with real settlement legs
      // that became invisible in the incident.
      expect(window.seedDate).toBe('2026-05-05')

      const client = createMockClient([
        { date: '2026-05-05', settlementLegs: 3 }, // the incident day
        { date: '2026-05-04' } // movement-free anchor
      ])

      const integrity = await resolveCleanSeedDate({
        client: client as never,
        accountId: 'santander-corp-clp',
        candidateSeedDate: window.seedDate
      })

      expect(integrity.ok).toBe(true)

      if (integrity.ok) {
        expect(integrity.cleanSeed).toBe('2026-05-04')
        // The day with movements (2026-05-05) is NO LONGER the seed. The
        // rematerializer will START at 2026-05-05 (cleanSeed + 1) and
        // contabilize those settlement legs that previously vanished.
        expect(integrity.cleanSeed).not.toBe(window.seedDate)
      }
    })

    it('returns cleanSeed unchanged when candidate has no movements', async () => {
      const client = createMockClient([{ date: '2026-05-05' }])

      const integrity = await resolveCleanSeedDate({
        client: client as never,
        accountId: 'santander-clp',
        candidateSeedDate: '2026-05-05'
      })

      expect(integrity.ok).toBe(true)

      if (integrity.ok) {
        expect(integrity.cleanSeed).toBe('2026-05-05')
        expect(integrity.daysExpanded).toBe(0)
      }
    })

    it('keeps expanding past month boundary when consecutive dirty days', async () => {
      const client = createMockClient([
        { date: '2026-05-02', settlementLegs: 1 },
        { date: '2026-05-01', incomePayments: 1 },
        { date: '2026-04-30', expensePayments: 1 },
        { date: '2026-04-29' } // movement-free anchor
      ])

      const integrity = await resolveCleanSeedDate({
        client: client as never,
        accountId: 'global66-clp',
        candidateSeedDate: '2026-05-02'
      })

      expect(integrity.ok).toBe(true)

      if (integrity.ok) {
        expect(integrity.cleanSeed).toBe('2026-04-29')
        expect(integrity.daysExpanded).toBe(3)
      }
    })
  })

  describe('Invariant C: integrity overflow escalates instead of corrupting state', () => {
    it('returns ok=false when expansion exceeds maxExpand', async () => {
      // All days within the bound are dirty.
      const days: MockDay[] = []

      for (let i = 0; i <= 10; i++) {
        days.push({
          date: new Date(Date.UTC(2026, 4, 5) - i * 86_400_000)
            .toISOString().slice(0, 10),
          settlementLegs: 1
        })
      }

      const client = createMockClient(days)

      const integrity = await resolveCleanSeedDate({
        client: client as never,
        accountId: 'santander-clp',
        candidateSeedDate: '2026-05-05',
        maxExpandDays: 5
      })

      expect(integrity.ok).toBe(false)

      if (!integrity.ok) {
        expect(integrity.reason).toBe('exceeded_max_expand')
        // Caller skips rematerialize — no silent state corruption.
      }
    })
  })

  describe('Invariant D: the contract composes — window + resolver always produce a safe seed or escalate', () => {
    it('regression for the 2026-05-13 incident shape (all 3 affected accounts)', async () => {
      const today = new Date('2026-05-13T00:00:00.000Z')
      const window = computeRollingRematerializationWindow(today, 7)

      for (const accountId of ['santander-corp-clp', 'santander-clp', 'global66-clp']) {
        const client = createMockClient([
          { date: window.seedDate, settlementLegs: 5 }, // simulate incident shape
          { date: '2026-05-04' }
        ])

        const integrity = await resolveCleanSeedDate({
          client: client as never,
          accountId,
          candidateSeedDate: window.seedDate
        })

        // Either we found a clean anchor OR we escalated. Never a silent
        // anchor with movements.
        if (integrity.ok) {
          expect(integrity.cleanSeed).not.toBe(window.seedDate)
        } else {
          expect(integrity.reason).toBe('exceeded_max_expand')
        }
      }
    })
  })
})
