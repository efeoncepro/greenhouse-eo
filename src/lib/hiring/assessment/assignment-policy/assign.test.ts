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

const publishOutboxEvent = vi.fn(async (event: { eventType: string; payload: Record<string, unknown> }) => `outbox-${event.eventType}`)

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (event: { eventType: string; payload: Record<string, unknown> }) => publishOutboxEvent(event),
}))

const { assignAssessmentFromPolicy, resolveRecipientReadiness } = await import('./assign')

// ── Fixtures ──

const POLICY_ROW = {
  policy_id: 'hoap-1',
  opening_id: 'opng-1',
  template_id: 'atpl-1',
  policy_version: 1,
  mode: 'on_stage_entry',
  state: 'enabled',
  trigger_stage: 'shortlisted',
  time_limit_minutes: 45,
  template_content_digest: 'digest-x',
  volume_cap_per_window: 3,
  volume_window_minutes: 60,
  created_by: 'user-1',
  enabled_by: 'user-1',
  enabled_at: '2026-08-17T00:00:00.000Z',
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

const APPLICATION_ROW = {
  application_id: 'happ-1',
  opening_id: 'opng-1',
  stage: 'shortlisted',
  decision: null,
  canonical_email: 'candidata@ejemplo.com',
}

const ASSIGNMENT_ROW = {
  assignment_id: 'hoaa-1',
  application_id: 'happ-1',
  policy_id: 'hoap-1',
  assessment_id: null,
  policy_version: 1,
  trigger_stage: 'shortlisted',
  attempt_seq: 1,
  origin: 'stage_auto',
  outcome: 'assigned',
  outcome_reason: null,
  superseded_at: null,
  actor_user_id: null,
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

const ASSESSMENT_ROW = {
  assessment_id: 'asmt-1',
  public_id: 'EO-ASM-0001',
  application_id: 'happ-1',
  template_id: 'atpl-1',
  method: 'candidate_test',
  evaluator_user_id: null,
  status: 'assigned',
  time_limit_minutes: 45,
  accommodations_json: {},
  started_at: null,
  submitted_at: null,
  created_by: null,
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

/** Handlers del happy path; cada test sobreescribe los que necesite (primer match gana). */
const baseHandlers = (overrides: Handler[] = []): Handler[] => [
  ...overrides,
  { match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] },
  { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [APPLICATION_ROW] },
  { match: /FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'active' }] },
  { match: /SELECT COUNT\(\*\)::int AS total/, rows: [{ total: 0 }] },
  { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [ASSIGNMENT_ROW] },
  { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, assessment_id: 'asmt-1' }] },
  { match: /INSERT INTO greenhouse_hiring\.hiring_assessment\b/, rows: [ASSESSMENT_ROW] },
]

const autoInput = {
  applicationId: 'happ-1',
  policyId: 'hoap-1',
  origin: 'stage_auto' as const,
  actorUserId: null,
  triggerStage: 'shortlisted' as const,
}

const eventTypes = () => publishOutboxEvent.mock.calls.map(([event]) => event.eventType)

beforeEach(() => {
  queries.length = 0
  handlers = []
  fakeClient.query.mockClear()
  publishOutboxEvent.mockClear()
})

describe('TASK-1719 Slice 2 — happy path del command común', () => {
  it('asigna: crea la instancia, cierra el ledger y emite el evento que dispara el correo', async () => {
    handlers = baseHandlers()

    const result = await assignAssessmentFromPolicy(autoInput)

    expect(result).toMatchObject({ status: 'assigned', assessmentId: 'asmt-1', deliveryStatus: 'pending' })
    expect(eventTypes()).toContain('hiring.assessment.assigned')
    expect(eventTypes()).toContain('hiring.assessment.assignment_recorded')
  })

  it('el payload del outbox es IDs-only: nunca email, nombre ni token', async () => {
    handlers = baseHandlers()

    await assignAssessmentFromPolicy(autoInput)

    const payloads = JSON.stringify(publishOutboxEvent.mock.calls.map(([event]) => event.payload))

    expect(payloads).not.toContain('candidata@ejemplo.com')
    expect(payloads).not.toContain('@')
    expect(payloads).not.toMatch(/token/i)
  })

  it('el caller NUNCA elige la plantilla: sale de la policy', async () => {
    handlers = baseHandlers()

    await assignAssessmentFromPolicy(autoInput)

    const instanceInsert = queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))

    expect(instanceInsert?.values[1]).toBe('atpl-1')
  })
})

describe('TASK-1719 Slice 2 — idempotencia (ADR D2)', () => {
  it('el mismo trigger dos veces devuelve `already_assigned`: una sola fila y un solo correo', async () => {
    handlers = baseHandlers()
    await assignAssessmentFromPolicy(autoInput)

    const firstAssignedEvents = eventTypes().filter(t => t === 'hiring.assessment.assigned').length

    expect(firstAssignedEvents).toBe(1)

    publishOutboxEvent.mockClear()
    queries.length = 0

    // Replay: el índice único parcial absorbe el INSERT (0 filas) y el ledger re-lee al ganador.
    handlers = baseHandlers([
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [] },
      {
        match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment\b[\s\S]*WHERE application_id/,
        rows: [{ ...ASSIGNMENT_ROW, assessment_id: 'asmt-1' }],
      },
    ])

    const replay = await assignAssessmentFromPolicy(autoInput)

    expect(replay).toMatchObject({ status: 'already_assigned', assessmentId: 'asmt-1' })
    // Ningún side effect nuevo: sin instancia, sin evento, sin correo.
    expect(publishOutboxEvent).not.toHaveBeenCalled()
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
  })

  it('la carrera del ledger no lanza: el perdedor recibe el outcome del ganador', async () => {
    handlers = baseHandlers([
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [] },
      {
        match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment\b[\s\S]*WHERE application_id/,
        rows: [{ ...ASSIGNMENT_ROW, assessment_id: 'asmt-1' }],
      },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).resolves.toMatchObject({ status: 'already_assigned' })
  })

  it('una instancia abierta preexistente degrada a `already_assigned` sin re-emitir el correo', async () => {
    handlers = baseHandlers([
      // La instancia ya existía (assign manual por el route legacy): ON CONFLICT no inserta.
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment\s/, rows: [] },
      { match: /FROM greenhouse_hiring\.hiring_assessment\b[\s\S]*WHERE application_id = \$1 AND template_id/, rows: [ASSESSMENT_ROW] },
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/,
        rows: [{ ...ASSIGNMENT_ROW, assessment_id: 'asmt-1', outcome: 'already_assigned', outcome_reason: 'existing_open_instance' }],
      },
    ])

    const result = await assignAssessmentFromPolicy(autoInput)

    expect(result).toMatchObject({ status: 'already_assigned', assessmentId: 'asmt-1' })
    expect(eventTypes()).not.toContain('hiring.assessment.assigned')
  })
})

describe('TASK-1719 Slice 2 — límite de autoridad (ADR D2 capa 3)', () => {
  it.each(['stage_auto', 'reconciliation'] as const)(
    'rechaza attempt_seq > 1 desde origen %s: la segunda prueba de una persona es humana',
    async (origin) => {
      handlers = baseHandlers()

      await expect(
        assignAssessmentFromPolicy({ ...autoInput, origin, attemptSeq: 2 }),
      ).rejects.toMatchObject({ code: 'assessment_assignment_attempt_forbidden' })

      expect(publishOutboxEvent).not.toHaveBeenCalled()
    },
  )

  it('un command humano SÍ puede registrar attempt_seq > 1', async () => {
    handlers = baseHandlers([
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, origin: 'manual', trigger_stage: 'manual', attempt_seq: 2 }] },
      { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, origin: 'manual', trigger_stage: 'manual', attempt_seq: 2, assessment_id: 'asmt-1' }] },
    ])

    const result = await assignAssessmentFromPolicy({
      applicationId: 'happ-1',
      policyId: 'hoap-1',
      origin: 'manual',
      actorUserId: 'user-1',
      attemptSeq: 2,
    })

    expect(result.status).toBe('assigned')
  })
})

describe('TASK-1719 Slice 2 — readiness fail-closed (ADR D5.3)', () => {
  it('sin email ⇒ held: missing_email (no se crea instancia ni correo)', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [{ ...APPLICATION_ROW, canonical_email: null }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'held', outcome_reason: 'missing_email' }] },
    ])

    const result = await assignAssessmentFromPolicy(autoInput)

    expect(result).toMatchObject({ status: 'held', reasonCode: 'missing_email' })
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
    expect(eventTypes()).not.toContain('hiring.assessment.assigned')
  })

  it('dominio no entregable ⇒ blocked: unverified_recipient + señal de auto-detención', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [{ ...APPLICATION_ROW, canonical_email: 'alguien@empresa.test' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'blocked', outcome_reason: 'unverified_recipient' }] },
    ])

    const result = await assignAssessmentFromPolicy(autoInput)

    expect(result).toMatchObject({ status: 'blocked', reasonCode: 'unverified_recipient' })
    expect(eventTypes()).toContain('hiring.assessment.auto_assignment_blocked')
  })

  it('email malformado ⇒ blocked (la duda nunca se resuelve enviando)', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [{ ...APPLICATION_ROW, canonical_email: 'sin-arroba' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'blocked', outcome_reason: 'unverified_recipient' }] },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).resolves.toMatchObject({ status: 'blocked' })
  })

  it('el predicado de readiness es puro y fail-closed', () => {
    expect(resolveRecipientReadiness(null)).toMatchObject({ ok: false, outcome: 'held', reasonCode: 'missing_email' })
    expect(resolveRecipientReadiness('   ')).toMatchObject({ ok: false, reasonCode: 'missing_email' })
    expect(resolveRecipientReadiness('a@b.invalid')).toMatchObject({ ok: false, outcome: 'blocked' })
    expect(resolveRecipientReadiness('a@b.local')).toMatchObject({ ok: false, outcome: 'blocked' })
    expect(resolveRecipientReadiness('a@b')).toMatchObject({ ok: false, outcome: 'blocked' })
    expect(resolveRecipientReadiness('persona@ejemplo.com')).toEqual({ ok: true })
  })
})

describe('TASK-1719 Slice 2 — cap de volumen (ADR D5.2)', () => {
  it('excedido ⇒ blocked: volume_cap + evento de auto-detención, sin instancia', async () => {
    handlers = baseHandlers([
      { match: /SELECT COUNT\(\*\)::int AS total/, rows: [{ total: 3 }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'blocked', outcome_reason: 'volume_cap' }] },
    ])

    const result = await assignAssessmentFromPolicy(autoInput)

    expect(result).toMatchObject({ status: 'blocked', reasonCode: 'volume_cap' })
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
    expect(eventTypes()).toContain('hiring.assessment.auto_assignment_blocked')
  })

  it('el cap NO aplica a una confirmación humana (ya pasó por un juicio)', async () => {
    handlers = baseHandlers([
      { match: /SELECT COUNT\(\*\)::int AS total/, rows: [{ total: 99 }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, origin: 'manual', trigger_stage: 'manual' }] },
      { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, origin: 'manual', trigger_stage: 'manual', assessment_id: 'asmt-1' }] },
    ])

    const result = await assignAssessmentFromPolicy({
      applicationId: 'happ-1',
      policyId: 'hoap-1',
      origin: 'manual',
      actorUserId: 'user-1',
    })

    expect(result.status).toBe('assigned')
  })
})

describe('TASK-1719 Slice 2 — outcomes terminales derivados del estado vigente (ADR D0a)', () => {
  it('la etapa vigente ya no es la del trigger ⇒ stale: stage_changed', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [{ ...APPLICATION_ROW, stage: 'interview' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'stale', outcome_reason: 'stage_changed' }] },
    ])

    const result = await assignAssessmentFromPolicy(autoInput)

    expect(result).toMatchObject({ status: 'stale', reasonCode: 'stage_changed' })
  })

  it('la etapa se lee de PG, no del input del caller', async () => {
    handlers = baseHandlers()

    await assignAssessmentFromPolicy(autoInput)

    const appRead = queries.find(q => /FROM greenhouse_hiring\.hiring_application app\b/.test(q.text))

    expect(appRead?.text).toMatch(/app\.stage/)
    expect(appRead?.values).toEqual(['happ-1'])
  })

  it('postulación ya decidida ⇒ stale: application_decided', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [{ ...APPLICATION_ROW, decision: 'rejected' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'stale', outcome_reason: 'application_decided' }] },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).resolves.toMatchObject({
      status: 'stale',
      reasonCode: 'application_decided',
    })
  })

  it('policy en draft ⇒ blocked: policy_disabled (configurar no es habilitar)', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [{ ...POLICY_ROW, state: 'draft' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'blocked', outcome_reason: 'policy_disabled' }] },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).resolves.toMatchObject({
      status: 'blocked',
      reasonCode: 'policy_disabled',
    })
  })

  it('policy enabled pero en modo manual ⇒ la automatización no dispara', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [{ ...POLICY_ROW, mode: 'manual' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'blocked', outcome_reason: 'policy_mode_manual' }] },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).resolves.toMatchObject({
      status: 'blocked',
      reasonCode: 'policy_mode_manual',
    })
  })

  it('plantilla archivada ⇒ blocked: template_inactive', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'archived' }] },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'blocked', outcome_reason: 'template_inactive' }] },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).resolves.toMatchObject({
      status: 'blocked',
      reasonCode: 'template_inactive',
    })
  })

  it('la postulación de otra vacante es fault, no outcome (dato roto del caller)', async () => {
    handlers = baseHandlers([
      { match: /FROM greenhouse_hiring\.hiring_application app\b/, rows: [{ ...APPLICATION_ROW, opening_id: 'opng-999' }] },
    ])

    await expect(assignAssessmentFromPolicy(autoInput)).rejects.toMatchObject({
      code: 'assessment_assignment_policy_mismatch',
    })
  })
})
