import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const canMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const resolveWorkforceActivationReadinessMock = vi.fn()

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
  resolveWorkforceActivationReadiness: (...args: unknown[]) => resolveWorkforceActivationReadinessMock(...args)
}))

const { updateWorkforceMemberIntake } = await import('./update-intake')

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
  primary_email: 'felipe@example.com',
  identity_profile_id: 'identity-1',
  workforce_intake_status: 'pending_intake',
  active: true,
  hire_date: null,
  employment_type: null,
  contract_type: 'indefinido',
  contract_end_date: null,
  daily_required: true,
  pay_regime: 'chile',
  payroll_via: 'internal',
  deel_contract_id: null
}

const readiness = {
  ready: false,
  status: 'blocked',
  blockerCount: 1,
  blockers: [{ code: 'compensation_missing', lane: 'compensation', label: 'Falta compensación' }],
  warnings: [],
  lanes: [],
  readinessScore: 66,
  topBlockerLane: 'compensation'
}

const buildClient = (rows: unknown[]) => ({
  query: vi
    .fn()
    .mockResolvedValueOnce({ rows })
    .mockResolvedValueOnce({ rowCount: 1, rows: [] })
})

const call = (body: Record<string, unknown>) =>
  updateWorkforceMemberIntake({
    memberId: 'mem-1',
    tenant: tenant as never,
    body
  })

describe('updateWorkforceMemberIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canMock.mockImplementation((_subject, capability) => capability === 'workforce.member.intake.update')
    resolveWorkforceActivationReadinessMock.mockResolvedValue(readiness)
    withTransactionMock.mockImplementation(async callback => callback(buildClient([memberRow])))
  })

  it('updates labor intake fields, moves pending intake to in_review and publishes an audit event', async () => {
    const result = await call({
      hireDate: '2026-05-14',
      employmentType: 'full_time',
      contractType: 'indefinido',
      reason: 'Alta validada por HR.'
    })

    expect(result.after).toEqual(
      expect.objectContaining({
        hireDate: '2026-05-14',
        employmentType: 'full_time',
        contractType: 'indefinido',
        payRegime: 'chile',
        payrollVia: 'internal',
        workforceIntakeStatus: 'in_review'
      })
    )
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'member',
        aggregateId: 'mem-1',
        eventType: 'workforce.member.intake_updated',
        payload: expect.objectContaining({
          memberId: 'mem-1',
          actorUserId: 'user-1',
          previous: expect.objectContaining({ workforceIntakeStatus: 'pending_intake' }),
          after: expect.objectContaining({ workforceIntakeStatus: 'in_review' })
        })
      }),
      expect.anything()
    )
    expect(resolveWorkforceActivationReadinessMock).toHaveBeenCalledWith('mem-1')
  })

  it('rejects updates without the granular intake update capability', async () => {
    canMock.mockReturnValue(false)

    await expect(call({ hireDate: '2026-05-14' })).rejects.toMatchObject({
      statusCode: 403
    })
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('rejects completed members because remediation must happen before the final transition', async () => {
    withTransactionMock.mockImplementationOnce(async callback =>
      callback(buildClient([{ ...memberRow, workforce_intake_status: 'completed' }]))
    )

    await expect(call({ hireDate: '2026-05-14' })).rejects.toMatchObject({
      statusCode: 409
    })
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('requires contract end date for plazo fijo contracts', async () => {
    await expect(call({ contractType: 'plazo_fijo' })).rejects.toMatchObject({
      statusCode: 400
    })
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('requires Deel contract id for Deel-governed contracts', async () => {
    await expect(call({ contractType: 'contractor', employmentType: 'contractor' })).rejects.toMatchObject({
      statusCode: 400
    })
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })
})
