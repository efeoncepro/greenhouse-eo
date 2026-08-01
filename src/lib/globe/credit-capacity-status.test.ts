import { describe, expect, it } from 'vitest'

import { GlobeCreditCapacityStatusError, parseCapacityStatus } from './credit-capacity-status'

const historicalLedger = { allocated: 500000, reserved: 10, spent: 120, adjusted: 0, available: 499870,
  asOf: '2026-08-01T12:00:00.000Z' }

const period = { schemaVersion: '1', timezone: 'UTC', start: '2026-08-01T00:00:00.000Z',
  end: '2026-09-01T00:00:00.000Z' }

const coverage = { periodStart: period.start, periodEnd: period.end, candidateCount: 1 }

describe('Globe credit capacity operator projection', () => {
  it('allowlists the decision fields and keeps historical ledger separate from effective capacity', () => {
    const status = parseCapacityStatus({
      schemaVersion: '1', audience: 'operator', state: 'ready', historicalLedger,
      decision: { schemaVersion: '2', workspaceId: 'hidden', policyVersion: 'hidden', requestedCredits: 10,
        allowed: true, period, monthly: { cap: 100, spent: 20, held: 10, remaining: 70 },
        eligibleFunding: 70, effectiveAvailable: 70, blockers: [], coverage, freshnessSeconds: 2,
        asOf: historicalLedger.asOf, fundingBreakdown: [{ grantId: 'hidden' }] }
    })

    expect(status.historicalLedger.available).toBe(499870)
    expect(status.effectiveAvailable).toBe(70)
    expect(JSON.stringify(status)).not.toContain('hidden')
  })

  it('keeps unknown amounts absent instead of converting missing authority to zero', () => {
    const status = parseCapacityStatus({ schemaVersion: '1', audience: 'operator', state: 'unknown', historicalLedger,
      unavailable: { period, blockers: ['policy_unavailable'], coverage: { ...coverage, candidateCount: 0 },
        freshnessSeconds: 0, asOf: historicalLedger.asOf } })

    expect(status.state).toBe('unknown')
    expect(status.effectiveAvailable).toBeUndefined()
    expect(status.monthly).toBeUndefined()
  })

  it('fails closed on unknown blocker or malformed numbers', () => {
    expect(() => parseCapacityStatus({ schemaVersion: '1', audience: 'operator', state: 'unknown', historicalLedger,
      unavailable: { period, blockers: ['raw sql'], coverage, freshnessSeconds: 0,
        asOf: historicalLedger.asOf } })).toThrow(GlobeCreditCapacityStatusError)
  })
})
