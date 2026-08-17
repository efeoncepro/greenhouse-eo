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

const { grantAssessmentAccommodation } = await import('./accommodations')
const { resolveAssessmentTiming } = await import('./public-taking')

// ── Fixtures ──

const ACTOR = 'user-hr-manager-1'

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

/** SELECT ... FOR UPDATE devuelve `current`; el UPDATE devuelve la fila ya ajustada. */
const arrange = (status: string, accommodations: Record<string, unknown> = {}) => {
  handlers = [
    { match: /FOR UPDATE/i, rows: [assessmentRow(status, { accommodations_json: accommodations })] },
    {
      match: /UPDATE greenhouse_hiring\.hiring_assessment\b/,
      rows: () => {
        const update = queries.find(q => /UPDATE greenhouse_hiring\.hiring_assessment\b/.test(q.text))

        return [assessmentRow(status, { accommodations_json: JSON.parse(String(update?.values?.[1] ?? '{}')) })]
      },
    },
  ]
}

const findUpdate = () => queries.find(q => /UPDATE greenhouse_hiring\.hiring_assessment\b/.test(q.text))

beforeEach(() => {
  queries.length = 0
  handlers = []
  publishOutboxEvent.mockClear()
})

describe('grantAssessmentAccommodation — TASK-1719 (Open Question 7)', () => {
  it.each(['assigned', 'sent', 'in_progress'])('otorga tiempo extra desde `%s`', async status => {
    arrange(status)

    const result = await grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 20, actorUserId: ACTOR })

    expect(result.outcome).toBe('granted')
    expect(result.previousExtraMinutes).toBe(0)
    expect(result.accommodations.extraMinutes).toBe(20)
    expect(result.accommodations.grantedBy).toBe(ACTOR)
    expect(result.accommodations.grantedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('escribe EXACTAMENTE el contrato canónico — 3 campos, ninguno más', async () => {
    arrange('sent')

    await grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 30, actorUserId: ACTOR })

    const written = JSON.parse(String(findUpdate()?.values?.[1]))

    // Si alguien agrega un campo acá (un motivo, una nota, un diagnóstico), este test cae.
    expect(Object.keys(written).sort()).toEqual(['extraMinutes', 'grantedAt', 'grantedBy'])
    expect(written.extraMinutes).toBe(30)
  })

  it.each(['submitted', 'scored', 'expired', 'cancelled'])(
    'rechaza con 409 desde el estado terminal `%s` — ya no hay tiempo que extender',
    async status => {
      arrange(status)

      await expect(
        grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 20, actorUserId: ACTOR }),
      ).rejects.toMatchObject({ statusCode: 409, code: 'assessment_accommodation_status_not_allowed' })

      expect(findUpdate()).toBeUndefined()
      expect(publishOutboxEvent).not.toHaveBeenCalled()
    },
  )

  it('rechaza con 409 un interviewer_scorecard — no hay candidato a quien acomodar', async () => {
    handlers = [{ match: /FOR UPDATE/i, rows: [assessmentRow('assigned', { method: 'interviewer_scorecard' })] }]

    await expect(
      grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 20, actorUserId: ACTOR }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'assessment_accommodation_method_not_supported' })

    expect(findUpdate()).toBeUndefined()
  })

  it('404 si la instancia no existe', async () => {
    handlers = []

    await expect(
      grantAssessmentAccommodation({ assessmentId: 'asmt-x', extraMinutes: 20, actorUserId: ACTOR }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'assessment_not_found' })
  })

  it('exige actor de sesión', async () => {
    arrange('assigned')

    await expect(
      grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 20, actorUserId: '' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'assessment_accommodation_missing_actor' })
  })

  it.each([0, -5, 181, 1000, 20.5, Number.NaN])('rechaza con 400 el monto fuera de rango 1..180 (%s)', async value => {
    arrange('assigned')

    await expect(
      grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: value, actorUserId: ACTOR }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'assessment_accommodation_invalid_extra_minutes' })

    expect(findUpdate()).toBeUndefined()
  })

  it.each([1, 180])('acepta los bordes del rango (%s)', async value => {
    arrange('assigned')

    const result = await grantAssessmentAccommodation({
      assessmentId: 'asmt-1',
      extraMinutes: value,
      actorUserId: ACTOR,
    })

    expect(result.accommodations.extraMinutes).toBe(value)
  })

  it('re-otorgar REEMPLAZA el monto, con nuevo actor y timestamp', async () => {
    // La vía de corregir un ajuste mal puesto: nunca se acumula, siempre se reemplaza.
    arrange('sent', { extraMinutes: 15, grantedBy: 'user-otro', grantedAt: '2026-08-01T10:00:00.000Z' })

    const result = await grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 40, actorUserId: ACTOR })

    expect(result.outcome).toBe('replaced')
    expect(result.previousExtraMinutes).toBe(15)
    expect(result.accommodations.extraMinutes).toBe(40)
    expect(result.accommodations.grantedBy).toBe(ACTOR)
    expect(result.accommodations.grantedAt).not.toBe('2026-08-01T10:00:00.000Z')
  })

  it('otorgar el MISMO monto vigente es no-op idempotente, sin write ni evento', async () => {
    arrange('sent', { extraMinutes: 30, grantedBy: 'user-otro', grantedAt: '2026-08-01T10:00:00.000Z' })

    const result = await grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 30, actorUserId: ACTOR })

    expect(result.outcome).toBe('unchanged')
    expect(result.previousExtraMinutes).toBe(30)
    // El trail refleja la decisión real: un doble click no reescribe quién otorgó.
    expect(result.accommodations.grantedBy).toBe('user-otro')
    expect(findUpdate()).toBeUndefined()
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('el evento publicado no lleva PII, token, score ni motivo', async () => {
    arrange('sent', { extraMinutes: 10, grantedBy: 'user-otro', grantedAt: '2026-08-01T10:00:00.000Z' })

    await grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 25, actorUserId: ACTOR })

    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)

    const event = publishOutboxEvent.mock.calls[0]?.[0] as OutboxCall

    expect(event.eventType).toBe('hiring.assessment.accommodation_granted')
    expect(event.payload).toEqual({
      assessmentId: 'asmt-1',
      applicationId: 'happ-1',
      templateId: 'atpl-1',
      method: 'candidate_test',
      status: 'sent',
      extraMinutes: 25,
      previousExtraMinutes: 10,
      actorUserId: ACTOR,
    })

    // Ningún campo del payload puede contener un diagnóstico, un nombre, un correo ni un token.
    // El motivo NO aparece acá porque no se guarda en ningún lado (decisión de privacidad).
    const serialized = JSON.stringify(event.payload)

    expect(serialized).not.toMatch(/reason|motivo|diagn|disabilit|discapacid|token|@/i)
  })

  it('el UPDATE va condicionado al status leído bajo FOR UPDATE (guard de carrera)', async () => {
    arrange('in_progress')

    await grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 20, actorUserId: ACTOR })

    const update = findUpdate()

    expect(update?.text).toMatch(/WHERE assessment_id = \$1 AND status = \$3/i)
    expect(update?.values?.[2]).toBe('in_progress')
  })

  it('409 si la instancia cambió de estado entre el SELECT y el UPDATE', async () => {
    handlers = [
      { match: /FOR UPDATE/i, rows: [assessmentRow('sent')] },
      { match: /UPDATE greenhouse_hiring\.hiring_assessment\b/, rows: [] },
    ]

    await expect(
      grantAssessmentAccommodation({ assessmentId: 'asmt-1', extraMinutes: 20, actorUserId: ACTOR }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'assessment_accommodation_stale_state' })
  })
})

describe('el ajuste llega DE VERDAD al tiempo que ve el candidato', () => {
  // El write no sirve de nada si el lector no lo honra. Se ejercita `resolveAssessmentTiming`
  // con el shape canónico exacto que escribe el command.
  const assessment = (accommodations: Record<string, unknown>, startedAt: string | null = null) =>
    ({
      assessmentId: 'asmt-1',
      timeLimitMinutes: 45,
      accommodations,
      startedAt,
      submittedAt: null,
    }) as never

  it('el tiempo efectivo suma el `extraMinutes` canónico', () => {
    const timing = resolveAssessmentTiming(
      assessment({ extraMinutes: 20, grantedBy: 'user-hr', grantedAt: '2026-08-17T00:00:00.000Z' }),
    )

    expect(timing.baseMinutes).toBe(45)
    expect(timing.extraMinutes).toBe(20)
    expect(timing.effectiveMinutes).toBe(65)
    expect(timing.hasAccommodation).toBe(true)
  })

  it('sin ajuste, el candidato ve exactamente el límite base', () => {
    const timing = resolveAssessmentTiming(assessment({}))

    expect(timing.effectiveMinutes).toBe(45)
    expect(timing.hasAccommodation).toBe(false)
  })

  it('el vencimiento se corre por el ajuste: la ventana real es base + extra', () => {
    const startedAt = new Date(Date.now() - 50 * 60_000).toISOString()

    // 50 min transcurridos sobre un límite base de 45: sin ajuste ya venció.
    expect(resolveAssessmentTiming(assessment({}, startedAt)).remainingSeconds).toBe(0)

    // Con +20 min la ventana es de 65: le quedan ~15 min reales.
    const withGrant = resolveAssessmentTiming(
      assessment({ extraMinutes: 20, grantedBy: 'user-hr', grantedAt: '2026-08-17T00:00:00.000Z' }, startedAt),
    )

    expect(withGrant.remainingSeconds).toBeGreaterThan(14 * 60)
    expect(withGrant.remainingSeconds).toBeLessThanOrEqual(15 * 60)
  })

  it('las 5 grafías narradas YA NO se leen — el contrato es uno solo', () => {
    // Se narraron con la base verificada en 0 filas con accommodations. Si alguien las
    // reintrodujera "por compatibilidad", vuelve el contrato implícito de 6 formas.
    for (const legacyKey of [
      'timeExtensionMinutes',
      'additionalMinutes',
      'extendedTimeMinutes',
      'timeMultiplier',
      'extendedTimePercent',
    ]) {
      const timing = resolveAssessmentTiming(assessment({ [legacyKey]: legacyKey.includes('Multiplier') ? 2 : 30 }))

      expect(timing.extraMinutes, `${legacyKey} no debe conceder tiempo`).toBe(0)
      expect(timing.effectiveMinutes).toBe(45)
    }
  })
})
