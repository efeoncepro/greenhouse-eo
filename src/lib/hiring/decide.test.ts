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

const { decideHiringApplication } = await import('./decide')

const baseRow = {
  application_id: 'app-1',
  public_id: 'EO-APP-0001',
  opening_id: 'opening-1',
  identity_profile_id: 'profile-1',
  candidate_facet_id: 'facet-1',
  owner_user_id: null,
  stage: 'decision_pending',
  score: 84,
  match_score: 91,
  blocking_issues: [],
  next_step_at: null,
  source: 'public_careers',
  notes: null,
  explainability_json: {},
  dedupe_fingerprint: null,
  decision: null,
  decision_at: null,
  decision_by: null,
  selected_destination: null,
  tentative_start_date: null,
  expected_legal_entity: null,
  expected_context: null,
  prerequisites_snapshot_json: {},
  created_by: 'user-1',
  created_at: '2026-07-08T12:00:00.000Z',
  updated_at: '2026-07-08T12:00:00.000Z',
}

describe('decideHiringApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('locks the application, appends a defendible decision and emits the seam event in the same transaction', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [baseRow] })
      .mockImplementationOnce(async (_sql: string, values: unknown[]) => ({
        rows: [{
          ...baseRow,
          decision: values[1],
          decision_at: values[2],
          decision_by: values[3],
          selected_destination: values[4],
          tentative_start_date: values[5],
          expected_legal_entity: values[6],
          expected_context: values[7],
          prerequisites_snapshot_json: JSON.parse(String(values[8])),
          stage: values[9],
          explainability_json: { decisionHistory: JSON.parse(String(values[10])) },
        }],
      }))

    withTransactionMock.mockImplementation(async (callback) => callback({ query }))

    const result = await decideHiringApplication('app-1', {
      decision: 'selected',
      selectedDestination: 'internal_hire',
      tentativeStartDate: '2026-08-01',
      expectedLegalEntity: 'Efeonce SpA',
      expectedContext: 'Growth · Chile',
      prerequisitesSnapshot: { assessmentCount: 1 },
      idempotencyKey: 'decision-attempt-1',
      reason: { summary: 'La evidencia del proceso confirma un ajuste consistente al rol.', evidence: ['Scorecard revisado'] },
    }, 'user-hr')

    expect(result.idempotentReplay).toBe(false)
    expect(result.application).toMatchObject({ decision: 'selected', stage: 'selected', selectedDestination: 'internal_hire' })
    expect(result.decisionEntry).toMatchObject({
      idempotencyKey: 'decision-attempt-1',
      decidedBy: 'user-hr',
      supersedesDecisionId: null,
    })
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE')
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'hiring_application',
        aggregateId: 'app-1',
        eventType: 'hiring.application.decided',
      }),
      expect.anything(),
    )
  })

  it('replays the same idempotency key without updating or publishing a second event', async () => {
    const existingEntry = {
      decisionId: 'decision-1',
      idempotencyKey: 'same-key',
      decision: 'on_hold',
      decidedAt: '2026-07-09T10:00:00.000Z',
      decidedBy: 'user-hr',
      reason: { summary: 'Esperamos una referencia laboral adicional.' },
      selectedDestination: null,
      tentativeStartDate: null,
      expectedLegalEntity: null,
      expectedContext: null,
      prerequisitesSnapshot: {},
      supersedesDecisionId: null,
    }

    const query = vi.fn().mockResolvedValueOnce({
      rows: [{ ...baseRow, decision: 'on_hold', explainability_json: { decisionHistory: [existingEntry] } }],
    })

    withTransactionMock.mockImplementation(async (callback) => callback({ query }))

    const result = await decideHiringApplication('app-1', {
      decision: 'on_hold',
      idempotencyKey: 'same-key',
      reason: { summary: 'Esperamos una referencia laboral adicional.' },
    }, 'user-hr')

    expect(result.idempotentReplay).toBe(true)
    expect(query).toHaveBeenCalledTimes(1)
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('requires a human reason and a destination for positive selection decisions', async () => {
    await expect(decideHiringApplication('app-1', {
      decision: 'selected',
      idempotencyKey: 'invalid-1',
      reason: { summary: 'Corta' },
    }, 'user-hr')).rejects.toMatchObject({ code: 'hiring_decision_reason_required' })

    await expect(decideHiringApplication('app-1', {
      decision: 'selected',
      idempotencyKey: 'invalid-2',
      reason: { summary: 'Razón humana con extensión suficiente.' },
    }, 'user-hr')).rejects.toMatchObject({ code: 'hiring_destination_required' })

    expect(withTransactionMock).not.toHaveBeenCalled()
  })
})
