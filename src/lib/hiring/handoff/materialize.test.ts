import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const captureWithDomainMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
  runGreenhousePostgresQuery: vi.fn(),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomainMock(...args),
}))

const { materializeHandoffFromApplication } = await import('./materialize')

// ── Boundary negativo: ninguna SQL emitida por el dominio puede tocar estas tablas ──
// (espejo bidireccional del boundary contractor↔payroll; ver task §Data model and invariants)
const FORBIDDEN_TABLES = [
  'members',
  'assignments',
  'placements',
  'payroll_entries',
  'payroll_adjustments',
  'compensation_versions',
  'final_settlements',
  'contractor_engagements',
  'providers',
  'expenses',
]

const capturedSql: string[] = []

const assertBoundary = () => {
  for (const sql of capturedSql) {
    for (const table of FORBIDDEN_TABLES) {
      expect(sql, `SQL del handoff no puede tocar "${table}"`).not.toMatch(
        new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+\\S*\\b${table}\\b`, 'i'),
      )
    }
  }
}

const appRow = (overrides: Record<string, unknown> = {}) => ({
  application_id: 'app-1',
  opening_id: 'opening-1',
  identity_profile_id: 'profile-1',
  candidate_facet_id: 'facet-1',
  decision: 'selected',
  selected_destination: 'internal_hire',
  tentative_start_date: '2026-08-01',
  expected_legal_entity: 'Efeonce SpA',
  prerequisites_snapshot_json: { assessment: 'done' },
  explainability_json: { decisionHistory: [{ decisionId: 'dec-1', decision: 'selected' }] },
  ...overrides,
})

const handoffRow = (overrides: Record<string, unknown> = {}) => ({
  hiring_handoff_id: 'hhof-1',
  hiring_application_id: 'app-1',
  opening_id: 'opening-1',
  decision_id: 'dec-1',
  identity_profile_id: 'profile-1',
  candidate_facet_id: 'facet-1',
  selected_destination: 'internal_hire',
  state: 'pending',
  expected_legal_entity: 'Efeonce SpA',
  tentative_start_date: '2026-08-01',
  prerequisites_snapshot_json: {},
  downstream_ref: null,
  blocked_reason: null,
  blocked_detail: null,
  state_changed_at: '2026-07-10T12:00:00.000Z',
  created_at: '2026-07-10T12:00:00.000Z',
  updated_at: '2026-07-10T12:00:00.000Z',
  ...overrides,
})

/**
 * Client mock ruteado por contenido de SQL: SELECT application → app; SELECT handoff FOR
 * UPDATE → existing; INSERT/UPDATE hiring_handoff → RETURNING; INSERT audit → ok.
 */
const buildClient = (options: {
  app: Record<string, unknown> | null
  existingHandoff: Record<string, unknown> | null
}) => {
  const inserts: unknown[][] = []
  const updates: unknown[][] = []
  const audits: unknown[][] = []

  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    capturedSql.push(sql)

    if (/FROM greenhouse_hiring\.hiring_application/i.test(sql)) {
      return { rows: options.app ? [options.app] : [] }
    }

    if (/FROM greenhouse_hiring\.hiring_handoff\b[\s\S]*FOR UPDATE/i.test(sql)) {
      return { rows: options.existingHandoff ? [options.existingHandoff] : [] }
    }

    if (/INSERT INTO greenhouse_hiring\.hiring_handoff\b/i.test(sql) && !/audit/i.test(sql)) {
      inserts.push(values)

      return {
        rows: [
          handoffRow({
            hiring_handoff_id: values[0],
            hiring_application_id: values[1],
            opening_id: values[2],
            decision_id: values[3],
            identity_profile_id: values[4],
            candidate_facet_id: values[5],
            selected_destination: values[6],
            state: values[7],
            expected_legal_entity: values[8],
            tentative_start_date: values[9],
            blocked_reason: values[11],
            blocked_detail: values[12],
          }),
        ],
      }
    }

    if (/UPDATE greenhouse_hiring\.hiring_handoff\b/i.test(sql)) {
      updates.push(values)

      const base = options.existingHandoff ?? handoffRow()

      return {
        rows: [
          {
            ...base,
            state: values[1],
            blocked_reason: values[2],
            blocked_detail: values[3],
          },
        ],
      }
    }

    if (/INSERT INTO greenhouse_hiring\.hiring_handoff_audit\b/i.test(sql)) {
      audits.push(values)

      return { rows: [] }
    }

    throw new Error(`SQL inesperada en el mock: ${sql.slice(0, 120)}`)
  })

  return { query, inserts, updates, audits }
}

describe('materializeHandoffFromApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedSql.length = 0
  })

  it('crea un handoff pending para selected + destino soportado y emite created', async () => {
    const client = buildClient({ app: appRow(), existingHandoff: null })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome.kind).toBe('created')
    if (outcome.kind !== 'created') throw new Error('unreachable')
    expect(outcome.handoff.state).toBe('pending')
    expect(outcome.handoff.selectedDestination).toBe('internal_hire')
    expect(client.inserts).toHaveLength(1)
    expect(client.audits).toHaveLength(1)
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.handoff.created', aggregateType: 'hiring_handoff' }),
      expect.anything(),
    )
    assertBoundary()
  })

  it('destino sin owner (contractor) nace blocked:destination_not_supported — nunca pending mudo', async () => {
    const client = buildClient({
      app: appRow({ selected_destination: 'contractor' }),
      existingHandoff: null,
    })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome.kind).toBe('blocked')
    if (outcome.kind !== 'blocked') throw new Error('unreachable')
    expect(outcome.handoff.state).toBe('blocked')
    expect(outcome.handoff.blockedReason).toBe('destination_not_supported')
    assertBoundary()
  })

  it.each(['rejected', 'withdrawn', 'on_hold', 'backup_selected'] as const)(
    'decision=%s sin handoff previo → no-op explícito, cero escrituras',
    async (decision) => {
      const client = buildClient({ app: appRow({ decision }), existingHandoff: null })

      withTransactionMock.mockImplementation(async (callback) => callback(client))

      const outcome = await materializeHandoffFromApplication('app-1')

      expect(outcome).toEqual({ kind: 'noop', reason: 'decision-not-selected' })
      expect(client.inserts).toHaveLength(0)
      expect(client.updates).toHaveLength(0)
      expect(publishOutboxEventMock).not.toHaveBeenCalled()
    },
  )

  it('mismo decision_id → no-op idempotente (replay/coalescing)', async () => {
    const client = buildClient({ app: appRow(), existingHandoff: handoffRow({ decision_id: 'dec-1' }) })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome).toEqual({ kind: 'noop', reason: 'same-decision' })
    expect(client.updates).toHaveLength(0)
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('re-decisión sobre pending actualiza destino + audita + emite decision_superseded', async () => {
    const client = buildClient({
      app: appRow({
        selected_destination: 'staff_augmentation',
        explainability_json: { decisionHistory: [{ decisionId: 'dec-1' }, { decisionId: 'dec-2' }] },
      }),
      existingHandoff: handoffRow({ decision_id: 'dec-1', state: 'pending' }),
    })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome.kind).toBe('superseded')
    expect(client.updates).toHaveLength(1)
    expect(client.audits).toHaveLength(1)
    expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.handoff.decision_superseded' }),
      expect.anything(),
    )
    assertBoundary()
  })

  it('re-decisión sobre approved → blocked:decision_superseded_after_approval (nunca overwrite)', async () => {
    const client = buildClient({
      app: appRow({
        selected_destination: 'staff_augmentation',
        explainability_json: { decisionHistory: [{ decisionId: 'dec-2' }] },
      }),
      existingHandoff: handoffRow({ decision_id: 'dec-1', state: 'approved' }),
    })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome.kind).toBe('blocked')
    if (outcome.kind !== 'blocked') throw new Error('unreachable')
    expect(outcome.handoff.blockedReason).toBe('decision_superseded_after_approval')

    // El destino aprobado NO se sobrescribe (el update solo transiciona el estado).
    const updateValues = client.updates[0]

    expect(updateValues).toContain('blocked')
    expect(updateValues).not.toContain('staff_augmentation')
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.handoff.blocked' }),
      expect.anything(),
    )
    assertBoundary()
  })

  it('revocación (selected→rejected) sobre pending → cancelled auditado', async () => {
    const client = buildClient({
      app: appRow({ decision: 'rejected', explainability_json: { decisionHistory: [{ decisionId: 'dec-2' }] } }),
      existingHandoff: handoffRow({ decision_id: 'dec-1', state: 'pending' }),
    })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome.kind).toBe('revoked')
    expect(client.updates[0]).toContain('cancelled')
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'hiring.handoff.cancelled' }),
      expect.anything(),
    )
    assertBoundary()
  })

  it('revocación sobre approved → blocked:decision_revoked (downstream pudo haber empezado)', async () => {
    const client = buildClient({
      app: appRow({ decision: 'withdrawn', explainability_json: { decisionHistory: [{ decisionId: 'dec-2' }] } }),
      existingHandoff: handoffRow({ decision_id: 'dec-1', state: 'approved' }),
    })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    const outcome = await materializeHandoffFromApplication('app-1')

    expect(outcome.kind).toBe('blocked')
    if (outcome.kind !== 'blocked') throw new Error('unreachable')
    expect(outcome.handoff.blockedReason).toBe('decision_revoked')
    assertBoundary()
  })

  it('selected sin decisionHistory → resolver loud (throw + captureWithDomain), nunca mudo', async () => {
    const client = buildClient({
      app: appRow({ explainability_json: {} }),
      existingHandoff: null,
    })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    await expect(materializeHandoffFromApplication('app-1')).rejects.toMatchObject({
      code: 'hiring_handoff_decision_id_missing',
    })
    expect(captureWithDomainMock).toHaveBeenCalledWith(
      expect.anything(),
      'hiring',
      expect.anything(),
    )
  })

  it('application inexistente → resolver loud (anomalía de datos)', async () => {
    const client = buildClient({ app: null, existingHandoff: null })

    withTransactionMock.mockImplementation(async (callback) => callback(client))

    await expect(materializeHandoffFromApplication('app-x')).rejects.toMatchObject({
      code: 'hiring_handoff_application_missing',
    })
    expect(captureWithDomainMock).toHaveBeenCalled()
  })
})
