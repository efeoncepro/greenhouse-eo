import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

import type { ParticipationFactsRow } from './query'

const fetchFactsMock = vi.fn<
  (memberIds: ReadonlyArray<string>, periodStart: string, periodEnd: string) => Promise<Map<string, ParticipationFactsRow>>
>()

const resolveExitMock = vi.fn<
  (memberIds: ReadonlyArray<string>, periodStart: string, periodEnd: string) => Promise<Map<string, WorkforceExitPayrollEligibilityWindow>>
>()

const captureWithDomainMock = vi.fn()

vi.mock('./query', () => ({
  fetchParticipationFactsForMembers: (...args: Parameters<typeof fetchFactsMock>) => fetchFactsMock(...args)
}))

vi.mock('@/lib/payroll/exit-eligibility', () => ({
  resolveExitEligibilityForMembers: (...args: Parameters<typeof resolveExitMock>) => resolveExitMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomainMock(...args)
}))

import { resolvePayrollParticipationWindowsForMembers, isMemberParticipatingInPayroll } from './resolver'

const PERIOD_START = '2026-05-01'
const PERIOD_END = '2026-05-31'

const buildFactsRow = (overrides: Partial<ParticipationFactsRow> = {}): ParticipationFactsRow => ({
  memberId: 'member-felipe',
  compensationEffectiveFrom: '2024-01-01',
  compensationEffectiveTo: null,
  onboardingStartDate: null,
  ...overrides
})

const buildExitWindow = (overrides: Partial<WorkforceExitPayrollEligibilityWindow> = {}): WorkforceExitPayrollEligibilityWindow => ({
  memberId: 'member-felipe',
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
  warnings: [],
  ...overrides
})

beforeEach(() => {
  fetchFactsMock.mockReset()
  resolveExitMock.mockReset()
  captureWithDomainMock.mockReset()
})

describe('resolvePayrollParticipationWindowsForMembers', () => {
  it('returns empty map for empty member list (no IO)', async () => {
    const result = await resolvePayrollParticipationWindowsForMembers([], PERIOD_START, PERIOD_END)

    expect(result.size).toBe(0)
    expect(fetchFactsMock).not.toHaveBeenCalled()
    expect(resolveExitMock).not.toHaveBeenCalled()
  })

  it('composes facts + TASK-890 happy path: member full month', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([['member-felipe', buildFactsRow()]])
    )
    resolveExitMock.mockResolvedValueOnce(
      new Map([['member-felipe', buildExitWindow()]])
    )

    const result = await resolvePayrollParticipationWindowsForMembers(
      ['member-felipe'],
      PERIOD_START,
      PERIOD_END
    )

    expect(result.size).toBe(1)
    const window = result.get('member-felipe')!

    expect(window.policy).toBe('full_period')
    expect(window.prorationFactor).toBe(1)
    expect(window.exitEligibility?.projectionPolicy).toBe('full_period')
    expect(window.warnings).toHaveLength(0)
  })

  it('Felipe-like mid-month entry: prorate_from_start composed with no exit case', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([['member-felipe', buildFactsRow({ compensationEffectiveFrom: '2026-05-13' })]])
    )
    /* TASK-890 returns empty Map → no active exit case for this member */
    resolveExitMock.mockResolvedValueOnce(new Map())

    const result = await resolvePayrollParticipationWindowsForMembers(
      ['member-felipe'],
      PERIOD_START,
      PERIOD_END
    )

    const window = result.get('member-felipe')!

    expect(window.policy).toBe('prorate_from_start')
    expect(window.eligibleFrom).toBe('2026-05-13')
    expect(window.exitEligibility).toBeNull()
    expect(window.warnings).toHaveLength(0)
  })

  it('TASK-890 throw: captureWithDomain emitted, every member gets exit_resolver_failed warning, entry-side still computed', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([['member-felipe', buildFactsRow({ compensationEffectiveFrom: '2026-05-13' })]])
    )
    resolveExitMock.mockRejectedValueOnce(new Error('PG connection timeout'))

    const result = await resolvePayrollParticipationWindowsForMembers(
      ['member-felipe'],
      PERIOD_START,
      PERIOD_END
    )

    const window = result.get('member-felipe')!

    /* Entry-side still computes correctly */
    expect(window.policy).toBe('prorate_from_start')
    expect(window.eligibleFrom).toBe('2026-05-13')
    /* But exit side is null + warning emitted */
    expect(window.exitEligibility).toBeNull()
    const warning = window.warnings.find(w => w.code === 'exit_resolver_failed')

    expect(warning).toBeDefined()
    expect(warning?.evidence).toMatchObject({ detail: 'PG connection timeout' })

    /* Sentry captured the source-tagged error */
    expect(captureWithDomainMock).toHaveBeenCalledTimes(1)

    const [errArg, domain, ctx] = captureWithDomainMock.mock.calls[0] as [
      unknown,
      string,
      { extra?: Record<string, unknown> }
    ]

    expect(errArg).toBeInstanceOf(Error)
    expect(domain).toBe('payroll')
    expect(ctx.extra).toMatchObject({
      source: 'participation_window.exit_composition_failed',
      memberCount: 1,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END
    })
  })

  it('member absent from facts (no applicable compensation) → silently skipped, not in output map', async () => {
    fetchFactsMock.mockResolvedValueOnce(new Map())
    resolveExitMock.mockResolvedValueOnce(new Map())

    const result = await resolvePayrollParticipationWindowsForMembers(
      ['member-ghost'],
      PERIOD_START,
      PERIOD_END
    )

    expect(result.size).toBe(0)
    expect(captureWithDomainMock).not.toHaveBeenCalled()
  })

  it('multiple members bulk: each composed independently with own exit decision', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([
        ['member-felipe', buildFactsRow({ memberId: 'member-felipe', compensationEffectiveFrom: '2026-05-13' })],
        ['member-maria', buildFactsRow({ memberId: 'member-maria', compensationEffectiveFrom: '2024-01-01' })],
        ['member-stable', buildFactsRow({ memberId: 'member-stable', compensationEffectiveFrom: '2023-06-01' })]
      ])
    )
    resolveExitMock.mockResolvedValueOnce(
      new Map([
        [
          'member-maria',
          buildExitWindow({
            memberId: 'member-maria',
            projectionPolicy: 'exclude_from_cutoff',
            eligibleFrom: null,
            eligibleTo: null,
            cutoffDate: '2026-04-30',
            exitLane: 'external_payroll',
            exitStatus: 'approved',
            relationshipStatus: 'scheduled_exit'
          })
        ]
        /* Felipe + Stable absent from exit map → no exit case */
      ])
    )

    const result = await resolvePayrollParticipationWindowsForMembers(
      ['member-felipe', 'member-maria', 'member-stable'],
      PERIOD_START,
      PERIOD_END
    )

    expect(result.size).toBe(3)
    expect(result.get('member-felipe')!.policy).toBe('prorate_from_start')
    expect(result.get('member-maria')!.policy).toBe('exclude')
    expect(result.get('member-maria')!.reasonCodes).toContain('external_payroll_exit')
    expect(result.get('member-stable')!.policy).toBe('full_period')
  })

  it('onboarding source date disagreement → warning emitted in window, comp stays canonical', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([
        [
          'member-felipe',
          buildFactsRow({
            compensationEffectiveFrom: '2026-05-13',
            onboardingStartDate: '2026-05-28' /* 15 days drift */
          })
        ]
      ])
    )
    resolveExitMock.mockResolvedValueOnce(new Map())

    const result = await resolvePayrollParticipationWindowsForMembers(
      ['member-felipe'],
      PERIOD_START,
      PERIOD_END
    )

    const window = result.get('member-felipe')!

    expect(window.eligibleFrom).toBe('2026-05-13') /* comp wins as canonical V1 source */
    const drift = window.warnings.find(w => w.code === 'source_date_disagreement')

    expect(drift).toBeDefined()
    expect(drift?.evidence).toMatchObject({ diffDays: 15 })
  })
})

describe('isMemberParticipatingInPayroll', () => {
  it('returns true when policy is not exclude', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([['member-felipe', buildFactsRow()]])
    )
    resolveExitMock.mockResolvedValueOnce(new Map())

    const result = await isMemberParticipatingInPayroll('member-felipe', '2026-05-15')

    expect(result).toBe(true)
  })

  it('returns false when member is excluded', async () => {
    fetchFactsMock.mockResolvedValueOnce(
      new Map([['member-felipe', buildFactsRow({ compensationEffectiveFrom: '2026-06-01' })]])
    )
    resolveExitMock.mockResolvedValueOnce(new Map())

    const result = await isMemberParticipatingInPayroll('member-felipe', '2026-05-15')

    expect(result).toBe(false)
  })

  it('returns false when member is absent from result map (no compensation)', async () => {
    fetchFactsMock.mockResolvedValueOnce(new Map())
    resolveExitMock.mockResolvedValueOnce(new Map())

    const result = await isMemberParticipatingInPayroll('member-ghost', '2026-05-15')

    expect(result).toBe(false)
  })
})
