import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
  runGreenhousePostgresQuery: vi.fn(),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

const { transitionHiringHandoff } = await import('./transition')

const handoffRow = (overrides: Record<string, unknown> = {}) => ({
  hiring_handoff_id: 'hhof-1',
  hiring_application_id: 'app-1',
  opening_id: 'opening-1',
  decision_id: 'dec-1',
  identity_profile_id: 'profile-1',
  candidate_facet_id: 'facet-1',
  selected_destination: 'internal_hire',
  state: 'pending',
  expected_legal_entity: null,
  tentative_start_date: null,
  prerequisites_snapshot_json: {},
  downstream_ref: null,
  blocked_reason: null,
  blocked_detail: null,
  state_changed_at: '2026-07-10T12:00:00.000Z',
  created_at: '2026-07-10T12:00:00.000Z',
  updated_at: '2026-07-10T12:00:00.000Z',
  ...overrides,
})

const buildClient = (existing: Record<string, unknown> | null) => {
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (/FOR UPDATE/i.test(sql)) {
      return { rows: existing ? [existing] : [] }
    }

    if (/UPDATE greenhouse_hiring\.hiring_handoff\b/i.test(sql)) {
      const downstreamRef = sql.includes('downstream_ref = $5') ? values[4] : (existing as Record<string, unknown>)?.downstream_ref

      return { rows: [{ ...existing, state: values[1], downstream_ref: downstreamRef ?? null }] }
    }

    if (/hiring_handoff_audit/i.test(sql)) {
      return { rows: [] }
    }

    throw new Error(`SQL inesperada: ${sql.slice(0, 100)}`)
  })

  return { query }
}

describe('transitionHiringHandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aprueba un handoff pending y emite hiring.handoff.approved', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildClient(handoffRow())))

    const result = await transitionHiringHandoff({ handoffId: 'hhof-1', action: 'approve', actorUserId: 'user-hr' })

    expect(result.idempotentReplay).toBe(false)
    expect(result.handoff.state).toBe('approved')
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.handoff.approved', aggregateType: 'hiring_handoff' }),
      expect.anything(),
    )
  })

  it('replay idempotente: transicionar al estado actual no escribe ni emite', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildClient(handoffRow({ state: 'approved' }))))

    const result = await transitionHiringHandoff({ handoffId: 'hhof-1', action: 'approve', actorUserId: 'user-hr' })

    expect(result.idempotentReplay).toBe(true)
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('rechaza transiciones inválidas con código estable (409)', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildClient(handoffRow({ state: 'pending' }))))

    await expect(
      transitionHiringHandoff({ handoffId: 'hhof-1', action: 'complete', actorUserId: 'user-hr', downstreamRef: 'mbr-1' }),
    ).rejects.toMatchObject({ code: 'hiring_handoff_invalid_transition', statusCode: 409 })
  })

  it('completar exige downstream_ref como evidencia (nunca por inferencia)', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildClient(handoffRow({ state: 'approved' }))))

    await expect(
      transitionHiringHandoff({ handoffId: 'hhof-1', action: 'complete', actorUserId: 'user-hr' }),
    ).rejects.toMatchObject({ code: 'hiring_handoff_downstream_ref_required' })
  })

  it('completa con downstream_ref y lo persiste', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildClient(handoffRow({ state: 'approved' }))))

    const result = await transitionHiringHandoff({
      handoffId: 'hhof-1',
      action: 'complete',
      actorUserId: 'user-hr',
      downstreamRef: 'member:mbr-123',
    })

    expect(result.handoff.state).toBe('completed')
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.handoff.completed' }),
      expect.anything(),
    )
  })

  it('NUNCA aprueba un destino sin owner downstream (aunque esté pending)', async () => {
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildClient(handoffRow({ selected_destination: 'partner' }))),
    )

    await expect(
      transitionHiringHandoff({ handoffId: 'hhof-1', action: 'approve', actorUserId: 'user-hr' }),
    ).rejects.toMatchObject({ code: 'hiring_handoff_destination_not_supported' })
  })

  it('cancela desde blocked (resolución humana del supersede)', async () => {
    withTransactionMock.mockImplementation(async (cb) =>
      cb(buildClient(handoffRow({ state: 'blocked', blocked_reason: 'decision_superseded_after_approval' }))),
    )

    const result = await transitionHiringHandoff({
      handoffId: 'hhof-1',
      action: 'cancel',
      actorUserId: 'user-hr',
      reasonCode: 'superseded_resolution',
    })

    expect(result.handoff.state).toBe('cancelled')
  })

  it('handoff inexistente → HiringNotFoundError', async () => {
    withTransactionMock.mockImplementation(async (cb) => cb(buildClient(null)))

    await expect(
      transitionHiringHandoff({ handoffId: 'hhof-x', action: 'approve', actorUserId: 'user-hr' }),
    ).rejects.toMatchObject({ code: 'hiring_handoff_not_found' })
  })
})
