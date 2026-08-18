import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Mocks de PG con el patrón de `assign.test.ts`: handlers por regex sobre el texto del SQL,
// primer match gana. Ejercitan la LÓGICA, no el SQL — el SQL de este slice se ejercita contra
// PG real en `assign.live.test.ts` (invariante de live-testing, ISSUE-071 / TASK-893).
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
  runGreenhousePostgresQuery: vi.fn(async (text: string, values: unknown[] = []) => {
    queries.push({ text, values })

    const handler = handlers.find(h => h.match.test(text))

    return handler ? (typeof handler.rows === 'function' ? handler.rows() : handler.rows) : []
  }),
}))

const publishOutboxEvent = vi.fn(
  async (event: { eventType: string; payload: Record<string, unknown> }) => `outbox-${event.eventType}`,
)

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (event: { eventType: string; payload: Record<string, unknown> }) => publishOutboxEvent(event),
}))

const { proposeAssessmentAssignment } = await import('./propose-assignment')
const { confirmAssessmentAssignment } = await import('./confirm-assignment')
const { computeAssignmentEffectDigest } = await import('./proposal-digest')

// ── Fixtures ──

const POLICY_ROW = {
  policy_id: 'hoap-1',
  opening_id: 'opng-1',
  template_id: 'atpl-1',
  policy_version: 1,
  mode: 'manual',
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

const APPLICATION_CONTEXT_ROW = {
  application_id: 'happ-1',
  opening_id: 'opng-1',
  stage: 'shortlisted',
  decision: null,
  internal_title: 'Account Manager L2',
  canonical_email: 'candidata@ejemplo.com',
}

const APPLICATION_ROW = {
  application_id: 'happ-1',
  opening_id: 'opng-1',
  stage: 'shortlisted',
  decision: null,
  canonical_email: 'candidata@ejemplo.com',
}

const QUESTION_ROW = {
  module_id: 'atmd-1',
  competency_id: 'comp-1',
  question_id: 'q-1',
  level: 'intermedio',
  type: 'open',
  prompt: '¿Cómo priorizas una cuenta en riesgo?',
  options_json: null,
}

/** Digest esperado del estado base — se recomputa con la MISMA función que usa el runtime. */
const BASE_MATERIAL = {
  policyId: 'hoap-1',
  policyVersion: 1,
  policyState: 'enabled' as const,
  policyMode: 'manual' as const,
  templateId: 'atpl-1',
  templateContentDigest: '',
  triggerStage: 'shortlisted' as const,
  timeLimitMinutes: 45,
  applicationStage: 'shortlisted',
  applicationDecided: false,
  recipientReady: true,
  existingOpenAssessment: false,
  existingScoredAssessment: false,
}

const PROPOSAL_ROW = {
  proposal_id: 'haap-1',
  application_id: 'happ-1',
  policy_id: 'hoap-1',
  policy_version: 1,
  effect_digest: 'placeholder',
  preview_json: {
    openingTitle: 'Account Manager L2',
    templateName: 'Account Manager L2',
    templateVersion: 1,
    policyVersion: 1,
    mode: 'manual',
    triggerStage: 'shortlisted',
    timeLimitMinutes: 45,
    recipientReady: true,
    existingOpenAssessment: false,
    existingScoredAssessment: false,
    blockingReasonCode: null,
  },
  status: 'proposed',
  proposed_by: 'user-1',
  confirmed_by: null,
  assignment_id: null,
  expires_at: '2999-01-01T00:00:00.000Z',
  confirmed_at: null,
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

const ASSIGNMENT_ROW = {
  assignment_id: 'hoaa-1',
  application_id: 'happ-1',
  policy_id: 'hoap-1',
  assessment_id: null,
  policy_version: 1,
  trigger_stage: 'manual',
  attempt_seq: 1,
  origin: 'manual',
  outcome: 'assigned',
  outcome_reason: null,
  superseded_at: null,
  actor_user_id: 'user-1',
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
  created_by: 'user-1',
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

/**
 * Handlers compartidos por propose y confirm: el ESTADO DEL MUNDO que alimenta el digest.
 * Que ambos lean de acá es justamente la propiedad que estos tests protegen — una fórmula.
 */
const worldHandlers = (overrides: Handler[] = []): Handler[] => [
  ...overrides,
  { match: /FROM greenhouse_hiring\.hiring_application app\b[\s\S]*JOIN greenhouse_hiring\.hiring_opening/, rows: [APPLICATION_CONTEXT_ROW] },
  { match: /SELECT opening_id FROM greenhouse_hiring\.hiring_application/, rows: [{ opening_id: 'opng-1' }] },
  { match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] },
  { match: /SELECT name, version, status FROM greenhouse_hiring\.hiring_assessment_template/, rows: [{ name: 'Account Manager L2', version: 1, status: 'active' }] },
  { match: /FROM greenhouse_hiring\.hiring_assessment_template_module/, rows: [QUESTION_ROW] },
  // Instancias existentes de (application, template) que el preview lee: abiertas (bloqueante)
  // + `scored` (informativo). Sin filas = ninguna instancia previa.
  { match: /SELECT status AS instance_status FROM greenhouse_hiring\.hiring_assessment\b/, rows: [] },
]

const proposeHandlers = (overrides: Handler[] = []): Handler[] =>
  worldHandlers([
    ...overrides,
    { match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*WHERE application_id = \$1 AND effect_digest/, rows: [] },
    { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/, rows: [PROPOSAL_ROW] },
  ])

/** Handlers del confirm feliz: propuesta viva + el camino completo del command común. */
const confirmHandlers = (overrides: Handler[] = []): Handler[] =>
  worldHandlers([
    ...overrides,
    // Snapshot del command común (assign.ts): mismo `FROM ... app` pero SIN el join a opening.
    { match: /FROM greenhouse_hiring\.hiring_application app\b(?![\s\S]*JOIN greenhouse_hiring\.hiring_opening)/, rows: [APPLICATION_ROW] },
    { match: /SELECT status FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'active' }] },
    { match: /SELECT COUNT\(\*\)::int AS total/, rows: [{ total: 0 }] },
    { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, outcome: 'intent' }] },
    { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment\b/, rows: [{ ...ASSIGNMENT_ROW, assessment_id: 'asmt-1' }] },
    { match: /INSERT INTO greenhouse_hiring\.hiring_assessment\s/, rows: [ASSESSMENT_ROW] },
    { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*status = 'confirmed'/, rows: [{ ...PROPOSAL_ROW, status: 'confirmed', confirmed_by: 'user-1', confirmed_at: '2026-08-17T01:00:00.000Z', assignment_id: 'hoaa-1' }] },
  ])

const eventTypes = () => publishOutboxEvent.mock.calls.map(([event]) => event.eventType)

const proposalLock = (row: Record<string, unknown>): Handler => ({
  match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*FOR UPDATE/,
  rows: [row],
})

/** El digest real del estado base, computado por el propio runtime en un propose de sonda. */
const currentDigest = async (): Promise<string> => {
  handlers = proposeHandlers()
  await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: 'user-1' })

  const insert = queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(q.text))

  return String(insert?.values[3])
}

beforeEach(() => {
  queries.length = 0
  handlers = []
  fakeClient.query.mockClear()
  publishOutboxEvent.mockClear()
})

describe('TASK-1719 Slice 2 — propose idempotente por effect digest', () => {
  it('crea la propuesta con preview PII-FREE y emite el evento una sola vez', async () => {
    handlers = proposeHandlers()

    const { proposal, created } = await proposeAssessmentAssignment({
      applicationId: 'happ-1',
      actorUserId: 'user-1',
    })

    expect(created).toBe(true)
    expect(proposal.proposalId).toBe('haap-1')
    expect(eventTypes()).toEqual(['hiring.assessment.assignment_proposed'])

    const insert = queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(q.text))
    const previewJson = String(insert?.values[4])

    expect(previewJson).not.toContain('candidata@ejemplo.com')
    expect(previewJson).not.toContain('@')
    expect(previewJson).not.toMatch(/token/i)
    expect(JSON.parse(previewJson)).toMatchObject({ recipientReady: true, blockingReasonCode: null })
  })

  it('mismo estado del mundo ⇒ devuelve la propuesta activa SIN insertar otra fila', async () => {
    handlers = proposeHandlers([
      {
        match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*WHERE application_id = \$1 AND effect_digest/,
        rows: [PROPOSAL_ROW],
      },
    ])

    const { proposal, created } = await proposeAssessmentAssignment({
      applicationId: 'happ-1',
      actorUserId: 'user-1',
    })

    expect(created).toBe(false)
    expect(proposal.proposalId).toBe('haap-1')
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(q.text))).toBe(false)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('la carrera del índice único parcial no lanza: el perdedor recibe la propuesta ganadora', async () => {
    let readCount = 0

    handlers = proposeHandlers([
      {
        match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*WHERE application_id = \$1 AND effect_digest/,
        // 1.ª lectura (idempotencia previa): vacía. 2.ª (re-lectura post ON CONFLICT): la ganadora.
        rows: () => (readCount++ === 0 ? [] : [PROPOSAL_ROW]),
      },
      { match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/, rows: [] },
    ])

    const { created } = await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: 'user-1' })

    expect(created).toBe(false)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('un cambio del mundo cambia el digest (misma fórmula, distinto material)', () => {
    const base = computeAssignmentEffectDigest(BASE_MATERIAL)

    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, policyVersion: 2 })).not.toBe(base)
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, templateContentDigest: 'otro' })).not.toBe(base)
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, applicationStage: 'interview' })).not.toBe(base)
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, applicationDecided: true })).not.toBe(base)
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, recipientReady: false })).not.toBe(base)
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, existingOpenAssessment: true })).not.toBe(base)
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, existingScoredAssessment: true })).not.toBe(base)
    // Estable: el mismo material siempre rinde el mismo digest.
    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL })).toBe(base)
  })

  it('el digest ve `state` y `mode`, que `policy_version` NO versiona', () => {
    // `markPolicyEnabled` / `markPolicyDisabled` cambian el estado SIN tocar `policy_version`.
    // Sin estos dos campos en el material, el escenario completo era: proponer con la policy en
    // `draft` (el preview dice `policy_disabled` ⇒ "no va a pasar nada"), alguien la habilita, el
    // operador confirma, el digest coincide ⇒ se asigna y sale un correo REAL a un candidato
    // REAL. Este test es lo único que impide que ese campo se caiga del material sin ruido.
    const draft = computeAssignmentEffectDigest({ ...BASE_MATERIAL, policyState: 'draft' })
    const enabled = computeAssignmentEffectDigest({ ...BASE_MATERIAL, policyState: 'enabled' })
    const disabled = computeAssignmentEffectDigest({ ...BASE_MATERIAL, policyState: 'disabled' })

    expect(new Set([draft, enabled, disabled]).size).toBe(3)

    expect(computeAssignmentEffectDigest({ ...BASE_MATERIAL, policyMode: 'on_stage_entry' })).not.toBe(
      computeAssignmentEffectDigest({ ...BASE_MATERIAL, policyMode: 'manual' }),
    )
  })

  it('habilitar la policy entre propose y confirm deja el digest STALE', async () => {
    // El escenario end-to-end del hallazgo, contra el runtime real (no contra el material a mano).
    handlers = proposeHandlers([
      { match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [{ ...POLICY_ROW, state: 'draft' }] },
    ])

    await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: 'user-1' })

    const draftDigest = String(
      queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(q.text))?.values[3],
    )

    queries.length = 0
    publishOutboxEvent.mockClear()

    // Mundo posterior: la MISMA policy, misma versión, ahora `enabled`.
    handlers = confirmHandlers([
      proposalLock({ ...PROPOSAL_ROW, effect_digest: draftDigest }),
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/,
        rows: [{ ...PROPOSAL_ROW, status: 'superseded' }],
      },
    ])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_stale' })

    // Lo que importa: NO se creó instancia ⇒ ningún correo salió hacia el candidato.
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
  })

  it('una instancia `scored` NO bloquea el preview; una abierta SÍ', async () => {
    // Los dos predicados a la vez. Marcar `scored` como bloqueo era una mentira operativa: el
    // command no lo ve y crearía una instancia nueva ⇒ segunda prueba a alguien ya evaluado.
    handlers = proposeHandlers([
      {
        match: /SELECT status AS instance_status FROM greenhouse_hiring\.hiring_assessment\b/,
        rows: [{ instance_status: 'scored' }],
      },
    ])

    await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: 'user-1' })

    const scoredPreview = JSON.parse(
      String(queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(q.text))?.values[4]),
    )

    expect(scoredPreview).toMatchObject({
      existingScoredAssessment: true,
      existingOpenAssessment: false,
      blockingReasonCode: null,
    })

    queries.length = 0
    handlers = proposeHandlers([
      {
        match: /SELECT status AS instance_status FROM greenhouse_hiring\.hiring_assessment\b/,
        rows: [{ instance_status: 'submitted' }],
      },
    ])

    await proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: 'user-1' })

    const openPreview = JSON.parse(
      String(queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/.test(q.text))?.values[4]),
    )

    expect(openPreview).toMatchObject({
      existingOpenAssessment: true,
      existingScoredAssessment: false,
      blockingReasonCode: 'existing_open_instance',
    })
  })

  it('una propuesta VENCIDA no se devuelve como activa: se cierra y se emite una nueva', async () => {
    // Sin el filtro de expiry, `propose` devolvía la propuesta muerta y el confirm la rechazaba
    // con 409 SIEMPRE: el primer intento de asignar fallaba y nadie entendía por qué.
    let insertCount = 0

    handlers = worldHandlers([
      {
        match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*WHERE application_id = \$1 AND effect_digest/,
        rows: [{ ...PROPOSAL_ROW, expires_at: '2020-01-01T00:00:00.000Z' }],
      },
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/,
        rows: [{ ...PROPOSAL_ROW, status: 'expired' }],
      },
      {
        match: /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment_proposal/,
        // 1.er INSERT: colisiona con la vencida (DO NOTHING). 2.º: pasa, ya liberada.
        rows: () => (insertCount++ === 0 ? [] : [{ ...PROPOSAL_ROW, proposal_id: 'haap-2' }]),
      },
    ])

    const { proposal, created } = await proposeAssessmentAssignment({
      applicationId: 'happ-1',
      actorUserId: 'user-1',
    })

    expect(created).toBe(true)
    expect(proposal.proposalId).toBe('haap-2')

    const terminal = queries.find(q =>
      /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/.test(q.text),
    )

    expect(terminal?.values).toContain('expired')
  })

  it('la vacante sin policy ⇒ 409, no una asignación inventada', async () => {
    handlers = worldHandlers([{ match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [] }])

    await expect(
      proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_policy_missing', statusCode: 409 })
  })

  it('sin actor ⇒ 401 (el actor sale de la sesión, nunca del body)', async () => {
    handlers = proposeHandlers()

    await expect(
      proposeAssessmentAssignment({ applicationId: 'happ-1', actorUserId: '' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_missing_actor', statusCode: 401 })
  })
})

describe('TASK-1719 Slice 2 — confirm one-shot', () => {
  it('confirma: ejecuta el command común y cierra la propuesta con su assignment', async () => {
    const digest = await currentDigest()

    queries.length = 0
    publishOutboxEvent.mockClear()
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, effect_digest: digest })])

    const result = await confirmAssessmentAssignment({
      proposalId: 'haap-1',
      applicationId: 'happ-1',
      actorUserId: 'user-1',
    })

    expect(result.alreadyConfirmed).toBe(false)
    expect(result.result).toMatchObject({ status: 'assigned', assessmentId: 'asmt-1' })
    expect(result.assignmentId).toBe('hoaa-1')
    expect(result.proposal.status).toBe('confirmed')
    expect(eventTypes()).toContain('hiring.assessment.assignment_confirmed')
    expect(eventTypes()).toContain('hiring.assessment.assigned')
  })

  it('bloquea la propuesta con FOR UPDATE antes de decidir la transición', async () => {
    const digest = await currentDigest()

    queries.length = 0
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, effect_digest: digest })])

    await confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' })

    const lock = queries.find(q => /hiring_assessment_assignment_proposal[\s\S]*FOR UPDATE/.test(q.text))

    expect(lock).toBeDefined()
  })

  it('segundo confirm: NO re-ejecuta el efecto (ni instancia, ni correo, ni ledger)', async () => {
    handlers = confirmHandlers([
      proposalLock({
        ...PROPOSAL_ROW,
        status: 'confirmed',
        confirmed_by: 'user-1',
        confirmed_at: '2026-08-17T01:00:00.000Z',
        assignment_id: 'hoaa-1',
      }),
    ])

    const result = await confirmAssessmentAssignment({
      proposalId: 'haap-1',
      applicationId: 'happ-1',
      actorUserId: 'user-2',
    })

    expect(result.alreadyConfirmed).toBe(true)
    expect(result.assignmentId).toBe('hoaa-1')
    expect(result.result).toBeNull()
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment_assignment\b/.test(q.text))).toBe(false)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('el confirm NO se gatea por ningún flag: drenar la cola humana siempre es posible', async () => {
    const digest = await currentDigest()

    queries.length = 0
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, effect_digest: digest })])

    const previous = process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED

    process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED = 'false'

    try {
      await expect(
        confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
      ).resolves.toMatchObject({ alreadyConfirmed: false })
    } finally {
      if (previous === undefined) delete process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED
      else process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED = previous
    }
  })
})

describe('TASK-1719 Slice 2 — expiry enforced de verdad', () => {
  it('propuesta vencida ⇒ 409, se marca `expired` y NO se asigna nada', async () => {
    handlers = confirmHandlers([
      proposalLock({ ...PROPOSAL_ROW, expires_at: '2020-01-01T00:00:00.000Z' }),
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/,
        rows: [{ ...PROPOSAL_ROW, status: 'expired' }],
      },
    ])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_expired', statusCode: 409 })

    const terminal = queries.find(q => /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/.test(q.text))

    // El expiry se PERSISTE (la marca queda antes del throw, fuera de la tx): si sólo lanzara,
    // la fila seguiría `proposed` y el vencimiento sería cosmético.
    expect(terminal?.values).toContain('expired')
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('un `expires_at` imparseable se trata como VENCIDO (fail-closed), no como sin ventana', async () => {
    // La guarda anterior era `Number.isFinite(x) && x <= now`: con NaN se saltaba entera y
    // confirmaba el envío de un correo sin ninguna ventana que lo acotara. Ante la duda no se
    // manda.
    handlers = confirmHandlers([
      proposalLock({ ...PROPOSAL_ROW, expires_at: 'no-es-una-fecha' }),
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/,
        rows: [{ ...PROPOSAL_ROW, status: 'expired' }],
      },
    ])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_expired', statusCode: 409 })

    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('una propuesta ya `expired` no se puede confirmar', async () => {
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, status: 'expired' })])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_not_confirmable', statusCode: 409 })
  })
})

describe('TASK-1719 Slice 2 — digest stale', () => {
  it('el mundo cambió ⇒ 409 stale, se marca `superseded` y NO se ejecuta otro efecto', async () => {
    handlers = confirmHandlers([
      proposalLock({ ...PROPOSAL_ROW, effect_digest: 'digest-de-otro-mundo' }),
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/,
        rows: [{ ...PROPOSAL_ROW, status: 'superseded' }],
      },
    ])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_stale', statusCode: 409 })

    const terminal = queries.find(q => /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/.test(q.text))

    expect(terminal?.values).toContain('superseded')
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
  })

  it('la policy dejó de estar activa ⇒ el efecto aprobado ya no existe ⇒ stale', async () => {
    handlers = confirmHandlers([
      proposalLock({ ...PROPOSAL_ROW }),
      { match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [] },
      {
        match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment_proposal[\s\S]*SET status = \$2/,
        rows: [{ ...PROPOSAL_ROW, status: 'superseded' }],
      },
    ])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_stale' })
  })
})

describe('TASK-1719 Slice 2 — pertenencia y superficie de la respuesta', () => {
  it('propuesta de OTRA postulación ⇒ 404, nunca 403 (un 403 confirma que existe)', async () => {
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, application_id: 'happ-999' })])

    await expect(
      confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_not_found', statusCode: 404 })

    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_assessment\s/.test(q.text))).toBe(false)
  })

  it('la respuesta del confirm NUNCA contiene token ni URL del assessment', async () => {
    const digest = await currentDigest()

    queries.length = 0
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, effect_digest: digest })])

    const result = await confirmAssessmentAssignment({
      proposalId: 'haap-1',
      applicationId: 'happ-1',
      actorUserId: 'user-1',
    })

    const serialized = JSON.stringify(result)

    expect(serialized).not.toMatch(/token/i)
    expect(serialized).not.toMatch(/https?:\/\//)
    expect(serialized).not.toContain('candidata@ejemplo.com')
  })

  it('los payloads del outbox son IDs-only: sin email, sin nombre de persona, sin token', async () => {
    const digest = await currentDigest()

    publishOutboxEvent.mockClear()
    queries.length = 0
    handlers = confirmHandlers([proposalLock({ ...PROPOSAL_ROW, effect_digest: digest })])

    await confirmAssessmentAssignment({ proposalId: 'haap-1', applicationId: 'happ-1', actorUserId: 'user-1' })

    const payloads = JSON.stringify(publishOutboxEvent.mock.calls.map(([event]) => event.payload))

    expect(payloads).not.toContain('@')
    expect(payloads).not.toMatch(/token/i)
  })
})
