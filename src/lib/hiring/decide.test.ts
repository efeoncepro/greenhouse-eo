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
  decision_cause: null,
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
      // Audit 2026-07-10: validación del contexto — el opening debe estar vivo para selected.
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
      // TASK-1383: COUNT de instancias scored para el snapshot del assessment en la decisión.
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockImplementationOnce(async (_sql: string, values: unknown[]) => ({
        rows: [{
          ...baseRow,
          decision: values[1],
          // TASK-1765 — `decision_cause` entra como $3 en el MISMO UPDATE que `decision`: la
          // bicondicional de base no admite escribirlos por separado.
          decision_cause: values[2],
          decision_at: values[3],
          decision_by: values[4],
          selected_destination: values[5],
          tentative_start_date: values[6],
          expected_legal_entity: values[7],
          expected_context: values[8],
          prerequisites_snapshot_json: JSON.parse(String(values[9])),
          stage: values[10],
          explainability_json: { decisionHistory: JSON.parse(String(values[11])) },
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
    // TASK-1765 — un desenlace terminal escribe `stage='closed'`, NO la etapa espejo `selected`.
    expect(result.application).toMatchObject({ decision: 'selected', stage: 'closed', selectedDestination: 'internal_hire' })
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

  // ── TASK-1765 — el eje de desenlace: causa gobernada y colapso de etapa ──

  describe('TASK-1765 — la causa es una bicondicional, no un campo opcional', () => {
    const openRow = (over: Record<string, unknown> = {}) => ({ ...baseRow, ...over })

    /** Un `not_selected` completo: 4 queries (lock → snapshot → update). Sin opening check. */
    const buildDecidingClient = () => {
      const captured: { values?: unknown[] } = {}

      const query = vi.fn()
        .mockResolvedValueOnce({ rows: [openRow()] })
        .mockResolvedValueOnce({ rows: [{ n: 0 }] })
        .mockImplementationOnce(async (_sql: string, values: unknown[]) => {
          captured.values = values

          return {
            rows: [{
              ...openRow(),
              decision: values[1],
              decision_cause: values[2],
              decision_at: values[3],
              decision_by: values[4],
              selected_destination: values[5],
              prerequisites_snapshot_json: JSON.parse(String(values[9])),
              stage: values[10],
              explainability_json: { decisionHistory: JSON.parse(String(values[11])) },
            }],
          }
        })

      withTransactionMock.mockImplementation(async (callback) => callback({ query }))

      return { query, captured }
    }

    it('`not_selected` SIN causa se rechaza con 422 antes de tocar la base', async () => {
      const query = vi.fn()

      withTransactionMock.mockImplementation(async (callback) => callback({ query }))

      await expect(decideHiringApplication('app-1', {
        decision: 'not_selected',
        idempotencyKey: 'sin-causa-1',
        reason: { summary: 'El cupo lo tomó otra persona del proceso.' },
      }, 'user-hr')).rejects.toMatchObject({ code: 'hiring_decision_cause_required', statusCode: 422 })

      // La validación ocurre ANTES de abrir la transacción: la violación no llega a PG como 500.
      expect(query).not.toHaveBeenCalled()
    })

    it.each(['selected', 'backup_selected', 'rejected', 'withdrawn', 'unresponsive'] as const)(
      '`%s` CON causa se rechaza: la causa sólo existe para quien llegó al final y no quedó',
      async (decision) => {
        const query = vi.fn()

        withTransactionMock.mockImplementation(async (callback) => callback({ query }))

        await expect(decideHiringApplication('app-1', {
          decision,
          cause: 'capacity_filled',
          selectedDestination: 'internal_hire',
          idempotencyKey: `causa-invalida-${decision}`,
          reason: { summary: 'Una razón suficientemente larga para pasar el mínimo.' },
        }, 'user-hr')).rejects.toMatchObject({ code: 'hiring_decision_cause_not_allowed', statusCode: 422 })

        expect(query).not.toHaveBeenCalled()
      },
    )

    it('una causa fuera del enum se rechaza: NUNCA es texto libre', async () => {
      await expect(decideHiringApplication('app-1', {
        decision: 'not_selected',
        cause: 'porque_si' as never,
        idempotencyKey: 'causa-libre-1',
        reason: { summary: 'Una razón suficientemente larga para pasar el mínimo.' },
      }, 'user-hr')).rejects.toMatchObject({ code: 'hiring_decision_cause_invalid' })
    })

    it('persiste desenlace y causa en el MISMO UPDATE, y cierra la etapa', async () => {
      const { captured } = buildDecidingClient()

      const result = await decideHiringApplication('app-1', {
        decision: 'not_selected',
        cause: 'capacity_filled',
        idempotencyKey: 'no-selec-1',
        reason: { summary: 'Llegó al final del proceso y el cupo lo tomó otra persona.' },
      }, 'user-hr')

      expect(result.application).toMatchObject({
        decision: 'not_selected',
        decisionCause: 'capacity_filled',
        stage: 'closed',
      })

      // Desenlace ($2) y causa ($3) viajan en la misma lista de parámetros del mismo statement.
      expect(captured.values?.[1]).toBe('not_selected')
      expect(captured.values?.[2]).toBe('capacity_filled')

      // La causa vive TAMBIÉN en la entrada de historial, no sólo en la columna snapshot.
      expect(result.decisionEntry).toMatchObject({ decision: 'not_selected', cause: 'capacity_filled' })
    })

    it('el evento lleva la causa y NO lleva la razón ni el nombre del candidato', async () => {
      buildDecidingClient()

      await decideHiringApplication('app-1', {
        decision: 'not_selected',
        cause: 'opening_closed',
        idempotencyKey: 'no-selec-2',
        reason: { summary: 'Cerramos la búsqueda antes de terminar el proceso.' },
      }, 'user-hr')

      const [event] = publishOutboxEventMock.mock.calls[0]

      expect(event.payload).toMatchObject({ decision: 'not_selected', cause: 'opening_closed' })

      // La causa es un enum gobernado, no PII. La RAZÓN sí lo es y nunca sale al outbox.
      expect(JSON.stringify(event.payload)).not.toContain('Cerramos la búsqueda')
    })

    it('misma clave de idempotencia con DISTINTA causa da 409, no un replay silencioso', async () => {
      const existingEntry = {
        decisionId: 'decision-1',
        idempotencyKey: 'misma-clave',
        decision: 'not_selected',
        cause: 'capacity_filled',
        decidedAt: '2026-08-22T10:00:00.000Z',
        decidedBy: 'user-hr',
        reason: { summary: 'Llegó al final del proceso y el cupo lo tomó otra persona.' },
        selectedDestination: null,
        tentativeStartDate: null,
        expectedLegalEntity: null,
        expectedContext: null,
        prerequisitesSnapshot: {},
        supersedesDecisionId: null,
      }

      const query = vi.fn().mockResolvedValue({
        rows: [{ ...baseRow, decision: 'not_selected', decision_cause: 'capacity_filled', explainability_json: { decisionHistory: [existingEntry] } }],
      })

      withTransactionMock.mockImplementation(async (callback) => callback({ query }))

      await expect(decideHiringApplication('app-1', {
        decision: 'not_selected',
        cause: 'process_cancelled',
        idempotencyKey: 'misma-clave',
        reason: { summary: 'Llegó al final del proceso y el cupo lo tomó otra persona.' },
      }, 'user-hr')).rejects.toMatchObject({ code: 'hiring_decision_idempotency_conflict', statusCode: 409 })

      expect(publishOutboxEventMock).not.toHaveBeenCalled()
    })

    it('misma clave y MISMA causa sí es replay idempotente', async () => {
      const existingEntry = {
        decisionId: 'decision-1',
        idempotencyKey: 'misma-clave',
        decision: 'not_selected',
        cause: 'capacity_filled',
        decidedAt: '2026-08-22T10:00:00.000Z',
        decidedBy: 'user-hr',
        reason: { summary: 'Llegó al final del proceso y el cupo lo tomó otra persona.' },
        selectedDestination: null,
        tentativeStartDate: null,
        expectedLegalEntity: null,
        expectedContext: null,
        prerequisitesSnapshot: {},
        supersedesDecisionId: null,
      }

      const query = vi.fn().mockResolvedValue({
        rows: [{ ...baseRow, decision: 'not_selected', decision_cause: 'capacity_filled', explainability_json: { decisionHistory: [existingEntry] } }],
      })

      withTransactionMock.mockImplementation(async (callback) => callback({ query }))

      const result = await decideHiringApplication('app-1', {
        decision: 'not_selected',
        cause: 'capacity_filled',
        idempotencyKey: 'misma-clave',
        reason: { summary: 'Llegó al final del proceso y el cupo lo tomó otra persona.' },
      }, 'user-hr')

      expect(result.idempotentReplay).toBe(true)
      expect(publishOutboxEventMock).not.toHaveBeenCalled()
    })

    it('una entrada de historial ANTERIOR a la causa no entra en conflicto consigo misma al reintentar', async () => {
      // Las entradas escritas antes de TASK-1765 no tienen `cause`. Son inmutables y NUNCA se
      // reescriben: el replay debe reconocerlas, no tratarlas como un payload distinto.
      const legacyEntry = {
        decisionId: 'decision-legacy',
        idempotencyKey: 'clave-legacy',
        decision: 'rejected',
        decidedAt: '2026-07-09T10:00:00.000Z',
        decidedBy: 'user-hr',
        reason: { summary: 'La evidencia del proceso no respalda un avance en este rol.' },
        selectedDestination: null,
        tentativeStartDate: null,
        expectedLegalEntity: null,
        expectedContext: null,
        prerequisitesSnapshot: {},
        supersedesDecisionId: null,
      }

      const query = vi.fn().mockResolvedValue({
        rows: [{ ...baseRow, decision: 'rejected', explainability_json: { decisionHistory: [legacyEntry] } }],
      })

      withTransactionMock.mockImplementation(async (callback) => callback({ query }))

      const result = await decideHiringApplication('app-1', {
        decision: 'rejected',
        idempotencyKey: 'clave-legacy',
        reason: { summary: 'La evidencia del proceso no respalda un avance en este rol.' },
      }, 'user-hr')

      expect(result.idempotentReplay).toBe(true)
    })
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
