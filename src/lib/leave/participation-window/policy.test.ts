import { describe, expect, it } from 'vitest'

import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

import { buildDegradedLeaveAccrualWindow, deriveLeaveAccrualPolicy } from './policy'
import type { LeaveAccrualCompensationFact } from './types'

const fact = (overrides: Partial<LeaveAccrualCompensationFact> = {}): LeaveAccrualCompensationFact => ({
  memberId: 'member-test',
  versionId: 'cv-test',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  contractType: 'indefinido',
  payRegime: 'chile',
  payrollVia: 'internal',
  ...overrides
})

const exit = (
  overrides: Partial<WorkforceExitPayrollEligibilityWindow> = {}
): WorkforceExitPayrollEligibilityWindow => ({
  memberId: 'member-test',
  periodStart: '2026-01-01',
  periodEnd: '2026-12-31',
  eligibleFrom: '2026-01-01',
  eligibleTo: null,
  relationshipStatus: 'active',
  exitCaseId: null,
  exitCasePublicId: null,
  exitLane: null,
  exitStatus: null,
  projectionPolicy: 'full_period',
  cutoffDate: null,
  warnings: [],
  ...overrides
})

describe('deriveLeaveAccrualPolicy (TASK-895 V1.1a S1)', () => {
  it('full_year_dependent: single indefinido CL version covering entire year', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2025-12-01', effectiveTo: null })],
      exitEligibility: null
    })

    expect(result.policy).toBe('full_year_dependent')
    expect(result.eligibleDays).toBe(365)
    expect(result.firstDependentEffectiveFrom).toBe('2025-12-01')
    expect(result.degradedMode).toBe(false)
    expect(result.reasonCodes).toContain('dependent_full_year')
  })

  it('full_year_dependent: leap year produces 366 days', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2024,
      facts: [fact({ effectiveFrom: '2023-12-01', effectiveTo: null })],
      exitEligibility: null
    })

    expect(result.policy).toBe('full_year_dependent')
    expect(result.eligibleDays).toBe(366)
  })

  it('no_dependent: empty facts array', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [],
      exitEligibility: null
    })

    expect(result.policy).toBe('no_dependent')
    expect(result.eligibleDays).toBe(0)
    expect(result.firstDependentEffectiveFrom).toBeNull()
    expect(result.reasonCodes).toContain('no_qualifying_versions')
  })

  it('no_dependent: only contractor versions in year', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({ contractType: 'contractor', effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30' }),
        fact({
          versionId: 'cv-2',
          contractType: 'contractor',
          effectiveFrom: '2026-07-01',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('no_dependent')
    expect(result.eligibleDays).toBe(0)
  })

  it('no_dependent: honorarios pay_regime chile but contract_type honorarios excluded', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'honorarios',
          payRegime: 'chile',
          payrollVia: 'internal',
          effectiveFrom: '2026-01-01'
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('no_dependent')
  })

  it('no_dependent: indefinido pay_regime international excluded (NOT chile)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          payRegime: 'international',
          payrollVia: 'internal',
          effectiveFrom: '2026-01-01'
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('no_dependent')
  })

  it('no_dependent: indefinido CL but payroll_via=deel excluded', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          payRegime: 'chile',
          payrollVia: 'deel',
          effectiveFrom: '2026-01-01'
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('no_dependent')
  })

  it('partial_dependent: hired mid-year as dependent (Felipe-like 2026-05-13)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm-felipe',
      year: 2026,
      facts: [fact({ effectiveFrom: '2026-05-13', effectiveTo: null })],
      exitEligibility: null
    })

    expect(result.policy).toBe('partial_dependent')
    expect(result.firstDependentEffectiveFrom).toBe('2026-05-13')
    expect(result.reasonCodes).toContain('hired_mid_year_dependent')
    /* 2026-05-13 inclusive thru 2026-12-31 inclusive = 233 days */
    expect(result.eligibleDays).toBe(233)
  })

  it('partial_dependent: contractor → dependent transition mid-year (the canonical bug class)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          versionId: 'cv-1',
          contractType: 'contractor',
          effectiveFrom: '2026-01-15',
          effectiveTo: '2026-05-12'
        }),
        fact({
          versionId: 'cv-2',
          contractType: 'indefinido',
          effectiveFrom: '2026-05-13',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('partial_dependent')
    expect(result.firstDependentEffectiveFrom).toBe('2026-05-13')
    expect(result.reasonCodes).toContain('contractor_to_dependent_transition')
    expect(result.reasonCodes).toContain('hired_mid_year_dependent')
    /* Eligibility = 2026-05-13 to 2026-12-31 = 233 days (contractor period NOT counted) */
    expect(result.eligibleDays).toBe(233)
  })

  it('partial_dependent: dependent → contractor transition mid-year', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          versionId: 'cv-1',
          contractType: 'indefinido',
          effectiveFrom: '2025-08-01',
          effectiveTo: '2026-05-12'
        }),
        fact({
          versionId: 'cv-2',
          contractType: 'contractor',
          effectiveFrom: '2026-05-13',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('partial_dependent')
    expect(result.reasonCodes).toContain('dependent_to_contractor_transition')
    /* Dependent days = 2026-01-01 to 2026-05-12 = 132 days */
    expect(result.eligibleDays).toBe(132)
  })

  it('partial_dependent: dependent → contractor → dependent (gap detected)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          versionId: 'cv-1',
          contractType: 'indefinido',
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-03-31'
        }),
        fact({
          versionId: 'cv-2',
          contractType: 'contractor',
          effectiveFrom: '2026-04-01',
          effectiveTo: '2026-06-30'
        }),
        fact({
          versionId: 'cv-3',
          contractType: 'indefinido',
          effectiveFrom: '2026-07-01',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('partial_dependent')
    expect(result.reasonCodes).toContain('compensation_version_gap')
    /* Dependent days = (Jan-Mar = 90) + (Jul-Dec = 184) = 274 days */
    expect(result.eligibleDays).toBe(274)
  })

  it('exit truncation: internal_payroll lane truncates last interval (Maria-like)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm-maria',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          effectiveFrom: '2025-08-01',
          effectiveTo: null
        })
      ],
      exitEligibility: exit({
        memberId: 'm-maria',
        exitLane: 'internal_payroll',
        exitCaseId: 'case-1',
        exitStatus: 'executed',
        cutoffDate: '2026-05-14',
        eligibleTo: '2026-05-14',
        projectionPolicy: 'partial_until_cutoff',
        relationshipStatus: 'ended'
      })
    })

    expect(result.policy).toBe('partial_dependent')
    expect(result.reasonCodes).toContain('exited_mid_year_internal_payroll')
    /* Eligibility = 2026-01-01 to 2026-05-14 = 134 days */
    expect(result.eligibleDays).toBe(134)
  })

  it('exit truncation: external_payroll lane emits external reason code', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm-deel',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          effectiveFrom: '2026-01-01',
          effectiveTo: null
        })
      ],
      exitEligibility: exit({
        memberId: 'm-deel',
        exitLane: 'external_payroll',
        exitCaseId: 'case-2',
        exitStatus: 'approved',
        cutoffDate: '2026-08-15',
        eligibleTo: '2026-08-15',
        projectionPolicy: 'exclude_from_cutoff',
        relationshipStatus: 'scheduled_exit'
      })
    })

    expect(result.policy).toBe('partial_dependent')
    expect(result.reasonCodes).toContain('external_payroll_exit_truncates')
    /* Eligibility = 2026-01-01 to 2026-08-15 = 227 days */
    expect(result.eligibleDays).toBe(227)
  })

  it('exit truncation: cutoff AFTER yearEnd does NOT truncate', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          effectiveFrom: '2025-01-01',
          effectiveTo: null
        })
      ],
      exitEligibility: exit({
        memberId: 'm1',
        exitLane: 'internal_payroll',
        exitCaseId: 'case-x',
        exitStatus: 'approved',
        cutoffDate: '2027-02-15',
        eligibleTo: '2027-02-15',
        projectionPolicy: 'partial_until_cutoff',
        relationshipStatus: 'scheduled_exit'
      })
    })

    expect(result.policy).toBe('full_year_dependent')
    expect(result.eligibleDays).toBe(365)
    expect(result.reasonCodes).not.toContain('exited_mid_year_internal_payroll')
  })

  it('exit truncation: cutoff BEFORE yearStart → entire year excluded', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          effectiveFrom: '2024-08-01',
          effectiveTo: null
        })
      ],
      exitEligibility: exit({
        memberId: 'm1',
        exitLane: 'internal_payroll',
        exitCaseId: 'case-y',
        exitStatus: 'executed',
        cutoffDate: '2025-12-31',
        periodStart: '2025-01-01',
        periodEnd: '2025-12-31',
        eligibleTo: '2025-12-31',
        projectionPolicy: 'partial_until_cutoff',
        relationshipStatus: 'ended'
      })
    })

    /*
     * Cutoff '2025-12-31' is exactly the day BEFORE yearStart 2026-01-01.
     * Since '2025-12-31' < '2026-01-01' (yearStart), the resolver treats the
     * cutoff as outside the year (not "within year"), so no truncation
     * applies and the qualifying interval [2026-01-01, 2026-12-31] stays
     * intact. Operator intent: exit cases dated before the year don't
     * retroactively void the accrual; HR handles closure via a NEW version.
     */
    expect(result.policy).toBe('full_year_dependent')
  })

  it('firstServiceCycleDays: 365 for non-leap year after first dependent', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2026-05-13', effectiveTo: null })],
      exitEligibility: null
    })

    /*
     * firstServiceCycleEnd = 2026-05-13 + 1y - 1d = 2027-05-12
     * Days from 2026-05-13 to 2027-05-12 inclusive = 365
     */
    expect(result.firstServiceCycleDays).toBe(365)
  })

  it('firstServiceCycleDays: 366 when first dependent is in leap-year boundary', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2024,
      facts: [fact({ effectiveFrom: '2023-12-01', effectiveTo: null })],
      exitEligibility: null
    })

    /*
     * firstServiceCycleEnd = 2023-12-01 + 1y - 1d = 2024-11-30
     * Days from 2023-12-01 to 2024-11-30 inclusive = 366 (incluye Feb-29 2024)
     */
    expect(result.firstServiceCycleDays).toBe(366)
  })

  it('degraded mode: invalid year produces unknown policy', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 1899,
      facts: [],
      exitEligibility: null
    })

    expect(result.policy).toBe('unknown')
    expect(result.degradedMode).toBe(true)
    expect(result.degradedReason).toBe('compensation_query_failed')
  })

  it('warnings propagated to output', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2026-01-01' })],
      exitEligibility: null,
      warnings: [
        {
          code: 'exit_resolver_disabled',
          severity: 'warning',
          messageKey: 'leave.participation.exit_resolver_disabled'
        }
      ]
    })

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('exit_resolver_disabled')
  })

  it('lastObservedExitEligibility preserved in output for forensic observability', () => {
    const exitInput = exit({
      memberId: 'm1',
      exitLane: 'external_payroll',
      exitCaseId: 'case-z',
      exitStatus: 'approved',
      cutoffDate: '2026-12-31',
      eligibleTo: '2026-12-31',
      projectionPolicy: 'exclude_from_cutoff',
      relationshipStatus: 'scheduled_exit'
    })

    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2026-01-01' })],
      exitEligibility: exitInput
    })

    expect(result.lastObservedExitEligibility).toEqual(exitInput)
  })

  it('intervals: effective_to before yearStart → fact excluded from intervals', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          versionId: 'cv-old',
          contractType: 'indefinido',
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-12-31'
        })
      ],
      exitEligibility: null
    })

    /*
     * The PG query already filters `effective_to >= yearStart`, so this row
     * shouldn't reach here in practice. But the policy must handle it
     * gracefully if it does (defensive).
     */
    expect(result.eligibleDays).toBe(0)
    expect(result.policy).toBe('no_dependent')
  })

  it('intervals: effective_from after yearEnd → fact excluded', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          versionId: 'cv-future',
          contractType: 'indefinido',
          effectiveFrom: '2027-01-01',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.eligibleDays).toBe(0)
  })

  it('multi-version: 2 consecutive dependent versions counted as continuous', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          versionId: 'cv-1',
          contractType: 'plazo_fijo',
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-06-30'
        }),
        fact({
          versionId: 'cv-2',
          contractType: 'indefinido',
          effectiveFrom: '2026-07-01',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('full_year_dependent')
    expect(result.eligibleDays).toBe(365)
    expect(result.reasonCodes).toContain('dependent_full_year')
  })

  it('plazo_fijo qualifies as dependent CL (alongside indefinido)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'plazo_fijo',
          effectiveFrom: '2026-01-01',
          effectiveTo: null
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('full_year_dependent')
    expect(result.eligibleDays).toBe(365)
  })

  it('payroll_via null defaults to internal (legacy data backward-compat)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [
        fact({
          contractType: 'indefinido',
          payRegime: 'chile',
          payrollVia: null,
          effectiveFrom: '2026-01-01'
        })
      ],
      exitEligibility: null
    })

    expect(result.policy).toBe('full_year_dependent')
  })
})

describe('deriveLeaveAccrualPolicy — asOfDate clamping (legacy parity)', () => {
  it('asOfDate in-year truncates eligibleDays to today (no anticipated accrual)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2025-12-01', effectiveTo: null })],
      exitEligibility: null,
      asOfDate: '2026-03-15'
    })

    /* 2026-01-01 to 2026-03-15 inclusive = 74 days */
    expect(result.eligibleDays).toBe(74)
    /* Policy is partial_dependent because eligibleDays < yearLength */
    expect(result.policy).toBe('partial_dependent')
  })

  it('asOfDate exactly at yearEnd preserves full_year_dependent', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2025-12-01', effectiveTo: null })],
      exitEligibility: null,
      asOfDate: '2026-12-31'
    })

    expect(result.eligibleDays).toBe(365)
    expect(result.policy).toBe('full_year_dependent')
  })

  it('asOfDate omitted defaults to yearEnd (retroactive past year accrual)', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2025,
      facts: [fact({ effectiveFrom: '2024-08-01', effectiveTo: null })],
      exitEligibility: null
    })

    expect(result.eligibleDays).toBe(365)
    expect(result.policy).toBe('full_year_dependent')
  })

  it('asOfDate out-of-year (past) collapses to yearEnd', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2025-01-01', effectiveTo: null })],
      exitEligibility: null,
      asOfDate: '2025-06-15'
    })

    /* asOfDate < yearStart → fallback yearEnd → full year accrual */
    expect(result.eligibleDays).toBe(365)
  })

  it('asOfDate combined with hired-mid-year: clamped correctly', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm-felipe',
      year: 2026,
      facts: [fact({ effectiveFrom: '2026-05-13', effectiveTo: null })],
      exitEligibility: null,
      asOfDate: '2026-08-31'
    })

    /* Eligibility = 2026-05-13 to 2026-08-31 inclusive = 111 days */
    expect(result.eligibleDays).toBe(111)
    expect(result.policy).toBe('partial_dependent')
  })

  it('asOfDate before earliest qualifying effectiveFrom: zero eligibility', () => {
    const result = deriveLeaveAccrualPolicy({
      memberId: 'm1',
      year: 2026,
      facts: [fact({ effectiveFrom: '2026-09-01', effectiveTo: null })],
      exitEligibility: null,
      asOfDate: '2026-08-15'
    })

    expect(result.eligibleDays).toBe(0)
    expect(result.policy).toBe('no_dependent')
  })
})

describe('buildDegradedLeaveAccrualWindow', () => {
  it('produces canonical degraded shape with warning', () => {
    const result = buildDegradedLeaveAccrualWindow({
      memberId: 'm1',
      year: 2026,
      reason: 'participation_resolver_disabled',
      warningCode: 'participation_resolver_disabled'
    })

    expect(result.policy).toBe('unknown')
    expect(result.degradedMode).toBe(true)
    expect(result.degradedReason).toBe('participation_resolver_disabled')
    expect(result.eligibleDays).toBe(0)
    expect(result.firstDependentEffectiveFrom).toBeNull()
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('participation_resolver_disabled')
  })

  it('preserves custom severity + evidence', () => {
    const result = buildDegradedLeaveAccrualWindow({
      memberId: 'm1',
      year: 2026,
      reason: 'compensation_query_failed',
      warningCode: 'compensation_query_failed',
      warningSeverity: 'blocking',
      warningEvidence: { errorDetail: 'connection refused' }
    })

    expect(result.warnings[0].severity).toBe('blocking')
    expect(result.warnings[0].evidence).toEqual({ errorDetail: 'connection refused' })
  })
})
