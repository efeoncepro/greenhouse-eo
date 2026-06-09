import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetEffectiveSupervisor = vi.fn()

vi.mock('@/lib/reporting-hierarchy/readers', () => ({
  getEffectiveSupervisor: (...args: unknown[]) => mockGetEffectiveSupervisor(...args)
}))

const {
  getNextApprovalAuthority,
  resolveInitialApprovalAuthority
} = await import('./resolver')

describe('approval authority resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const formalSupervisorRecord = {
    memberId: 'member-subject',
    memberName: 'Ana',
    supervisorMemberId: 'member-supervisor',
    supervisorName: 'Carlos Supervisor',
    effectiveSupervisorMemberId: 'member-supervisor',
    effectiveSupervisorName: 'Carlos Supervisor',
    delegated: false,
    delegation: null
  }

  // TASK-1020 — para leave.supervisor_review (honorGenericApprovalDelegate=false)
  // el resolver pide delegationPolicy='ignore' y el efectivo == formal.
  it('resolves leave.supervisor_review to the FORMAL supervisor (ignores generic delegate)', async () => {
    mockGetEffectiveSupervisor.mockResolvedValue(formalSupervisorRecord)

    const resolution = await resolveInitialApprovalAuthority({
      workflowDomain: 'leave',
      subjectMemberId: 'member-subject'
    })

    expect(mockGetEffectiveSupervisor).toHaveBeenCalledWith('member-subject', {
      delegationPolicy: 'ignore'
    })
    expect(resolution.stageCode).toBe('supervisor_review')
    expect(resolution.authoritySource).toBe('reporting_hierarchy')
    expect(resolution.authoritySource).not.toBe('delegation')
    expect(resolution.formalApproverMemberId).toBe('member-supervisor')
    expect(resolution.effectiveApproverMemberId).toBe('member-supervisor')
    expect(resolution.delegateResponsibilityId).toBeNull()
    expect(resolution.delegated).toBe(false)
  })

  // TASK-1020 D2 — los tres stages effective_supervisor (leave/expense_report/
  // performance_evaluation) no honran el delegate genérico → 'ignore'.
  it.each(['leave', 'expense_report', 'performance_evaluation'] as const)(
    'passes delegationPolicy=ignore for %s.supervisor_review',
    async workflowDomain => {
      mockGetEffectiveSupervisor.mockResolvedValue(formalSupervisorRecord)

      const resolution = await resolveInitialApprovalAuthority({
        workflowDomain,
        subjectMemberId: 'member-subject'
      })

      expect(mockGetEffectiveSupervisor).toHaveBeenCalledWith('member-subject', {
        delegationPolicy: 'ignore'
      })
      expect(resolution.authoritySource).not.toBe('delegation')
      expect(resolution.effectiveApproverMemberId).toBe('member-supervisor')
    }
  )

  it('falls back to hr review when the subject has no supervisor', async () => {
    mockGetEffectiveSupervisor.mockResolvedValue({
      memberId: 'member-subject',
      memberName: 'Ana',
      supervisorMemberId: null,
      supervisorName: null,
      effectiveSupervisorMemberId: null,
      effectiveSupervisorName: null,
      delegated: false,
      delegation: null
    })

    const resolution = await resolveInitialApprovalAuthority({
      workflowDomain: 'leave',
      subjectMemberId: 'member-subject'
    })

    expect(resolution.stageCode).toBe('hr_review')
    expect(resolution.authoritySource).toBe('domain_fallback')
    expect(resolution.effectiveApproverMemberId).toBeNull()
    expect(resolution.fallbackRoleCodes).toEqual(['hr_manager', 'hr_payroll', 'efeonce_admin'])
  })

  it('returns the next configured stage authority', async () => {
    mockGetEffectiveSupervisor.mockResolvedValue({
      memberId: 'member-subject',
      memberName: 'Ana',
      supervisorMemberId: 'member-supervisor',
      supervisorName: 'Carlos Supervisor',
      effectiveSupervisorMemberId: 'member-supervisor',
      effectiveSupervisorName: 'Carlos Supervisor',
      delegated: false,
      delegation: null
    })

    const resolution = await getNextApprovalAuthority({
      workflowDomain: 'leave',
      subjectMemberId: 'member-subject',
      stageCode: 'supervisor_review'
    })

    expect(resolution).toMatchObject({
      stageCode: 'hr_review',
      authoritySource: 'domain_fallback',
      fallbackRoleCodes: ['hr_manager', 'hr_payroll', 'efeonce_admin']
    })
  })
})
