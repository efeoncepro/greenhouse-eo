import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queries: { text: string; values: unknown[] }[] = []

type Handler = { match: RegExp; rows: Record<string, unknown>[] | (() => Record<string, unknown>[]) }

let handlers: Handler[] = []

const fakeClient = {
  query: vi.fn(async (text: string, values: unknown[] = []) => {
    queries.push({ text, values })

    const handler = handlers.find(h => h.match.test(text))
    const rows = handler ? (typeof handler.rows === 'function' ? handler.rows() : handler.rows) : []

    return { rows, rowCount: rows.length }
  }),
}

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(fakeClient)),
  runGreenhousePostgresQuery: vi.fn(async () => []),
}))

type OutboxCall = { eventType: string; payload: Record<string, unknown> }

const publishOutboxEvent = vi.fn(async (event: OutboxCall) => `outbox-${event.eventType}`)

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (event: OutboxCall) => publishOutboxEvent(event),
}))

/** Ledger de entregas simulado, con clave exacta `${entity}:${emailType}`. */
const deliveredEmails = new Set<string>()

const wasEmailDispatchedForEntity = vi.fn(async (entity: string, emailType: string) =>
  deliveredEmails.has(`${entity}:${emailType}`),
)

vi.mock('@/lib/email/delivery', () => ({
  wasEmailDispatchedForEntity: (entity: string, emailType: string) => wasEmailDispatchedForEntity(entity, emailType),
}))

const { cancelCandidateTest } = await import('./cancel')
const { OPEN_ASSESSMENT_INSTANCE_STATUSES } = await import('./instances')

// ── Fixtures ──

const ACTOR = 'user-ops-1'

const assessmentRow = (status: string, overrides: Record<string, unknown> = {}) => ({
  assessment_id: 'asmt-1',
  public_id: 'EO-ASM-0001',
  application_id: 'happ-1',
  template_id: 'atpl-1',
  method: 'candidate_test',
  evaluator_user_id: null,
  status,
  time_limit_minutes: 45,
  accommodations_json: {},
  started_at: null,
  submitted_at: null,
  created_by: 'user-1',
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
  ...overrides,
})

/**
 * SELECT ... FOR UPDATE devuelve `current`; el UPDATE de la instancia devuelve la fila ya
 * cancelada; el UPDATE del LEDGER devuelve la fila superseded.
 *
 * ⚠️ El handler del ledger va PRIMERO: `handlers.find` gana por orden y
 * `hiring_assessment_assignment` empieza por `hiring_assessment`. Invertirlos haría que el
 * supersede devolviera una fila de assessment y el test dejaría de describir la realidad.
 */
const arrange = (current: string) => {
  handlers = [
    { match: /FOR UPDATE/i, rows: [assessmentRow(current)] },
    { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ assignment_id: 'hoaa-1' }] },
    { match: /UPDATE greenhouse_hiring\.hiring_assessment\b/, rows: [assessmentRow('cancelled')] },
  ]
}

/** El UPDATE de la INSTANCIA, nunca el del ledger (`\b(?!_)` corta `_assignment`). */
const findUpdate = () => queries.find(q => /UPDATE greenhouse_hiring\.hiring_assessment\b(?!_)/.test(q.text))

beforeEach(() => {
  queries.length = 0
  handlers = []
  publishOutboxEvent.mockClear()
  wasEmailDispatchedForEntity.mockClear()
  deliveredEmails.clear()
})

describe('cancelCandidateTest — TASK-1719 Slice 3', () => {
  it('cancela una evaluación en `assigned`', async () => {
    arrange('assigned')

    const result = await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    expect(result.outcome).toBe('cancelled')
    expect(result.assessment.status).toBe('cancelled')
    // No salió correo todavía: nada que corregir hacia el candidato.
    expect(result.operatorFollowupRequired).toBe(false)
    expect(result.followupReason).toBeNull()
  })

  it('cancela una evaluación en `sent` y exige comunicación correctiva humana', async () => {
    arrange('sent')

    const result = await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'wrong_template' }, ACTOR)

    expect(result.outcome).toBe('cancelled')
    // El link ya viajó al candidato: cancelar deja un enlace muerto en su bandeja.
    expect(result.operatorFollowupRequired).toBe(true)
    expect(result.followupReason).toBe('candidate_link_already_delivered')
  })

  it('invalida el token de acceso en el mismo write que el estado', async () => {
    arrange('assigned')

    await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    const update = findUpdate()

    expect(update).toBeDefined()
    expect(update?.text).toMatch(/access_token_hash\s*=\s*NULL/i)
    expect(update?.text).toMatch(/status\s*=\s*'cancelled'/i)
  })

  it.each(['in_progress', 'submitted', 'scored'])(
    'rechaza con 409 cuando el candidato ya empezó (%s)',
    async status => {
      arrange(status)

      await expect(
        cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR),
      ).rejects.toMatchObject({ statusCode: 409, code: 'assessment_cancel_candidate_started' })

      // Nada se escribió ni se publicó.
      expect(findUpdate()).toBeUndefined()
      expect(publishOutboxEvent).not.toHaveBeenCalled()
    },
  )

  it('la doble cancelación es un no-op idempotente, nunca un error', async () => {
    handlers = [{ match: /FOR UPDATE/i, rows: [assessmentRow('cancelled')] }]

    const result = await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    expect(result.outcome).toBe('already_cancelled')
    expect(result.assessment.status).toBe('cancelled')
    expect(findUpdate()).toBeUndefined()
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('el no-op idempotente sigue declarando el followup desde el ledger de entregas', async () => {
    handlers = [{ match: /FOR UPDATE/i, rows: [assessmentRow('cancelled')] }]
    deliveredEmails.add('asmt-1:hiring_assessment_assigned')

    const result = await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    expect(result.outcome).toBe('already_cancelled')
    expect(result.operatorFollowupRequired).toBe(true)
  })

  it('declara followup cuando el ledger registra el correo aunque el estado sea `assigned`', async () => {
    arrange('assigned')
    deliveredEmails.add('asmt-1:hiring_assessment_assigned')

    const result = await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    expect(result.operatorFollowupRequired).toBe(true)
    expect(wasEmailDispatchedForEntity).toHaveBeenCalledWith('asmt-1', 'hiring_assessment_assigned')
  })

  it('rechaza con 409 cuando `expectedStatus` quedó desalineado', async () => {
    arrange('sent')

    await expect(
      cancelCandidateTest(
        { assessmentId: 'asmt-1', reasonCode: 'sent_in_error', expectedStatus: 'assigned' },
        ACTOR,
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: 'assessment_cancel_stale_state' })

    expect(findUpdate()).toBeUndefined()
  })

  it('acepta `expectedStatus` alineado', async () => {
    arrange('sent')

    const result = await cancelCandidateTest(
      { assessmentId: 'asmt-1', reasonCode: 'sent_in_error', expectedStatus: 'sent' },
      ACTOR,
    )

    expect(result.outcome).toBe('cancelled')
  })

  it('el evento publicado no lleva PII, token, nota ni score', async () => {
    arrange('sent')

    await cancelCandidateTest(
      { assessmentId: 'asmt-1', reasonCode: 'duplicate_assignment', note: 'Carlos Pérez, carlos@correo.cl' },
      ACTOR,
    )

    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)

    const event = publishOutboxEvent.mock.calls[0]?.[0] as OutboxCall

    expect(event.eventType).toBe('hiring.assessment.cancelled')
    expect(event.payload).toEqual({
      assessmentId: 'asmt-1',
      applicationId: 'happ-1',
      templateId: 'atpl-1',
      method: 'candidate_test',
      previousStatus: 'sent',
      reasonCode: 'duplicate_assignment',
      hasNote: true,
      actorUserId: ACTOR,
      supersededAssignmentIds: ['hoaa-1'],
    })

    // Ningún campo del payload contiene la nota, un correo, un nombre ni un hash de token.
    const serialized = JSON.stringify(event.payload)

    expect(serialized).not.toMatch(/Carlos|correo\.cl|token/i)
  })

  it('exige actor, motivo de la allowlist y nota acotada', async () => {
    arrange('assigned')

    await expect(cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, '')).rejects.toMatchObject(
      { statusCode: 401, code: 'assessment_cancel_missing_actor' },
    )

    await expect(
      cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'porque_si' as never }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 400, code: 'assessment_cancel_invalid_reason' })

    await expect(
      cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'other', note: 'x'.repeat(501) }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 400, code: 'assessment_cancel_note_too_long' })
  })

  it('404 si la instancia no existe; 409 si no es candidate_test', async () => {
    handlers = []

    await expect(
      cancelCandidateTest({ assessmentId: 'asmt-x', reasonCode: 'sent_in_error' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 404, code: 'assessment_not_found' })

    handlers = [{ match: /FOR UPDATE/i, rows: [assessmentRow('assigned', { method: 'interviewer_scorecard' })] }]

    await expect(
      cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR),
    ).rejects.toMatchObject({ statusCode: 409, code: 'assessment_cancel_method_not_supported' })
  })

  it('SUPERSEDE la fila vigente del ledger en la MISMA transacción que cancela la instancia', async () => {
    // Cancelar libera DOS llaves, no una. `cancelled` sale solo del índice de instancia abierta
    // (estructural), pero el índice del ledger — (application, policy, versión, etapa, intento)
    // WHERE superseded_at IS NULL — sólo se libera con este write. Sin él, re-asignar por el
    // command gobernado devolvía `already_assigned` con el assessmentId CANCELADO, y el carril
    // automático leía ese `assigned` y no comunicaba nada.
    arrange('assigned')

    await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'wrong_template' }, ACTOR)

    const supersede = queries.find(q =>
      /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/.test(q.text),
    )

    expect(supersede, 'cancelar DEBE superseder el ledger; sin esto el cupo nunca se libera').toBeDefined()
    expect(supersede?.text).toMatch(/superseded_at\s*=\s*NOW\(\)/i)
    expect(supersede?.text).toMatch(/outcome\s*=\s*'cancelled'/i)
    // Sólo la fila VIGENTE de esa instancia: nunca reescribe historia ya superseded.
    expect(supersede?.text).toMatch(/WHERE assessment_id = \$1 AND superseded_at IS NULL/i)
    expect(supersede?.values).toEqual(['asmt-1', 'operator_cancelled'])

    // Y va DENTRO de la tx (mismo fake client) y ANTES de publicar el evento.
    const updateIndex = queries.findIndex(q => /UPDATE greenhouse_hiring\.hiring_assessment\b(?!_)/.test(q.text))
    const supersedeIndex = queries.findIndex(q => /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/.test(q.text))

    expect(updateIndex).toBeGreaterThanOrEqual(0)
    expect(supersedeIndex).toBeGreaterThan(updateIndex)
  })

  it('sin fila de ledger (instancia del camino legacy) el supersede es un no-op, NUNCA un error', async () => {
    // `assignCandidateTest` (route manual pre-policy) no escribe ledger. Cancelar esas
    // instancias tiene que seguir funcionando: 0 filas afectadas es legítimo.
    handlers = [
      { match: /FOR UPDATE/i, rows: [assessmentRow('assigned')] },
      { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [] },
      { match: /UPDATE greenhouse_hiring\.hiring_assessment\b/i, rows: [assessmentRow('cancelled')] },
    ]

    const result = await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    expect(result.outcome).toBe('cancelled')

    const event = publishOutboxEvent.mock.calls[0]?.[0] as OutboxCall

    expect(event.payload.supersededAssignmentIds).toEqual([])
  })

  it('el no-op idempotente NO vuelve a tocar el ledger', async () => {
    handlers = [{ match: /FOR UPDATE/i, rows: [assessmentRow('cancelled')] }]

    await cancelCandidateTest({ assessmentId: 'asmt-1', reasonCode: 'sent_in_error' }, ACTOR)

    expect(queries.some(q => /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/.test(q.text))).toBe(false)
  })

  it('`cancelled` queda fuera del predicado de instancia abierta', () => {
    // La otra mitad de la recuperación, la estructural: si alguien agregara `cancelled` acá,
    // cancelar dejaría de liberar (application_id, template_id) y el retake sería imposible.
    expect(OPEN_ASSESSMENT_INSTANCE_STATUSES).not.toContain('cancelled')
  })
})
