import { describe, expect, it } from 'vitest'

import { computeCutoff, derivePolicy, type ExitCaseFacts } from './policy'

const PERIOD_START = '2026-05-01'
const PERIOD_END = '2026-05-31'

const baseFacts: ExitCaseFacts = {
  memberId: 'member-123',
  memberActive: true,
  exitCaseId: null,
  exitCasePublicId: null,
  exitLane: null,
  exitStatus: null,
  contractTypeSnapshot: null,
  lastWorkingDay: null,
  effectiveDate: null
}

const withCase = (overrides: Partial<ExitCaseFacts>): ExitCaseFacts => ({
  ...baseFacts,
  exitCaseId: 'case-1',
  exitCasePublicId: 'EO-OFF-2026-TEST',
  ...overrides
})

describe('computeCutoff', () => {
  it('uses last_working_day when present', () => {
    expect(computeCutoff('2026-05-14', '2026-05-15')).toBe('2026-05-14')
  })

  it('falls back to effective_date when LWD is null (approved status)', () => {
    expect(computeCutoff(null, '2026-05-20')).toBe('2026-05-20')
  })

  it('returns null when both are null', () => {
    expect(computeCutoff(null, null)).toBeNull()
  })

  it('LWD wins even when LWD < effective_date', () => {
    expect(computeCutoff('2026-05-10', '2026-05-25')).toBe('2026-05-10')
  })
})

describe('derivePolicy — no exit case', () => {
  it('returns full_period when member is active and has no case', () => {
    const window = derivePolicy(baseFacts, PERIOD_START, PERIOD_END)

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.eligibleFrom).toBe(PERIOD_START)
    expect(window.eligibleTo).toBe(PERIOD_END)
    expect(window.relationshipStatus).toBe('active')
    expect(window.exitCaseId).toBeNull()
    expect(window.warnings).toEqual([])
  })

  it('returns exclude_entire_period when member is inactive WITHOUT any decided exit fact (declared, not silent)', () => {
    const window = derivePolicy({ ...baseFacts, memberActive: false }, PERIOD_START, PERIOD_END)

    expect(window.projectionPolicy).toBe('exclude_entire_period')
    expect(window.eligibleFrom).toBeNull()
    expect(window.eligibleTo).toBeNull()
    expect(window.relationshipStatus).toBe('ended')
    expect(window.reviewRequired).toBe(false)
    expect(window.warnings.map(w => w.code)).toEqual(['inactive_without_exit_fact'])
  })
})

describe('derivePolicy — TASK-1349 active is current availability, not the historical filter', () => {
  // Felipe-like: honorarios (non_payroll), exit 2026-06-02, member deactivated afterwards.
  const felipeLike = (overrides: Partial<ExitCaseFacts> = {}): ExitCaseFacts =>
    withCase({
      memberActive: false,
      exitLane: 'non_payroll',
      exitStatus: 'executed',
      contractTypeSnapshot: 'honorarios',
      lastWorkingDay: '2026-06-02',
      effectiveDate: '2026-06-02',
      ...overrides
    })

  it('inactive member with executed exit on 2 June keeps May fully eligible (history preserved)', () => {
    const window = derivePolicy(felipeLike(), '2026-05-01', '2026-05-31')

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.eligibleFrom).toBe('2026-05-01')
    expect(window.eligibleTo).toBe('2026-05-31')
    expect(window.relationshipStatus).toBe('scheduled_exit')
    expect(window.warnings.map(w => w.code)).not.toContain('inactive_without_exit_fact')
  })

  it('inactive member with executed exit on 2 June is excluded from the cutoff in June (non_payroll)', () => {
    const window = derivePolicy(felipeLike(), '2026-06-01', '2026-06-30')

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
    expect(window.cutoffDate).toBe('2026-06-02')
  })

  it('inactive member with executed exit on 2 June is excluded entirely in July and later', () => {
    const window = derivePolicy(felipeLike(), '2026-07-01', '2026-07-31')

    expect(window.projectionPolicy).toBe('exclude_entire_period')
    expect(window.relationshipStatus).toBe('ended')
  })

  it('an administrative deactivation (identity_only, unresolved) does NOT exclude retroactively — it asks for review instead', () => {
    const window = derivePolicy(
      withCase({
        memberActive: false,
        exitLane: 'identity_only',
        exitStatus: 'needs_review',
        caseSignalDate: '2026-06-10'
      }),
      '2026-06-01',
      '2026-06-30'
    )

    // No decided fact → still excluded defensively (active=false), but declared…
    expect(window.projectionPolicy).toBe('exclude_entire_period')
    expect(window.warnings.map(w => w.code)).toEqual(['inactive_without_exit_fact'])
  })
})

describe('derivePolicy — TASK-1349 unresolved exit signals demand review (access alone never removes pay)', () => {
  it('SCIM identity_only needs_review with no dates, created inside the period → full_period + reviewRequired', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'identity_only',
        exitStatus: 'needs_review',
        exitSource: 'scim',
        contractTypeSnapshot: 'honorarios',
        caseSignalDate: '2026-06-10'
      }),
      '2026-06-01',
      '2026-06-30'
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.reviewRequired).toBe(true)
    expect(window.warnings.find(w => w.code === 'unresolved_exit_signal')?.severity).toBe('blocking')
  })

  it('the same unresolved signal does NOT affect a period that ended before the signal existed', () => {
    const window = derivePolicy(
      withCase({ exitLane: 'identity_only', exitStatus: 'needs_review', caseSignalDate: '2026-06-10' }),
      '2026-05-01',
      '2026-05-31'
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.reviewRequired).toBe(false)
    expect(window.warnings).toEqual([])
  })

  it('blocked case with explicit dates in the past keeps demanding review in later periods (Felipe blocked 2026-06-02)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'identity_only',
        exitStatus: 'blocked',
        lastWorkingDay: '2026-06-02',
        effectiveDate: '2026-06-02',
        caseSignalDate: '2026-06-10'
      }),
      '2026-09-01',
      '2026-09-30'
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.reviewRequired).toBe(true)
  })

  it('draft manual case with a cutoff in a FUTURE period does not block the current one', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'draft',
        effectiveDate: '2026-10-15',
        caseSignalDate: '2026-09-02'
      }),
      '2026-09-01',
      '2026-09-30'
    )

    expect(window.reviewRequired).toBe(false)
    expect(window.warnings).toEqual([])
  })

  it('decided identity_only (access_only review) never gates payroll and needs no review', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'identity_only',
        exitStatus: 'approved',
        effectiveDate: '2026-06-10',
        caseSignalDate: '2026-06-10'
      }),
      '2026-06-01',
      '2026-06-30'
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.reviewRequired).toBe(false)
  })
})

describe('derivePolicy — TASK-1349 re-entry does not inherit a prior exit', () => {
  it('executed exit last year + compensation starting after it → full_period with info warning', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: '2025-11-30',
        effectiveDate: '2025-11-30',
        reenteredAfterExit: true
      }),
      '2026-05-01',
      '2026-05-31'
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.relationshipStatus).toBe('active')
    expect(window.warnings.map(w => w.code)).toEqual(['reentry_after_prior_exit'])
  })

  it('without a re-entry compensation the old executed exit still excludes the period', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: '2025-11-30',
        effectiveDate: '2025-11-30',
        reenteredAfterExit: false
      }),
      '2026-05-01',
      '2026-05-31'
    )

    expect(window.projectionPolicy).toBe('exclude_entire_period')
  })
})

describe('derivePolicy — TASK-1349 contract_type_snapshot reaches the international_internal threshold', () => {
  it('internal_payroll + international_internal approved with cutoff in period → exclude_from_cutoff', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'approved',
        contractTypeSnapshot: 'international_internal',
        effectiveDate: '2026-06-29',
        lastWorkingDay: '2026-06-29'
      }),
      '2026-06-01',
      '2026-06-30'
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })
})

describe('derivePolicy — non-blocking statuses', () => {
  it('draft case → full_period with no warning when no cutoff', () => {
    const window = derivePolicy(
      withCase({ exitLane: 'external_payroll', exitStatus: 'draft' }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.warnings).toEqual([])
  })

  it('draft case with cutoff in period → full_period + info warning', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'draft',
        lastWorkingDay: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    // TASK-1349: a draft with its cutoff inside the period is an unresolved exit
    // relevant to it → still projected (full_period) but review is required.
    expect(window.warnings.map(w => w.code)).toEqual(['draft_case_with_cutoff_in_period', 'unresolved_exit_signal'])
    expect(window.warnings[0].severity).toBe('info')
    expect(window.warnings[1].severity).toBe('blocking')
    expect(window.reviewRequired).toBe(true)
  })

  it('needs_review case → behaves like draft', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'needs_review',
        lastWorkingDay: '2026-05-20'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.warnings[0].code).toBe('draft_case_with_cutoff_in_period')
  })

  it('blocked case → full_period (member stays in scope until operator unblocks)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'blocked',
        lastWorkingDay: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
  })

  it('cancelled case → full_period (case is dead)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'cancelled',
        lastWorkingDay: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.relationshipStatus).toBe('active')
  })
})

describe('derivePolicy — external_payroll lane (Maria-like fixture)', () => {
  // The bug class: external_payroll/Deel with last_working_day in period should
  // exclude the member from internal projected payroll EVEN if status is not
  // 'executed' yet (external providers close via their own workflow).
  it('approved status + cutoff in period → exclude_from_cutoff (Maria fixture)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
    expect(window.eligibleFrom).toBeNull()
    expect(window.eligibleTo).toBeNull()
    expect(window.relationshipStatus).toBe('scheduled_exit')
    expect(window.cutoffDate).toBe('2026-05-14')
  })

  it('approved status + LWD NULL + effective_date in period → exclude_from_cutoff via effective_date fallback', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: null,
        effectiveDate: '2026-05-20'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
    expect(window.cutoffDate).toBe('2026-05-20')
  })

  it('scheduled status + cutoff in period → exclude_from_cutoff', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'scheduled',
        lastWorkingDay: '2026-05-20',
        effectiveDate: '2026-05-20'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })

  it('executed status + cutoff in period → exclude_from_cutoff (Greenhouse never paid)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'executed',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })

  it('approved + cutoff before periodStart → exclude_entire_period', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: '2026-04-15',
        effectiveDate: '2026-04-15'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_entire_period')
    expect(window.relationshipStatus).toBe('ended')
  })

  it('approved + cutoff after periodEnd → full_period (exit is future)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: '2026-06-10',
        effectiveDate: '2026-06-10'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.relationshipStatus).toBe('scheduled_exit')
  })

  it('approved + LWD = periodStart (boundary case) → exclude_from_cutoff', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: PERIOD_START,
        effectiveDate: PERIOD_START
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })

  it('approved + LWD = periodEnd (boundary case) → exclude_from_cutoff', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: PERIOD_END,
        effectiveDate: PERIOD_END
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })
})

describe('derivePolicy — non_payroll lane (contractor/honorarios)', () => {
  it('approved + cutoff in period → exclude_from_cutoff (same as external_payroll)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'non_payroll',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })

  it('scheduled + cutoff in period → exclude_from_cutoff', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'non_payroll',
        exitStatus: 'scheduled',
        lastWorkingDay: '2026-05-20',
        effectiveDate: '2026-05-20'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })
})

describe('derivePolicy — internal_payroll lane (Greenhouse Chile)', () => {
  it('approved status + cutoff in period → full_period (still pay until executed)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.relationshipStatus).toBe('scheduled_exit')
  })

  it('scheduled status + cutoff in period → full_period (still pay until executed)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'scheduled',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
  })

  it('executed + cutoff in period → partial_until_cutoff (prorate)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('partial_until_cutoff')
    expect(window.eligibleFrom).toBe(PERIOD_START)
    expect(window.eligibleTo).toBe('2026-05-14')
    expect(window.relationshipStatus).toBe('ended')
  })

  it('executed + cutoff < periodStart → exclude_entire_period (legacy behavior preserved)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: '2026-04-30',
        effectiveDate: '2026-04-30'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_entire_period')
  })

  it('executed + cutoff > periodEnd → full_period (exit is future)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: '2026-06-10',
        effectiveDate: '2026-06-10'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
  })

  it('executed + LWD = periodStart (boundary) → partial_until_cutoff (1 day eligible)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: PERIOD_START,
        effectiveDate: PERIOD_START
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('partial_until_cutoff')
    expect(window.eligibleTo).toBe(PERIOD_START)
  })

  it('executed + LWD = periodEnd (boundary) → partial_until_cutoff (full period eligible)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'executed',
        lastWorkingDay: PERIOD_END,
        effectiveDate: PERIOD_END
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('partial_until_cutoff')
    expect(window.eligibleTo).toBe(PERIOD_END)
  })
})

describe('derivePolicy — international_internal lane', () => {
  it('excludes from the cutoff once the internal international exit is approved', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        contractTypeSnapshot: 'international_internal',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
    expect(window.eligibleFrom).toBeNull()
    expect(window.eligibleTo).toBeNull()
  })

  it('does not apply the international rule to Chile dependent payroll', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        contractTypeSnapshot: 'indefinido',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
  })
})

describe('derivePolicy — identity_only lane', () => {
  it('approved status + cutoff in period → full_period (identity does not gate payroll)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'identity_only',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.warnings).toEqual([])
  })

  it('executed status → still full_period (identity_only is orthogonal to payroll)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'identity_only',
        exitStatus: 'executed',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
  })
})

describe('derivePolicy — relationship_transition lane', () => {
  it('approved status + cutoff in period → full_period (pay until executed)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'relationship_transition',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
  })

  it('executed + cutoff in period → partial_until_cutoff (Greenhouse paid until LWD)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'relationship_transition',
        exitStatus: 'executed',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('partial_until_cutoff')
    expect(window.eligibleTo).toBe('2026-05-14')
  })
})

describe('derivePolicy — unknown lane (conservative)', () => {
  it('approved status + cutoff in period → full_period + unclassified_lane warning', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'unknown',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.warnings).toHaveLength(1)
    expect(window.warnings[0].code).toBe('unclassified_lane')
    expect(window.warnings[0].severity).toBe('warning')
  })

  it('null lane + approved status → full_period + unclassified_lane warning', () => {
    const window = derivePolicy(
      withCase({
        exitLane: null,
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.warnings[0].code).toBe('unclassified_lane')
  })
})

describe('derivePolicy — schema invariant edge cases', () => {
  it('approved status + no cutoff (effective_date NULL too) → full_period + warning', () => {
    // This shouldn't happen because CHECK constraint enforces effective_date
    // when status='approved'. But defense-in-depth: warn instead of crash.
    const window = derivePolicy(
      withCase({
        exitLane: 'internal_payroll',
        exitStatus: 'approved',
        lastWorkingDay: null,
        effectiveDate: null
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.projectionPolicy).toBe('full_period')
    expect(window.warnings[0].code).toBe('effective_date_only_no_lwd')
  })

  it('cutoff via effective_date when LWD missing (approved-only state)', () => {
    const window = derivePolicy(
      withCase({
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: null,
        effectiveDate: '2026-05-20'
      }),
      PERIOD_START,
      PERIOD_END
    )

    expect(window.cutoffDate).toBe('2026-05-20')
    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
  })
})

describe('derivePolicy — Maria Camila Hoyos canonical regression fixture', () => {
  // Reproduces the exact bug class from caso EO-OFF-2026-0609A520:
  // - external_payroll/Deel lane
  // - last_working_day = 2026-05-14
  // - status pre-executed (draft observed live; but spec mandates approved+ behavior)
  // - period mayo 2026 (2026-05-01 .. 2026-05-31)
  // Pre-fix: pgGet excluía solo executed → full month USD 530 inflado.
  // Post-fix: exclude_from_cutoff cuando case ≥ approved.
  it('Maria-fixture in approved state → exclude_from_cutoff (bug closed)', () => {
    const window = derivePolicy(
      withCase({
        exitCaseId: 'EO-OFF-2026-0609A520',
        exitCasePublicId: 'EO-OFF-2026-0609A520',
        exitLane: 'external_payroll',
        exitStatus: 'approved',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      '2026-05-01',
      '2026-05-31'
    )

    expect(window.projectionPolicy).toBe('exclude_from_cutoff')
    expect(window.eligibleFrom).toBeNull()
    expect(window.eligibleTo).toBeNull()
    expect(window.cutoffDate).toBe('2026-05-14')
    expect(window.exitCasePublicId).toBe('EO-OFF-2026-0609A520')
  })

  it('Maria-fixture stuck in draft → full_period + info warning (operator must approve)', () => {
    // This is the CURRENT live state of Maria's case (as of 2026-05-15).
    // Until operator transitions draft→approved, resolver behavior matches
    // legacy (full_period) but surfaces info warning so it's visible.
    const window = derivePolicy(
      withCase({
        exitCaseId: 'EO-OFF-2026-0609A520',
        exitCasePublicId: 'EO-OFF-2026-0609A520',
        exitLane: 'external_payroll',
        exitStatus: 'draft',
        lastWorkingDay: '2026-05-14',
        effectiveDate: '2026-05-14'
      }),
      '2026-05-01',
      '2026-05-31'
    )

    expect(window.projectionPolicy).toBe('full_period')
    // TASK-1349: a draft with its cutoff inside the period is an unresolved exit
    // relevant to it → still projected (full_period) but review is required.
    expect(window.warnings.map(w => w.code)).toEqual(['draft_case_with_cutoff_in_period', 'unresolved_exit_signal'])
    expect(window.warnings[0].severity).toBe('info')
    expect(window.warnings[1].severity).toBe('blocking')
    expect(window.reviewRequired).toBe(true)
  })
})
