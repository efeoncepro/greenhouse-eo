import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queries: { text: string; values: unknown[] }[] = []

type Handler = { match: RegExp; rows: Record<string, unknown>[] }

let handlers: Handler[] = []

const fakeClient = {
  query: vi.fn(async (text: string, values: unknown[] = []) => {
    queries.push({ text, values })

    const handler = handlers.find(h => h.match.test(text))

    return { rows: handler ? handler.rows : [], rowCount: handler ? handler.rows.length : 0 }
  }),
}

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(fakeClient)),
  runGreenhousePostgresQuery: vi.fn(async () => []),
}))

const publishOutboxEvent = vi.fn(async (event: { eventType: string; payload: unknown }) => `outbox-${event.eventType}`)

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (event: { eventType: string; payload: unknown }) => publishOutboxEvent(event),
}))

const { assignCandidateTest, insertCandidateTest, OPEN_ASSESSMENT_INSTANCE_STATUSES } = await import('./instances')

/**
 * TASK-1719 Slice 2 — regresión del bug DETERMINISTA que el refactor cierra (ADR D2).
 *
 * Antes: `assignCandidateTest` hacía check-then-insert con un SELECT que filtraba 3 estados
 * (`assigned|sent|in_progress`) mientras el índice parcial
 * `hiring_assessment_open_instance_unique_idx` cubre 4 (incluye `submitted`). Con una
 * instancia `submitted`, el SELECT no la veía, el INSERT violaba el índice y salía un `23505`
 * crudo → `error-response.ts` caía al branch genérico → HTTP 500 `hiring_internal_error` con
 * `actionable: true` (la UI ofrecía "Reintentar" para algo irreparable). En el carril reactivo
 * el mismo `23505` se comportaba como fault y fabricaba dead-letters.
 */

const SUBMITTED_INSTANCE = {
  assessment_id: 'asmt-submitted',
  public_id: 'EO-ASM-0009',
  application_id: 'happ-1',
  template_id: 'atpl-1',
  method: 'candidate_test',
  evaluator_user_id: null,
  status: 'submitted',
  time_limit_minutes: 45,
  accommodations_json: {},
  started_at: '2026-08-10T00:00:00.000Z',
  submitted_at: '2026-08-12T00:00:00.000Z',
  created_by: null,
  created_at: '2026-08-10T00:00:00.000Z',
  updated_at: '2026-08-12T00:00:00.000Z',
}

/** Una instancia `submitted` existente: el ON CONFLICT absorbe el INSERT (0 filas). */
const submittedConflictHandlers = (): Handler[] => [
  { match: /FROM greenhouse_hiring\.hiring_application WHERE application_id/, rows: [{ application_id: 'happ-1' }] },
  { match: /INSERT INTO greenhouse_hiring\.hiring_assessment\s/, rows: [] },
  { match: /FROM greenhouse_hiring\.hiring_assessment\b[\s\S]*WHERE application_id = \$1 AND template_id/, rows: [SUBMITTED_INSTANCE] },
]

beforeEach(() => {
  queries.length = 0
  handlers = []
  fakeClient.query.mockClear()
  publishOutboxEvent.mockClear()
})

describe('TASK-1719 Slice 2 — el predicado de instancia abierta cubre los 4 estados del índice', () => {
  it('incluye `submitted` (la desalineación era la causa del 500)', () => {
    expect([...OPEN_ASSESSMENT_INSTANCE_STATUSES]).toEqual(['assigned', 'sent', 'in_progress', 'submitted'])
  })

  it('el INSERT usa ON CONFLICT sobre el índice parcial, no un SELECT previo', async () => {
    handlers = submittedConflictHandlers()

    await insertCandidateTest(fakeClient as never, { applicationId: 'happ-1', templateId: 'atpl-1' }, null)

    const insert = queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))

    expect(insert?.text).toMatch(/ON CONFLICT \(application_id, template_id\) WHERE status IN \('assigned', 'sent', 'in_progress', 'submitted'\)/)
    expect(insert?.text).toMatch(/DO NOTHING/)
  })
})

describe('TASK-1719 Slice 2 — re-assign con instancia `submitted`', () => {
  it('devuelve 409 `assessment_already_open`, NUNCA 500 `hiring_internal_error`', async () => {
    handlers = submittedConflictHandlers()

    const error = (await assignCandidateTest({ applicationId: 'happ-1', templateId: 'atpl-1' }, 'user-1').then(
      () => null,
      (e: unknown) => e,
    )) as { code: string; statusCode: number; details?: { assessmentId?: string } }

    expect(error.code).toBe('assessment_already_open')
    expect(error.statusCode).toBe(409)
    expect(error.details?.assessmentId).toBe('asmt-submitted')

    // 409 < 500 ⇒ `actionable: false` en el error contract: la UI ya no ofrece "Reintentar"
    // para algo que no se resuelve reintentando nunca.
    expect(error.statusCode).toBeLessThan(500)
  })

  it('no emite `hiring.assessment.assigned` (no habría un segundo correo)', async () => {
    handlers = submittedConflictHandlers()

    await assignCandidateTest({ applicationId: 'happ-1', templateId: 'atpl-1' }, 'user-1').catch(() => undefined)

    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('la rama `created:false` NUNCA devuelve token (el link vive una sola vez)', async () => {
    handlers = submittedConflictHandlers()

    const result = await insertCandidateTest(fakeClient as never, { applicationId: 'happ-1', templateId: 'atpl-1' }, null)

    expect(result.created).toBe(false)
    expect(result.token).toBeNull()
    expect(result.assessment.assessmentId).toBe('asmt-submitted')
  })
})

describe('TASK-1719 Slice 2 — el happy path del route legacy sigue intacto', () => {
  it('crea la instancia, devuelve el token una vez y publica el evento', async () => {
    handlers = [
      { match: /FROM greenhouse_hiring\.hiring_application WHERE application_id/, rows: [{ application_id: 'happ-1' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment\s/, rows: [{ ...SUBMITTED_INSTANCE, assessment_id: 'asmt-new', status: 'assigned' }] },
    ]

    const result = await assignCandidateTest({ applicationId: 'happ-1', templateId: 'atpl-1' }, 'user-1')

    expect(result.assessment.assessmentId).toBe('asmt-new')
    expect(result.token).toMatch(/^[\w-]{20,}$/)
    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)

    const [event] = publishOutboxEvent.mock.calls[0]

    expect(event.eventType).toBe('hiring.assessment.assigned')
    // El token crudo NUNCA entra al outbox (el outbox sincroniza a BigQuery).
    expect(JSON.stringify(event)).not.toContain(result.token)
  })

  it('sigue rechazando una postulación inexistente antes de tocar la instancia', async () => {
    handlers = []

    await expect(assignCandidateTest({ applicationId: 'happ-x', templateId: 'atpl-1' }, 'user-1')).rejects.toMatchObject({
      code: 'hiring_application_not_found',
    })
  })
})
