import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queries: { text: string; values: unknown[] }[] = []

/** Router de SQL: cada test declara qué devuelve cada consulta por fragmento reconocible. */
let handlers: { match: RegExp; rows: Record<string, unknown>[] }[] = []

const fakeClient = {
  query: vi.fn(async (text: string, values: unknown[] = []) => {
    queries.push({ text, values })

    const handler = handlers.find(h => h.match.test(text))

    return { rows: handler ? handler.rows : [] }
  }),
}

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(fakeClient)),
  runGreenhousePostgresQuery: vi.fn(async () => []),
}))

const {
  configureOpeningAssessmentPolicy,
  disableOpeningAssessmentPolicy,
  enableOpeningAssessmentPolicy,
} = await import('./commands')

const POLICY_ROW = {
  policy_id: 'hoap-1',
  opening_id: 'opng-1',
  template_id: 'atpl-1',
  policy_version: 1,
  mode: 'manual',
  state: 'draft',
  trigger_stage: null,
  time_limit_minutes: 45,
  template_content_digest: null,
  volume_cap_per_window: 3,
  volume_window_minutes: 60,
  created_by: 'user-1',
  enabled_by: null,
  enabled_at: null,
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

const withHandlers = (extra: { match: RegExp; rows: Record<string, unknown>[] }[] = []) => {
  handlers = [
    { match: /FROM greenhouse_hiring\.hiring_opening\b/, rows: [{ opening_id: 'opng-1', publication_status: 'published', status: 'active' }] },
    { match: /FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'active' }] },
    ...extra,
  ]
}

beforeEach(() => {
  queries.length = 0
  handlers = []
  fakeClient.query.mockClear()
})

describe('TASK-1719 Slice 1 — nacimiento seguro de la policy (ADR D5.1)', () => {
  it('una policy nueva se inserta SIEMPRE en draft + manual (los defaults los pone la DB)', async () => {
    withHandlers([{ match: /INSERT INTO greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] }])

    const policy = await configureOpeningAssessmentPolicy(
      { openingId: 'opng-1', templateId: 'atpl-1', timeLimitMinutes: 45 },
      'user-1',
    )

    expect(policy.state).toBe('draft')
    expect(policy.mode).toBe('manual')

    const insert = queries.find(q => /INSERT INTO greenhouse_hiring\.hiring_opening_assessment_policy\s/.test(q.text))

    // El INSERT no fija `state` ni `mode='on_stage_entry'` en su lista de columnas: `state`
    // lo pone la DB en `draft`. Nadie puede nacer habilitado.
    const insertColumns = insert?.text.match(/hiring_opening_assessment_policy\s*\(([\s\S]*?)\)\s*VALUES/)?.[1] ?? ''

    expect(insertColumns).not.toMatch(/\bstate\b/)
    expect(insertColumns).not.toMatch(/template_content_digest|enabled_at|enabled_by/)
    expect(insert?.text).toMatch(/ON CONFLICT \(opening_id\) WHERE state <> 'disabled'/)
    expect(insert?.text).toMatch(/DO NOTHING/)
  })

  it('deja historia append-only del `configured` en la misma transacción', async () => {
    withHandlers([{ match: /INSERT INTO greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] }])

    await configureOpeningAssessmentPolicy({ openingId: 'opng-1', templateId: 'atpl-1' }, 'user-1')

    const event = queries.find(q => /hiring_opening_assessment_policy_event/.test(q.text))

    expect(event).toBeDefined()
    expect(event?.values).toContain('configured')
  })

  it('una policy NO puede nacer en on_stage_entry: pasar a automático es un acto aparte', async () => {
    withHandlers([{ match: /INSERT INTO greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] }])

    await expect(
      configureOpeningAssessmentPolicy(
        { openingId: 'opng-1', templateId: 'atpl-1', mode: 'on_stage_entry', triggerStage: 'shortlisted' },
        'user-1',
      ),
    ).rejects.toMatchObject({ code: 'assessment_policy_must_be_born_manual' })

    // Nada se escribió: ni la policy ni su evento.
    expect(queries.some(q => /INSERT INTO greenhouse_hiring\.hiring_opening_assessment_policy\s/.test(q.text))).toBe(false)
  })

  it('rechaza on_stage_entry sin etapa trigger (una policy automática que nunca dispara)', async () => {
    withHandlers()

    await expect(
      configureOpeningAssessmentPolicy({ openingId: 'opng-1', templateId: 'atpl-1', mode: 'on_stage_entry' }, 'user-1'),
    ).rejects.toMatchObject({ code: 'assessment_policy_trigger_stage_required' })
  })

  it('rechaza una etapa trigger fuera de la allowlist candidate-facing', async () => {
    withHandlers()

    await expect(
      configureOpeningAssessmentPolicy(
        { openingId: 'opng-1', templateId: 'atpl-1', mode: 'on_stage_entry', triggerStage: 'selected' },
        'user-1',
      ),
    ).rejects.toMatchObject({ code: 'assessment_policy_invalid_trigger_stage' })
  })

  it('rechaza una plantilla archivada', async () => {
    handlers = [
      { match: /FROM greenhouse_hiring\.hiring_opening\b/, rows: [{ opening_id: 'opng-1', publication_status: 'published', status: 'active' }] },
      { match: /FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'archived' }] },
    ]

    await expect(
      configureOpeningAssessmentPolicy({ openingId: 'opng-1', templateId: 'atpl-1' }, 'user-1'),
    ).rejects.toMatchObject({ code: 'assessment_template_inactive' })
  })

  it('reconfigurar incrementa la versión y devuelve la policy a draft (no hereda la habilitación)', async () => {
    const enabled = { ...POLICY_ROW, state: 'enabled', template_content_digest: 'abc', enabled_at: '2026-08-17T00:00:00.000Z' }

    withHandlers([
      { match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [enabled] },
      {
        match: /UPDATE greenhouse_hiring\.hiring_opening_assessment_policy\b/,
        rows: [{ ...POLICY_ROW, policy_version: 2, state: 'draft' }],
      },
    ])

    const policy = await configureOpeningAssessmentPolicy(
      { openingId: 'opng-1', templateId: 'atpl-2', mode: 'on_stage_entry', triggerStage: 'shortlisted' },
      'user-1',
    )

    expect(policy.policyVersion).toBe(2)
    expect(policy.state).toBe('draft')

    const update = queries.find(q => /UPDATE greenhouse_hiring\.hiring_opening_assessment_policy\b/.test(q.text))

    expect(update?.text).toMatch(/policy_version = policy_version \+ 1/)
    expect(update?.text).toMatch(/state = 'draft'/)
    expect(update?.text).toMatch(/template_content_digest = NULL/)
  })
})

describe('TASK-1719 Slice 1 — habilitar exige gate real (ADR D5.1 + D4)', () => {
  it('rechaza habilitar si la vacante no está publicada', async () => {
    handlers = [
      { match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] },
      { match: /FROM greenhouse_hiring\.hiring_opening\b/, rows: [{ opening_id: 'opng-1', publication_status: 'draft', status: 'draft' }] },
    ]

    await expect(enableOpeningAssessmentPolicy('hoap-1', 'user-1')).rejects.toMatchObject({
      code: 'assessment_policy_opening_not_published',
    })
  })

  it('rechaza habilitar si la plantilla no resuelve ninguna pregunta activa', async () => {
    handlers = [
      { match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] },
      { match: /FROM greenhouse_hiring\.hiring_opening\b/, rows: [{ opening_id: 'opng-1', publication_status: 'published', status: 'active' }] },
      { match: /FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'active' }] },
      { match: /WITH ranked AS/, rows: [{ module_id: 'atmd-1', competency_id: 'cmp-1', question_id: null }] },
    ]

    await expect(enableOpeningAssessmentPolicy('hoap-1', 'user-1')).rejects.toMatchObject({
      code: 'assessment_policy_template_without_questions',
    })
  })

  it('habilita persistiendo el digest de contenido observado + audit', async () => {
    handlers = [
      { match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] },
      { match: /FROM greenhouse_hiring\.hiring_opening\b/, rows: [{ opening_id: 'opng-1', publication_status: 'published', status: 'active' }] },
      { match: /FROM greenhouse_hiring\.hiring_assessment_template\b/, rows: [{ status: 'active' }] },
      { match: /WITH ranked AS/, rows: [{ module_id: 'atmd-1', competency_id: 'cmp-1', question_id: 'qst-1' }] },
      {
        match: /UPDATE greenhouse_hiring\.hiring_opening_assessment_policy\b/,
        rows: [{ ...POLICY_ROW, state: 'enabled', template_content_digest: 'digest-x', enabled_at: '2026-08-17T00:00:00.000Z' }],
      },
    ]

    const policy = await enableOpeningAssessmentPolicy('hoap-1', 'user-1')

    expect(policy.state).toBe('enabled')
    expect(policy.templateContentDigest).toBe('digest-x')

    const update = queries.find(q => /UPDATE greenhouse_hiring\.hiring_opening_assessment_policy\b/.test(q.text))

    // El digest guardado es el OBSERVADO (sha256 real), no un placeholder.
    expect(String(update?.values[1])).toMatch(/^[a-f0-9]{64}$/)

    const event = queries.find(q => /hiring_opening_assessment_policy_event/.test(q.text))

    expect(event?.values).toContain('enabled')
  })

  it('habilitar dos veces es idempotente: no re-audita', async () => {
    handlers = [
      {
        match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/,
        rows: [{ ...POLICY_ROW, state: 'enabled', template_content_digest: 'abc', enabled_at: '2026-08-17T00:00:00.000Z' }],
      },
    ]

    const policy = await enableOpeningAssessmentPolicy('hoap-1', 'user-1')

    expect(policy.state).toBe('enabled')
    expect(queries.some(q => /hiring_opening_assessment_policy_event/.test(q.text))).toBe(false)
  })
})

describe('TASK-1719 Slice 1 — kill switch', () => {
  it('deshabilitar NUNCA borra: deja la fila en `disabled` con audit', async () => {
    handlers = [
      { match: /SELECT[\s\S]*FROM greenhouse_hiring\.hiring_opening_assessment_policy\b/, rows: [POLICY_ROW] },
      {
        match: /UPDATE greenhouse_hiring\.hiring_opening_assessment_policy\b/,
        rows: [{ ...POLICY_ROW, state: 'disabled' }],
      },
    ]

    const policy = await disableOpeningAssessmentPolicy('hoap-1', 'user-1', 'canary_stop')

    expect(policy.state).toBe('disabled')
    expect(queries.some(q => /DELETE\s+FROM greenhouse_hiring\.hiring_opening_assessment_policy/.test(q.text))).toBe(false)

    const event = queries.find(q => /hiring_opening_assessment_policy_event/.test(q.text))

    expect(event?.values).toContain('disabled')
    expect(event?.values).toContain('canary_stop')
  })
})
