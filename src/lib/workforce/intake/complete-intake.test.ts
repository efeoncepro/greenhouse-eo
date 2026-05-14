import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const canMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const resolveWorkforceActivationReadinessMock = vi.fn()
const ensureActivatedOnboardingCaseForMemberMock = vi.fn()

vi.mock('@/lib/db', () => ({
  withTransaction: (...args: unknown[]) => withTransactionMock(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => canMock(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

vi.mock('@/lib/workforce/activation/readiness', () => ({
  resolveWorkforceActivationReadiness: (...args: unknown[]) => resolveWorkforceActivationReadinessMock(...args),
  buildWorkforceActivationReadinessAuditSnapshot: (readiness: unknown) => ({ readiness })
}))

vi.mock('@/lib/workforce/onboarding/store', () => ({
  ensureActivatedOnboardingCaseForMember: (...args: unknown[]) => ensureActivatedOnboardingCaseForMemberMock(...args)
}))

const { completeWorkforceMemberIntake } = await import('./complete-intake')

const tenant = {
  userId: 'user-1',
  organizationId: 'efeonce',
  tenantType: 'internal',
  roleCodes: ['hr_manager'],
  routeGroups: ['hr'],
  authorizedViews: ['equipo.workforce_activation']
}

const memberRow = {
  member_id: 'mem-1',
  display_name: 'Felipe Zurita',
  workforce_intake_status: 'pending_intake',
  active: true,
  identity_profile_id: 'identity-1'
}

const ready = {
  ready: true,
  status: 'ready_to_complete',
  blockerCount: 0,
  blockers: [],
  warnings: [],
  lanes: [],
  readinessScore: 100,
  topBlockerLane: null
}

const blocked = {
  ...ready,
  ready: false,
  status: 'blocked',
  blockerCount: 1,
  blockers: [{ code: 'hire_date_missing', lane: 'employment', label: 'Falta fecha de ingreso' }],
  readinessScore: 44,
  topBlockerLane: 'employment'
}

const buildClient = (rows: unknown[]) => ({
  query: vi
    .fn()
    .mockResolvedValueOnce({ rows })
    .mockResolvedValueOnce({ rowCount: 1, rows: [] })
})

const call = (body: Record<string, unknown> = {}) =>
  completeWorkforceMemberIntake({
    memberId: 'mem-1',
    tenant: tenant as never,
    body
  })

describe('completeWorkforceMemberIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canMock.mockImplementation((_subject, capability) => capability === 'workforce.member.complete_intake')
    resolveWorkforceActivationReadinessMock.mockResolvedValue(ready)
    ensureActivatedOnboardingCaseForMemberMock.mockResolvedValue({
      onboardingCase: {
        onboardingCaseId: 'onboarding-case-1',
        publicId: 'EO-ON-2026-ABC12345'
      },
      created: true,
      transitioned: true
    })
    withTransactionMock.mockImplementation(async callback => callback(buildClient([memberRow])))
  })

  it('completes intake transactionally and publishes the member intake event', async () => {
    const response = await call({ reason: 'Datos laborales listos' })

    expect(response.status).toBe(200)
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'member',
        aggregateId: 'mem-1',
        payload: expect.objectContaining({
          memberId: 'mem-1',
          previousStatus: 'pending_intake',
          newStatus: 'completed',
          onboardingCaseId: 'onboarding-case-1',
          readinessOverride: null
        })
      }),
      expect.anything()
    )
  })

  it('blocks completion when readiness is not ready and no override is requested', async () => {
    resolveWorkforceActivationReadinessMock.mockResolvedValue(blocked)

    const response = await call()
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.code).toBe('activation_readiness_blocked')
    expect(ensureActivatedOnboardingCaseForMemberMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('rejects readiness override without the override capability', async () => {
    resolveWorkforceActivationReadinessMock.mockResolvedValue(blocked)

    const response = await call({ override: true, overrideReason: 'Razón suficientemente larga para auditoría' })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('activation_readiness_override_forbidden')
  })

  it('applies readiness override only with capability and long reason', async () => {
    resolveWorkforceActivationReadinessMock.mockResolvedValue(blocked)
    canMock.mockImplementation((_subject, capability) =>
      capability === 'workforce.member.complete_intake' ||
      capability === 'workforce.member.activation_readiness.override'
    )

    const response = await call({ override: true, overrideReason: 'Aprobación excepcional validada por HR y Finance.' })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.readinessOverrideApplied).toBe(true)
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          readinessOverride: expect.objectContaining({ actorUserId: 'user-1' })
        })
      }),
      expect.anything()
    )
  })

  it('is idempotent when the member is already completed', async () => {
    withTransactionMock.mockImplementationOnce(async callback =>
      callback(buildClient([{ ...memberRow, workforce_intake_status: 'completed' }]))
    )

    const response = await call()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.transitioned).toBe(false)
    expect(payload.reason).toBe('already_completed')
  })

  it('returns not found when the member does not exist', async () => {
    withTransactionMock.mockImplementationOnce(async callback => callback(buildClient([])))

    const response = await call()

    expect(response.status).toBe(404)
  })
})
