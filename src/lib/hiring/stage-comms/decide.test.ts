/**
 * TASK-1719 Slices 4/5 — fan-in de comunicación por cambio de etapa.
 *
 * Lo que estos tests protegen es una promesa hacia una persona real: por un movimiento de
 * etapa recibe UNA comunicación. Ni cero (avanzó y nadie le dijo nada) ni dos (le llegó el
 * test y además el aviso genérico).
 *
 * El caso más filoso es el par `assigned` / `already_assigned`: el deduplicador de emails NO
 * lo cubre, porque el correo del test y el de etapa viajan con `sourceEventId` distintos.
 * Si la rama se equivoca, el doble correo sale y nada lo detecta.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const emailsEnabled = vi.fn()
const resolveContext = vi.fn()
const sendStageEmail = vi.fn()
const resolvePolicy = vi.fn()
const assignFromPolicy = vi.fn()
const listAssignments = vi.fn()

/** Ledger de entregas simulado, con clave exacta `${entity}:${emailType}`. */
const deliveredEmails = new Set<string>()

const wasEmailDeliveredForEntity = vi.fn(async (entity: string, emailType: string) =>
  deliveredEmails.has(`${entity}:${emailType}`),
)

vi.mock('@/lib/email/delivery', () => ({
  wasEmailDeliveredForEntity: (entity: string, emailType: string) => wasEmailDeliveredForEntity(entity, emailType),
}))

vi.mock('@/lib/hiring/notifications/config', () => ({
  isHiringLifecycleEmailsEnabled: () => emailsEnabled(),
}))

vi.mock('@/lib/hiring/notifications/recipient', () => ({
  resolveHiringApplicationEmailContext: (...a: unknown[]) => resolveContext(...a),
}))

vi.mock('@/lib/hiring/notifications/send', () => ({
  sendHiringStageAdvancedEmail: (...a: unknown[]) => sendStageEmail(...a),
}))

vi.mock('@/lib/hiring/assessment/assignment-policy/readers', () => ({
  resolveActivePolicyForApplication: (...a: unknown[]) => resolvePolicy(...a),
}))

vi.mock('@/lib/hiring/assessment/assignment-policy/assign', () => ({
  assignAssessmentFromPolicy: (...a: unknown[]) => assignFromPolicy(...a),
}))

vi.mock('@/lib/hiring/assessment/assignment-policy/assignment-store', () => ({
  listAssignmentsForApplication: (...a: unknown[]) => listAssignments(...a),
}))

import { resolveStageChangeCandidateComms } from './decide'

const APP = 'happ-1'

const ctx = (over: Record<string, unknown> = {}) => ({
  applicationId: APP,
  stage: 'interview',
  decision: null,
  candidateEmail: 'persona@ejemplo.com',
  candidateName: 'Persona',
  openingTitle: 'Content Creator',
  ...over,
})

const enabledPolicy = (over: Record<string, unknown> = {}) => ({
  policyId: 'hoap-1',
  mode: 'on_stage_entry',
  state: 'enabled',
  triggerStage: 'interview',
  ...over,
})

/** Payload tal como lo entrega el consumer reactivo: con `_occurredAt` inyectado. */
const payload = (over: Record<string, unknown> = {}) => ({
  applicationId: APP,
  stage: 'interview',
  _eventId: 'evt-1',
  _occurredAt: new Date().toISOString(),
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  deliveredEmails.clear()
  emailsEnabled.mockReturnValue(true)
  resolveContext.mockResolvedValue(ctx())
  resolvePolicy.mockResolvedValue(null)
  sendStageEmail.mockResolvedValue('hiring_stage_changed_email happ-1 → interview: sent')
  listAssignments.mockResolvedValue([])
  process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED = 'true'
})

afterEach(() => {
  delete process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED
})

describe('cortes que apagan toda comunicación', () => {
  it('master de emails OFF ⇒ no comunica ni asigna', async () => {
    emailsEnabled.mockReturnValue(false)

    const out = await resolveStageChangeCandidateComms(APP, payload())

    expect(out).toContain('flag OFF')
    expect(sendStageEmail).not.toHaveBeenCalled()
    expect(assignFromPolicy).not.toHaveBeenCalled()
  })

  it('postulación ya decidida ⇒ no-op (su comunicación es la de la decisión)', async () => {
    resolveContext.mockResolvedValue(ctx({ decision: 'rejected' }))

    const out = await resolveStageChangeCandidateComms(APP, payload())

    expect(out).toContain('ya decidida')
    expect(sendStageEmail).not.toHaveBeenCalled()
    expect(assignFromPolicy).not.toHaveBeenCalled()
  })

  it('application inexistente ⇒ no-op sin reventar', async () => {
    resolveContext.mockResolvedValue(null)

    expect(await resolveStageChangeCandidateComms(APP, payload())).toContain('no existe')
    expect(sendStageEmail).not.toHaveBeenCalled()
  })

  it('evento fuera de la ventana accionable ⇒ ni comunica ni asigna', async () => {
    const old = new Date(Date.now() - 72 * 3_600_000).toISOString()

    resolvePolicy.mockResolvedValue(enabledPolicy())

    const out = await resolveStageChangeCandidateComms(APP, payload({ _occurredAt: old }))

    expect(out).toContain('stale')
    expect(sendStageEmail).not.toHaveBeenCalled()
    expect(assignFromPolicy).not.toHaveBeenCalled()
  })

  it('un evento recién ocurrido NO se considera rancio', async () => {
    await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
  })
})

describe('camino sin automatización ⇒ correo genérico', () => {
  it('sin policy ⇒ genérico', async () => {
    await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
    expect(assignFromPolicy).not.toHaveBeenCalled()
  })

  it('policy en modo manual ⇒ genérico, nunca asigna sola', async () => {
    resolvePolicy.mockResolvedValue(enabledPolicy({ mode: 'manual' }))

    await resolveStageChangeCandidateComms(APP, payload())

    expect(assignFromPolicy).not.toHaveBeenCalled()
    expect(sendStageEmail).toHaveBeenCalledTimes(1)
  })

  it('policy que no está enabled ⇒ genérico', async () => {
    resolvePolicy.mockResolvedValue(enabledPolicy({ state: 'draft' }))

    await resolveStageChangeCandidateComms(APP, payload())

    expect(assignFromPolicy).not.toHaveBeenCalled()
  })

  it('la etapa vigente no es la etapa trigger ⇒ genérico', async () => {
    resolvePolicy.mockResolvedValue(enabledPolicy({ triggerStage: 'shortlisted' }))

    await resolveStageChangeCandidateComms(APP, payload())

    expect(assignFromPolicy).not.toHaveBeenCalled()
    expect(sendStageEmail).toHaveBeenCalledTimes(1)
  })

  it('flag de asignación OFF ⇒ genérico, y el candidato NUNCA queda sin comunicación', async () => {
    process.env.HIRING_STAGE_TEST_ASSIGNMENT_ENABLED = 'false'
    resolvePolicy.mockResolvedValue(enabledPolicy())

    await resolveStageChangeCandidateComms(APP, payload())

    expect(assignFromPolicy).not.toHaveBeenCalled()
    expect(sendStageEmail).toHaveBeenCalledTimes(1)
  })
})

describe('la etapa sale de PostgreSQL, nunca del payload', () => {
  it('con payload coalescido, comunica la etapa VIGENTE', async () => {
    // El consumer agrupa por scope y conserva el último payload: acá el payload dice
    // `shortlisted` pero la base dice `interview`. Se comunica lo que la base dice.
    resolveContext.mockResolvedValue(ctx({ stage: 'interview' }))

    await resolveStageChangeCandidateComms(APP, payload({ stage: 'shortlisted' }))

    expect(sendStageEmail).toHaveBeenCalledWith(APP, expect.objectContaining({ stage: 'interview' }))
  })

  it('evalúa el trigger contra la etapa vigente, no contra la del payload', async () => {
    // Payload dice `shortlisted`; la base dice `interview`; el trigger es `interview`.
    // Debe asignar: derivar del payload lo habría dejado pasar de largo.
    resolveContext.mockResolvedValue(ctx({ stage: 'interview' }))
    resolvePolicy.mockResolvedValue(enabledPolicy({ triggerStage: 'interview' }))
    assignFromPolicy.mockResolvedValue({ status: 'assigned', assignmentId: 'a-1', assessmentId: 'asmt-1', deliveryStatus: 'pending' })

    await resolveStageChangeCandidateComms(APP, payload({ stage: 'shortlisted' }))

    expect(assignFromPolicy).toHaveBeenCalledWith(expect.objectContaining({ triggerStage: 'interview', origin: 'stage_auto' }))
  })
})

describe('ni cero correos ni dos', () => {
  beforeEach(() => {
    resolvePolicy.mockResolvedValue(enabledPolicy())
  })

  it('assigned ⇒ el correo del test es la comunicación: NO se manda el genérico', async () => {
    assignFromPolicy.mockResolvedValue({ status: 'assigned', assignmentId: 'a-1', assessmentId: 'asmt-1', deliveryStatus: 'pending' })

    const out = await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).not.toHaveBeenCalled()
    expect(out).toContain('test asignado')
  })

  it('replay de nuestra propia asignación ⇒ NO se comunica de nuevo', async () => {
    assignFromPolicy.mockResolvedValue({ status: 'already_assigned', assignmentId: 'a-1', assessmentId: 'asmt-1' })
    listAssignments.mockResolvedValue([{ assignmentId: 'a-1', outcome: 'assigned', outcomeReason: null }])

    await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).not.toHaveBeenCalled()
  })

  it('instancia preexistente SIN correo entregado ⇒ NO habrá correo de test, degrada al genérico', async () => {
    // Sin esta rama el avance sería SILENCIOSO: el command no emite evento nuevo (para no
    // mandar un link viejo), así que si acá no comunicamos, no comunica nadie.
    assignFromPolicy.mockResolvedValue({ status: 'already_assigned', assignmentId: 'a-2', assessmentId: 'asmt-9' })
    listAssignments.mockResolvedValue([{ assignmentId: 'a-2', outcome: 'already_assigned', outcomeReason: 'existing_open_instance' }])

    await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
    expect(wasEmailDeliveredForEntity).toHaveBeenCalledWith('asmt-9', 'hiring_assessment_assigned')
  })

  it('instancia preexistente que YA entregó su correo de test ⇒ callar (no el segundo correo)', async () => {
    // La secuencia real: el reclutador asigna la prueba a mano y en el mismo minuto mueve al
    // candidato a `interview`. El assign manual ya mandó el correo del TEST; el `stage_changed`
    // llega acá y degradaba al genérico ⇒ dos correos por un movimiento. El deduplicador no los
    // ve (distinto `sourceEventId`, distinto `emailType`), así que la única defensa es ésta.
    assignFromPolicy.mockResolvedValue({ status: 'already_assigned', assignmentId: 'a-2', assessmentId: 'asmt-9' })
    listAssignments.mockResolvedValue([{ assignmentId: 'a-2', outcome: 'already_assigned', outcomeReason: 'existing_open_instance' }])
    deliveredEmails.add('asmt-9:hiring_assessment_assigned')

    const out = await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).not.toHaveBeenCalled()
    expect(out).toContain('ya entregó su correo de test')
  })

  it('instancia preexistente sin assessmentId resoluble ⇒ degrada (nunca callar a ciegas)', async () => {
    // `assessmentId: null` significa que no podemos verificar entrega alguna. Ante la duda se
    // comunica: un correo de más molesta, cero correos deja al candidato colgado.
    assignFromPolicy.mockResolvedValue({ status: 'already_assigned', assignmentId: 'a-2', assessmentId: null })
    listAssignments.mockResolvedValue([{ assignmentId: 'a-2', outcome: 'already_assigned', outcomeReason: 'existing_open_instance' }])

    await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
    expect(wasEmailDeliveredForEntity).not.toHaveBeenCalled()
  })

  // Combinaciones (status, reasonCode) que `resolveAssignmentIntent` REALMENTE produce. Un
  // fixture inventado — p.ej. `held`+`volume_cap`, que el código no puede emitir porque
  // `volume_cap` es siempre `blocked` — hace pasar el test sin probar nada del sistema real.
  it.each([
    ['blocked', 'missing_email'],
    ['blocked', 'unverified_recipient'],
    ['blocked', 'volume_cap'],
    ['blocked', 'template_inactive'],
    ['blocked', 'policy_disabled'],
    ['blocked', 'policy_mode_manual'],
    ['stale', 'stage_changed'],
    ['stale', 'application_decided'],
  ])('%s/%s ⇒ degrada al genérico en la MISMA ejecución', async (status, reasonCode) => {
    assignFromPolicy.mockResolvedValue({ status, assignmentId: 'a-3', reasonCode })

    const out = await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
    expect(out).toContain(status)
    expect(out).toContain(reasonCode)
  })

  // Cobertura defensiva declarada como tal: `held` está reservado al hold HUMANO (nadie lo emite
  // todavía) y `cancelled` sólo aparecería leyendo una fila de ledger cancelada NO superseded. Se
  // cubren para que la rama por defecto siga degradando el día que exista un emisor — no para
  // simular un flujo que hoy ocurra.
  it.each(['held', 'cancelled'])('%s degrada igual, aunque hoy ningún emisor lo produzca', async status => {
    assignFromPolicy.mockResolvedValue({ status, assignmentId: 'a-5', reasonCode: 'operator_cancelled' })

    const out = await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
    expect(out).toContain(status)
  })

  it('nunca promete un test que no existe: al degradar manda el aviso de avance, no uno de test', async () => {
    assignFromPolicy.mockResolvedValue({ status: 'blocked', assignmentId: 'a-4', reasonCode: 'missing_email' })

    await resolveStageChangeCandidateComms(APP, payload())

    expect(sendStageEmail).toHaveBeenCalledTimes(1)
  })
})

describe('fallo ⇒ reintento sin comunicar', () => {
  it('una excepción del command se propaga y NO degrada al genérico', async () => {
    resolvePolicy.mockResolvedValue(enabledPolicy())
    assignFromPolicy.mockRejectedValue(new Error('conexión caída'))

    await expect(resolveStageChangeCandidateComms(APP, payload())).rejects.toThrow('conexión caída')

    // Degradar acá convertiría un error transitorio en una comunicación equivocada e
    // irreversible: el reintento habría mandado el test Y este genérico.
    expect(sendStageEmail).not.toHaveBeenCalled()
  })
})

describe('el resultado no filtra PII', () => {
  /**
   * PII distintiva y presente en TODO lo que el handler tiene a mano: el contexto que resuelve
   * (nombre + correo del candidato) y el payload crudo del evento. Si alguien interpolara
   * cualquiera de esos campos en la descripción, estos tokens aparecerían.
   */
  const EMAIL = 'zzpii-candidata@ejemplo-fuga.cl'
  const NAME = 'ZzPiiNombreDeCandidata'
  const OPENING = 'ZzPiiVacanteConfidencial'

  const assertNoLeak = (out: string) => {
    expect(out).not.toContain(EMAIL)
    expect(out).not.toContain(NAME)
    expect(out).not.toContain(OPENING)
    expect(out).not.toMatch(/@/)
  }

  beforeEach(() => {
    resolveContext.mockResolvedValue(ctx({ candidateEmail: EMAIL, candidateName: NAME, openingTitle: OPENING }))
    resolvePolicy.mockResolvedValue(enabledPolicy())
    // Retorno REAL del sender (`sendHiringStageAdvancedEmail`): identificadores + status, nunca
    // destinatario. La descripción del handler lo interpola, así que su contrato PII-free es
    // parte de esta garantía y no un detalle del mock.
    sendStageEmail.mockResolvedValue('hiring_stage_changed_email happ-1 → interview: sent')
  })

  it('la rama que asigna no filtra nada', async () => {
    assignFromPolicy.mockResolvedValue({ status: 'assigned', assignmentId: 'a-1', assessmentId: 'asmt-1', deliveryStatus: 'pending' })

    assertNoLeak(await resolveStageChangeCandidateComms(APP, payload()))
  })

  it('la rama que degrada tampoco: interpola el retorno del sender, que es IDs + status', async () => {
    assignFromPolicy.mockResolvedValue({ status: 'blocked', assignmentId: 'a-3', reasonCode: 'missing_email' })

    const out = await resolveStageChangeCandidateComms(APP, payload())

    assertNoLeak(out)
    // Se ejercitó de verdad la rama que SÍ concatena la salida del sender.
    expect(out).toContain('sent')
  })

  it('el payload crudo del evento nunca se vuelca a la descripción', async () => {
    // Un payload de outbox puede traer campos que nadie auditó. Volcarlo al log reactivo
    // "para debuggear" es la fuga más fácil de introducir.
    resolvePolicy.mockResolvedValue(null)

    assertNoLeak(
      await resolveStageChangeCandidateComms(APP, payload({ candidateEmail: EMAIL, candidateName: NAME })),
    )
  })

  it('las ramas de corte temprano no filtran (no-op, decidida, stale)', async () => {
    resolveContext.mockResolvedValue(ctx({ candidateEmail: EMAIL, candidateName: NAME, decision: 'rejected' }))
    assertNoLeak(await resolveStageChangeCandidateComms(APP, payload()))

    resolveContext.mockResolvedValue(ctx({ candidateEmail: EMAIL, candidateName: NAME }))

    const old = new Date(Date.now() - 72 * 3_600_000).toISOString()

    assertNoLeak(await resolveStageChangeCandidateComms(APP, payload({ _occurredAt: old })))
  })
})
