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
const resolveReadinessMock = vi.fn()

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

vi.mock('@/lib/workforce/activation/readiness', () => ({
  resolveWorkforceActivationReadiness: (...args: unknown[]) => resolveReadinessMock(...args),
}))

vi.mock('./config', () => ({
  isHiringActivationEnabled: () => true,
}))

const { HiringActivationIdentityConflictError } = await import('./errors')

const {
  completeHiringActivation,
  createMemberForHiringActivation,
  openOnboardingForHiringActivation,
  reviewHiringActivation,
} = await import('./service')

const { computeHiringActivationBlockerPayloadDigest, resolveHiringActivationBlocker } = await import('./resolve-blocker')

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

const readiness = (overrides: Record<string, unknown> = {}) => ({
  member: { memberId: 'mbr-9' },
  status: 'blocked',
  ready: false,
  readinessScore: 50,
  blockerCount: 0,
  warningCount: 0,
  topBlockerLane: null,
  lanes: [],
  blockers: [],
  warnings: [],
  evaluatedAt: '2026-07-10T12:00:00.000Z',
  ...overrides,
})

const buildTxClient = (options: {
  existing?: Record<string, unknown> | null
  person?: Record<string, unknown> | null
  memberIntakeStatus?: string
}) => {
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    // Audit 2026-07-10: recheck del handoff dentro de la tx (lockConsumableHandoffInTx).
    if (/FROM greenhouse_hiring\.hiring_handoff\b/.test(sql)) return { rows: [{ state: 'approved' }] }

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
      return { rows: [{ onboarding_case_id: 'case-1' }] }
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
    resolveReadinessMock.mockResolvedValue(readiness())
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

  it('resolve-blocker reintenta onboarding, audita sólo digest y devuelve detail fresco', async () => {
    const blocked = requestRow({
      member_id: 'mbr-9',
      state: 'blocked',
      blocked_reason: 'onboarding_template_missing',
      blocked_detail: 'No hay template aplicable.',
    })

    const opened = requestRow({
      member_id: 'mbr-9',
      state: 'onboarding_open',
      blocked_reason: null,
      blocked_detail: null,
      onboarding_instance_id: 'onb-1',
    })

    const txClients: Array<ReturnType<typeof buildTxClient>> = []

    runQueryMock
      .mockResolvedValueOnce([blocked])
      .mockResolvedValueOnce([blocked])
      .mockResolvedValueOnce([opened])

    createOnboardingInstanceMock.mockResolvedValue({ instanceId: 'onb-1' })
    withTransactionMock.mockImplementation(async (cb) => {
      const client = buildTxClient({ existing: blocked })

      txClients.push(client)

      return cb(client)
    })

    const result = await resolveHiringActivationBlocker({
      hiringHandoffId: 'hhof-1',
      actorUserId: 'user-hr',
      blockerKey: 'activation:onboarding_template_missing',
      action: 'retry-open-onboarding',
      payload: { reason: 'Plantilla corregida, reintentar.' },
    })

    expect(result.status).toBe('resolved')
    expect(result.resolved).toBe(true)
    expect(result.detail.request?.state).toBe('onboarding_open')
    expect(createOnboardingInstanceMock).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ memberId: 'mbr-9' }),
    }))

    const auditCall = txClients[0]?.query.mock.calls.find(([sql]) =>
      /hiring_activation_request_events/.test(String(sql)),
    )

    const auditMetadata = String((auditCall?.[1] as unknown[] | undefined)?.[10] ?? '')

    expect(auditMetadata).toContain('payloadDigest')
    expect(auditMetadata).toContain('"reason":"provided"')
    expect(auditMetadata).not.toContain('Plantilla corregida')
  })

  it('resolve-blocker devuelve not_resolvable cuando el blocker pertenece a otra surface', async () => {
    const blocked = requestRow({
      member_id: 'mbr-9',
      state: 'blocked',
      blocked_reason: 'legal_data_missing',
      blocked_detail: 'Falta completar datos legales.',
    })

    runQueryMock.mockResolvedValue([blocked])
    withTransactionMock.mockImplementation(async (cb) => cb(buildTxClient({ existing: blocked })))

    const result = await resolveHiringActivationBlocker({
      hiringHandoffId: 'hhof-1',
      actorUserId: 'user-hr',
      blockerKey: 'legal_data_missing',
      action: 'retry-open-onboarding',
      payload: {},
    })

    expect(result.status).toBe('not_resolvable')
    expect(result.resolved).toBe(false)
    expect(result.blocker.alternativeSurface?.href).toBe('/hr/workforce/activation?memberId=mbr-9')
    expect(createOnboardingInstanceMock).not.toHaveBeenCalled()
  })

  it('resolve-blocker falla cerrado si el blocker ya no está vigente', async () => {
    runQueryMock.mockResolvedValue([requestRow({ state: 'pending_hr_review', blocked_reason: null })])

    await expect(
      resolveHiringActivationBlocker({
        hiringHandoffId: 'hhof-1',
        actorUserId: 'user-hr',
        blockerKey: 'activation:onboarding_template_missing',
        action: 'retry-open-onboarding',
        payload: {},
      }),
    ).rejects.toMatchObject({ code: 'hiring_activation_blocker_stale' })

    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('payload digest de resolve-blocker es estable y no depende del orden de llaves', () => {
    const left = computeHiringActivationBlockerPayloadDigest({
      hiringHandoffId: 'hhof-1',
      blockerKey: 'onboarding_template_missing',
      action: 'retry-open-onboarding',
      payload: { reason: 'ok', extra: { b: 2, a: 1 } },
    })

    const right = computeHiringActivationBlockerPayloadDigest({
      hiringHandoffId: 'hhof-1',
      blockerKey: 'activation:onboarding_template_missing',
      action: 'retry-open-onboarding',
      payload: { extra: { a: 1, b: 2 }, reason: 'ok' },
    })

    expect(left).toBe(right)
  })
})
