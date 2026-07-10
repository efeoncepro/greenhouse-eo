import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const runQueryMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const captureWithDomainMock = vi.fn()
const getHandoffMock = vi.fn()
const transitionHandoffMock = vi.fn()
const materializeMemberMock = vi.fn()
const createOnboardingInstanceMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
  onGreenhousePostgresReset: vi.fn(),
  getGreenhousePostgresPool: vi.fn(),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomainMock(...args),
}))

vi.mock('@/lib/hiring/handoff', () => ({
  getHiringHandoffById: (...args: unknown[]) => getHandoffMock(...args),
  transitionHiringHandoff: (...args: unknown[]) => transitionHandoffMock(...args),
}))

vi.mock('./member-core', () => ({
  resolveOrCreateMemberForIdentityProfile: (...args: unknown[]) => materializeMemberMock(...args),
}))

vi.mock('@/lib/hr-onboarding/store', () => ({
  createOnboardingInstance: (...args: unknown[]) => createOnboardingInstanceMock(...args),
}))

const { HiringActivationIdentityConflictError } = await import('./errors')

const {
  completeHiringActivation,
  createMemberForHiringActivation,
  openOnboardingForHiringActivation,
  reviewHiringActivation,
} = await import('./service')

const handoff = (overrides: Record<string, unknown> = {}) => ({
  handoffId: 'hhof-1',
  applicationId: 'app-1',
  openingId: 'opng-1',
  decisionId: 'dec-1',
  identityProfileId: 'profile-1',
  candidateFacetId: 'facet-1',
  selectedDestination: 'internal_hire',
  state: 'approved',
  tentativeStartDate: '2026-08-01',
  expectedLegalEntity: null,
  ...overrides,
})

const requestRow = (overrides: Record<string, unknown> = {}) => ({
  activation_request_id: 'hact-1',
  hiring_handoff_id: 'hhof-1',
  hiring_application_id: 'app-1',
  identity_profile_id: 'profile-1',
  candidate_facet_id: 'facet-1',
  member_id: null,
  member_outcome: null,
  onboarding_instance_id: null,
  onboarding_case_id: null,
  state: 'pending_hr_review',
  blocked_reason: null,
  blocked_detail: null,
  state_changed_at: '2026-07-10T12:00:00.000Z',
  created_by_user_id: 'user-hr',
  created_at: '2026-07-10T12:00:00.000Z',
  updated_at: '2026-07-10T12:00:00.000Z',
  ...overrides,
})

const buildTxClient = (options: {
  existing?: Record<string, unknown> | null
  person?: Record<string, unknown> | null
  memberIntakeStatus?: string
}) => {
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (/FOR UPDATE/.test(sql)) return { rows: options.existing ? [options.existing] : [] }

    if (/INSERT INTO greenhouse_hr\.hiring_activation_request\b(?!_events)/.test(sql)) {
      return { rows: [requestRow({ created_by_user_id: values[5] })] }
    }

    if (/UPDATE greenhouse_hr\.hiring_activation_request/.test(sql)) {
      const base = { ...(options.existing ?? requestRow()) } as Record<string, unknown>

      // Aplica cada `col = $n` del SET real (mock columna-consciente).
      for (const match of sql.matchAll(/(\w+) = \$(\d+)/g)) {
        base[match[1]] = values[Number(match[2]) - 1]
      }

      return { rows: [base] }
    }

    if (/hiring_activation_request_events/.test(sql)) return { rows: [] }

    if (/FROM greenhouse_core\.identity_profiles/.test(sql)) {
      return { rows: options.person ? [options.person] : [] }
    }

    if (/FROM greenhouse_core\.members/.test(sql)) {
      return { rows: [{ workforce_intake_status: options.memberIntakeStatus ?? 'pending_intake' }] }
    }

    if (/work_relationship_onboarding_cases/.test(sql)) {
      return { rows: [{ case_id: 'case-1' }] }
    }

    throw new Error(`SQL inesperada: ${sql.slice(0, 90)}`)
  })

  return { query }
}

describe('hiring activation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getHandoffMock.mockResolvedValue(handoff())
    transitionHandoffMock.mockResolvedValue({ handoff: {}, idempotentReplay: false })
  })

  it('review reclama el request (claim) y es idempotente', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildTxClient({ existing: null })))

    const created = await reviewHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(created.state).toBe('pending_hr_review')

    withTransactionMock.mockImplementation(async (cb) => cb(buildTxClient({ existing: requestRow() })))

    const replay = await reviewHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(replay.activationRequestId).toBe('hact-1')
  })

  it('rechaza handoffs no aprobados o con destino distinto de internal_hire', async () => {
    getHandoffMock.mockResolvedValue(handoff({ state: 'pending' }))
    await expect(reviewHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: null })).rejects.toMatchObject({
      code: 'hiring_activation_handoff_not_approved',
    })

    getHandoffMock.mockResolvedValue(handoff({ selectedDestination: 'staff_augmentation' }))
    await expect(reviewHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: null })).rejects.toMatchObject({
      code: 'hiring_activation_destination_unsupported',
    })
  })

  it('create-member materializa vía el core y emite hiring.activation.linked', async () => {
    materializeMemberMock.mockResolvedValue({ memberId: 'mbr-9', outcome: 'created_new' })
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildTxClient({ existing: requestRow(), person: { full_name: 'Ana Prueba', canonical_email: 'ana@x.cl' } })),
    )

    const result = await createMemberForHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(result.state).toBe('member_created')
    expect(materializeMemberMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ identityProfileId: 'profile-1', hireDate: '2026-08-01' }),
    )
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.activation.linked' }),
      expect.anything(),
    )
  })

  it('conflicto de identidad → request blocked auditado (nunca merge, nunca throw mudo)', async () => {
    materializeMemberMock.mockRejectedValue(
      new HiringActivationIdentityConflictError('member_already_active', 'Ya es colaborador activo.'),
    )
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildTxClient({ existing: requestRow(), person: { full_name: 'Ana', canonical_email: null } })),
    )

    const result = await createMemberForHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(result.state).toBe('blocked')
    expect(result.blockedReason).toBe('member_already_active')
    expect(captureWithDomainMock).toHaveBeenCalledWith(expect.anything(), 'identity', expect.anything())
  })

  it('create-member es replay idempotente cuando el member ya existe en el request', async () => {
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildTxClient({ existing: requestRow({ member_id: 'mbr-9', state: 'member_created' }) })),
    )

    const result = await createMemberForHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(result.memberId).toBe('mbr-9')
    expect(materializeMemberMock).not.toHaveBeenCalled()
  })

  it('open-onboarding sin template aplicable → blocked:onboarding_template_missing', async () => {
    const { HrCoreValidationError } = await import('@/lib/hr-core/shared')

    runQueryMock.mockResolvedValue([requestRow({ member_id: 'mbr-9', state: 'member_created' })])
    createOnboardingInstanceMock.mockRejectedValue(
      new HrCoreValidationError('No active onboarding template matches this member.', 409),
    )
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildTxClient({ existing: requestRow({ member_id: 'mbr-9', state: 'member_created' }) })),
    )

    const result = await openOnboardingForHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(result.state).toBe('blocked')
    expect(result.blockedReason).toBe('onboarding_template_missing')
  })

  it('complete exige intake completed por el path canónico (409 si pending)', async () => {
    runQueryMock.mockResolvedValue([requestRow({ member_id: 'mbr-9', state: 'onboarding_open' })])
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildTxClient({ existing: requestRow({ member_id: 'mbr-9', state: 'onboarding_open' }), memberIntakeStatus: 'pending_intake' })),
    )

    await expect(completeHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })).rejects.toMatchObject({
      code: 'hiring_activation_member_intake_pending',
    })
    expect(transitionHandoffMock).not.toHaveBeenCalled()
  })

  it('complete con intake completed marca el handoff completed con downstreamRef=member:<id>', async () => {
    runQueryMock.mockResolvedValue([requestRow({ member_id: 'mbr-9', state: 'onboarding_open' })])
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildTxClient({ existing: requestRow({ member_id: 'mbr-9', state: 'onboarding_open' }), memberIntakeStatus: 'completed' })),
    )

    const result = await completeHiringActivation({ hiringHandoffId: 'hhof-1', actorUserId: 'user-hr' })

    expect(result.state).toBe('active')
    expect(transitionHandoffMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'complete', downstreamRef: 'member:mbr-9' }),
    )
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.activation.completed' }),
      expect.anything(),
    )
  })
})
