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

  it('returns delegated supervisor authority when delegation is active', async () => {
    mockGetEffectiveSupervisor.mockResolvedValue({
      memberId: 'member-subject',
      memberName: 'Ana',
      supervisorMemberId: 'member-supervisor',
      supervisorName: 'Carlos Supervisor',
      effectiveSupervisorMemberId: 'member-delegate',
      effectiveSupervisorName: 'Daniela Delegate',
      delegated: true,
      delegation: {
        responsibilityId: 'resp-1',
        delegateMemberId: 'member-delegate',
        delegateMemberName: 'Daniela Delegate',
        scopeType: 'member',
        scopeId: 'member-supervisor',
        effectiveFrom: '2026-04-01T00:00:00.000Z',
        effectiveTo: null
      }
    })

    const resolution = await resolveInitialApprovalAuthority({
      workflowDomain: 'leave',
      subjectMemberId: 'member-subject'
    })

    expect(resolution.stageCode).toBe('supervisor_review')
    expect(resolution.authoritySource).toBe('delegation')
    expect(resolution.formalApproverMemberId).toBe('member-supervisor')
    expect(resolution.effectiveApproverMemberId).toBe('member-delegate')
    expect(resolution.delegateResponsibilityId).toBe('resp-1')
    expect(resolution.delegated).toBe(true)
  })

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
