import { describe, expect, it } from 'vitest'

import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

import { derivePayrollParticipationPolicy } from './policy'
import type { PayrollParticipationFacts } from './types'

const PERIOD_START = '2026-05-01'
const PERIOD_END = '2026-05-31'

const baseFacts = (overrides: Partial<PayrollParticipationFacts> = {}): PayrollParticipationFacts => ({
  memberId: 'member-felipe',
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  compensationEffectiveFrom: '2024-01-01',
  compensationEffectiveTo: null,
  onboardingStartDate: null,
  exitEligibility: null,
  ...overrides
})

const fullPeriodExitEligibility = (memberId = 'member-felipe'): WorkforceExitPayrollEligibilityWindow => ({
  memberId,
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  eligibleFrom: PERIOD_START,
  eligibleTo: PERIOD_END,
  relationshipStatus: 'active',
  exitCaseId: null,
  exitCasePublicId: null,
  exitLane: null,
  exitStatus: null,
  projectionPolicy: 'full_period',
  cutoffDate: null,
  warnings: []
})

describe('derivePayrollParticipationPolicy', () => {
  // ----- Full period (canonical baseline) -----

  it('full month for a member fully eligible across the period', () => {
    const window = derivePayrollParticipationPolicy(baseFacts())

    expect(window.policy).toBe('full_period')
    expect(window.reasonCodes).toEqual(['full_period'])
    expect(window.prorationFactor).toBe(1)
    expect(window.eligibleFrom).toBe(PERIOD_START)
    expect(window.eligibleTo).toBe(PERIOD_END)
    expect(window.warnings).toEqual([])
    expect(window.prorationBasis).toBe('weekdays')
  })

  it('full month when exitEligibility is provided but indicates full_period', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({ exitEligibility: fullPeriodExitEligibility() })
    )

    expect(window.policy).toBe('full_period')
    expect(window.prorationFactor).toBe(1)
    expect(window.exitEligibility).not.toBeNull()
    expect(window.exitEligibility?.projectionPolicy).toBe('full_period')
  })

  // ----- Felipe-like (entry mid-period) -----

  it('Felipe-like: effective_from = May 13 prorates from start, weekdays basis', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({ compensationEffectiveFrom: '2026-05-13' })
    )

    expect(window.policy).toBe('prorate_from_start')
    expect(window.reasonCodes).toEqual(['entry_mid_period'])
    expect(window.eligibleFrom).toBe('2026-05-13')
    expect(window.eligibleTo).toBe(PERIOD_END)

    /*
     * May 2026: 21 weekdays total. May 13 (Wed) → May 31 (Sun): 14 weekdays
     * (May 13, 14, 15, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29). Period has
     * 21 weekdays (May 1 (Fri), 4-8, 11-15, 18-22, 25-29 = 1 + 5 + 5 + 5 + 5
     * = 21). Factor = 13/21.
     *
     * Note: this assert pins the canonical weekdays semantic — Mon=1..Fri=5
     * inclusive, weekends skipped. If we ever swap to operational calendar,
     * this test changes by design.
     */
    expect(window.prorationFactor).toBeCloseTo(13 / 21, 6)
    expect(window.prorationFactor).toBeGreaterThan(0)
    expect(window.prorationFactor).toBeLessThan(1)
  })

  it('entry on periodStart counts as full_period (boundary case)', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({ compensationEffectiveFrom: PERIOD_START })
    )

    expect(window.policy).toBe('full_period')
    expect(window.prorationFactor).toBe(1)
  })

  it('entry strictly after periodEnd → exclude with relationship_not_started reason', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({ compensationEffectiveFrom: '2026-06-15' })
    )

    expect(window.policy).toBe('exclude')
    expect(window.reasonCodes).toContain('relationship_not_started')
    expect(window.eligibleFrom).toBeNull()
    expect(window.eligibleTo).toBeNull()
    expect(window.prorationFactor).toBe(0)
  })

  // ----- Exit mid-period (compensation.effective_to bounded) -----

  it('compensation.effective_to inside period → prorate_until_end', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({ compensationEffectiveTo: '2026-05-20' })
    )

    expect(window.policy).toBe('prorate_until_end')
    expect(window.reasonCodes).toContain('exit_mid_period')
    expect(window.eligibleFrom).toBe(PERIOD_START)
    expect(window.eligibleTo).toBe('2026-05-20')
    expect(window.prorationFactor).toBeGreaterThan(0)
    expect(window.prorationFactor).toBeLessThan(1)
  })

  it('compensation.effective_to before periodStart → exclude with relationship_ended', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({ compensationEffectiveTo: '2026-04-15' })
    )

    expect(window.policy).toBe('exclude')
    expect(window.reasonCodes).toContain('relationship_ended')
    expect(window.eligibleFrom).toBeNull()
    expect(window.prorationFactor).toBe(0)
  })

  // ----- Entry + exit in same period (Felipe + Maria mixed case) -----

  it('entry AND exit both inside the period → prorate_bounded_window', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({
        compensationEffectiveFrom: '2026-05-13',
        compensationEffectiveTo: '2026-05-25'
      })
    )

    expect(window.policy).toBe('prorate_bounded_window')
    expect(window.reasonCodes).toContain('entry_mid_period')
    expect(window.reasonCodes).toContain('exit_mid_period')
    expect(window.eligibleFrom).toBe('2026-05-13')
    expect(window.eligibleTo).toBe('2026-05-25')
  })

  // ----- TASK-890 exit composition -----

  it('TASK-890 exclude_entire_period → exclude regardless of compensation', () => {
    const exit: WorkforceExitPayrollEligibilityWindow = {
      ...fullPeriodExitEligibility(),
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_entire_period',
      cutoffDate: '2026-04-10',
      exitLane: 'internal_payroll',
      exitStatus: 'executed',
      relationshipStatus: 'ended'
    }

    const window = derivePayrollParticipationPolicy(baseFacts({ exitEligibility: exit }))

    expect(window.policy).toBe('exclude')
    expect(window.eligibleFrom).toBeNull()
    expect(window.eligibleTo).toBeNull()
    expect(window.prorationFactor).toBe(0)
    expect(window.reasonCodes).toContain('relationship_ended')
    expect(window.exitEligibility).toBe(exit)
  })

  it('Maria-like: TASK-890 exclude_from_cutoff inside period → exclude', () => {
    /*
     * external_payroll lane (Deel/EOR) with cutoffDate before periodStart →
     * member was Greenhouse-managed only until cutoff. Excluded entire period.
     */
    const exit: WorkforceExitPayrollEligibilityWindow = {
      ...fullPeriodExitEligibility('member-maria'),
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_from_cutoff',
      cutoffDate: '2026-04-30',
      exitLane: 'external_payroll',
      exitStatus: 'approved',
      relationshipStatus: 'scheduled_exit'
    }

    const window = derivePayrollParticipationPolicy(
      baseFacts({ memberId: 'member-maria', exitEligibility: exit })
    )

    expect(window.policy).toBe('exclude')
    expect(window.reasonCodes).toContain('external_payroll_exit')
    expect(window.exitEligibility?.exitLane).toBe('external_payroll')
  })

  it('TASK-890 partial_until_cutoff inside period → prorate_until_end with exit_mid_period', () => {
    const exit: WorkforceExitPayrollEligibilityWindow = {
      ...fullPeriodExitEligibility(),
      eligibleFrom: PERIOD_START,
      eligibleTo: '2026-05-20',
      projectionPolicy: 'partial_until_cutoff',
      cutoffDate: '2026-05-20',
      exitLane: 'internal_payroll',
      exitStatus: 'executed',
      relationshipStatus: 'ended'
    }

    const window = derivePayrollParticipationPolicy(baseFacts({ exitEligibility: exit }))

    expect(window.policy).toBe('prorate_until_end')
    expect(window.eligibleTo).toBe('2026-05-20')
    expect(window.reasonCodes).toContain('exit_mid_period')
  })

  it('Felipe + TASK-890 partial_until_cutoff → prorate_bounded_window combining entry + exit', () => {
    const exit: WorkforceExitPayrollEligibilityWindow = {
      ...fullPeriodExitEligibility(),
      eligibleFrom: PERIOD_START,
      eligibleTo: '2026-05-25',
      projectionPolicy: 'partial_until_cutoff',
      cutoffDate: '2026-05-25',
      exitLane: 'internal_payroll',
      exitStatus: 'executed',
      relationshipStatus: 'ended'
    }

    const window = derivePayrollParticipationPolicy(
      baseFacts({ compensationEffectiveFrom: '2026-05-13', exitEligibility: exit })
    )

    expect(window.policy).toBe('prorate_bounded_window')
    expect(window.eligibleFrom).toBe('2026-05-13')
    expect(window.eligibleTo).toBe('2026-05-25')
    expect(window.reasonCodes).toContain('entry_mid_period')
    expect(window.reasonCodes).toContain('exit_mid_period')
  })

  // ----- Degraded composition (TASK-890 disabled / failed) -----

  it('TASK-890 disabled: warning emitted, entry side computed, exit side null', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({
        compensationEffectiveFrom: '2026-05-13',
        exitResolverDegraded: { reason: 'disabled' }
      })
    )

    expect(window.policy).toBe('prorate_from_start')
    expect(window.exitEligibility).toBeNull()
    expect(window.warnings.length).toBe(1)
    expect(window.warnings[0].code).toBe('exit_resolver_disabled')
    expect(window.warnings[0].severity).toBe('warning')
  })

  it('TASK-890 failed: warning carries detail evidence', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({
        exitResolverDegraded: { reason: 'failed', detail: 'PG connection timeout' }
      })
    )

    expect(window.warnings.length).toBe(1)
    expect(window.warnings[0].code).toBe('exit_resolver_failed')
    expect(window.warnings[0].evidence).toEqual({ detail: 'PG connection timeout' })
  })

  // ----- Source date disagreement (V1.1 data-driven trigger) -----

  it('onboarding start_date matches compensation effective_from → no warning', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({
        compensationEffectiveFrom: '2026-05-13',
        onboardingStartDate: '2026-05-13'
      })
    )

    expect(window.warnings.filter(w => w.code === 'source_date_disagreement')).toHaveLength(0)
  })

  it('onboarding start_date differs > 7 days from compensation → source_date_disagreement warning', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({
        compensationEffectiveFrom: '2026-05-13',
        onboardingStartDate: '2026-05-25' /* 12 days off */
      })
    )

    const drift = window.warnings.find(w => w.code === 'source_date_disagreement')

    expect(drift).toBeDefined()
    expect(drift?.evidence).toMatchObject({
      compensationEffectiveFrom: '2026-05-13',
      onboardingStartDate: '2026-05-25',
      diffDays: 12
    })
    /*
     * V1 hard rule: warning emitted but compensation.effective_from stays the
     * canonical entry source. Policy reflects comp dating, not onboarding.
     */
    expect(window.eligibleFrom).toBe('2026-05-13')
  })

  it('onboarding diff within tolerance (≤ 7 days) → no warning', () => {
    const window = derivePayrollParticipationPolicy(
      baseFacts({
        compensationEffectiveFrom: '2026-05-13',
        onboardingStartDate: '2026-05-15' /* 2 days */
      })
    )

    expect(window.warnings.filter(w => w.code === 'source_date_disagreement')).toHaveLength(0)
  })

  // ----- Determinism + idempotency -----

  it('is deterministic on identical facts (call twice → equal output)', () => {
    const facts = baseFacts({
      compensationEffectiveFrom: '2026-05-13',
      onboardingStartDate: '2026-05-20',
      exitEligibility: fullPeriodExitEligibility()
    })

    const a = derivePayrollParticipationPolicy(facts)
    const b = derivePayrollParticipationPolicy(facts)

    expect(a).toEqual(b)
  })

  // ----- Régimen coverage (sanity: policy is régimen-agnostic) -----

  it('régimen is irrelevant to policy — same facts produce same window for any régimen', () => {
    /*
     * The policy resolver is régimen-agnostic by design. Consumers apply the
     * factor differently per régimen (Slice 3-4 integration), but the
     * participation decision itself never branches on régimen. This test
     * pins that invariant.
     */
    const factsA = baseFacts({ memberId: 'cl-honorarios', compensationEffectiveFrom: '2026-05-13' })
    const factsB = baseFacts({ memberId: 'intl-internal', compensationEffectiveFrom: '2026-05-13' })

    const a = derivePayrollParticipationPolicy(factsA)
    const b = derivePayrollParticipationPolicy(factsB)

    expect(a.policy).toBe(b.policy)
    expect(a.prorationFactor).toBe(b.prorationFactor)
    expect(a.eligibleFrom).toBe(b.eligibleFrom)
    expect(a.eligibleTo).toBe(b.eligibleTo)
  })
})
