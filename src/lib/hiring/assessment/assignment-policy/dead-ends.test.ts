import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RECOVERABLE_ASSIGNMENT_OUTCOMES } from './assignment-store'

vi.mock('server-only', () => ({}))

const queries: { text: string; values: unknown[] }[] = []
let handlers: { match: RegExp; rows: Record<string, unknown>[] }[] = []

const routeSql = async (text: string, values: unknown[] = []) => {
  queries.push({ text, values })

  const handler = handlers.find(h => h.match.test(text))

  return handler ? handler.rows : []
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async (text: string, values: unknown[] = []) => routeSql(text, values)),
  withGreenhousePostgresTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: async (text: string, values: unknown[] = []) => ({ rows: await routeSql(text, values) }) }),
  ),
}))

/**
 * `resolveLiveAssignmentIntent` se mockea para poder fijar el resultado VIVO de cada caso. Lo que
 * el test protege no es su lógica interna —ésa la cubren `assign.test.ts` y el gate vivo— sino que
 * el callejón la CONSULTE, y que le pase el origen y la etapa REGISTRADOS en la fila.
 */
vi.mock('./assign', () => ({ resolveLiveAssignmentIntent: vi.fn() }))

const { resolveLiveAssignmentIntent } = await import('./assign')
const liveIntent = vi.mocked(resolveLiveAssignmentIntent)

const {
  countAssignmentDeadEnds,
  evaluateAssignmentDeadEndRecovery,
  resolveAssignmentDeadEndsForPolicy,
  resolveEvaluatedAssignmentDeadEndsForPolicy,
  DEAD_END_RECOVERY_CAP,
} = await import('./dead-ends')

const POLICY_ROW = {
  policy_id: 'hoap-1',
  opening_id: 'opng-1',
  template_id: 'atpl-1',
  policy_version: 2,
  mode: 'on_stage_entry',
  state: 'enabled',
  trigger_stage: 'shortlisted',
  time_limit_minutes: 45,
  template_content_digest: 'digest',
  volume_cap_per_window: 3,
  volume_window_minutes: 60,
  created_by: 'user-1',
  enabled_by: 'user-1',
  enabled_at: '2026-08-17T00:00:00.000Z',
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
}

const DEAD_END_ROW = {
  assignment_id: 'hoaa-1',
  application_id: 'happ-1',
  policy_id: 'hoap-1',
  policy_version: 2,
  trigger_stage: 'shortlisted',
  attempt_seq: 1,
  origin: 'stage_auto',
  outcome: 'blocked',
  outcome_reason: 'volume_cap',
  created_at: '2026-08-19T04:00:00.000Z',
  application_stage: 'shortlisted',
  recovery_count: 0,
  total_matching: 1,
}

const policyHandler = (overrides: Record<string, unknown> = {}) => ({
  match: /FROM greenhouse_hiring\.hiring_opening_assessment_policy\s+WHERE policy_id/,
  rows: [{ ...POLICY_ROW, ...overrides }],
})

const deadEndListHandler = (rows: Record<string, unknown>[]) => ({
  match: /application_stage/,
  rows,
})

const excludedHandler = (total: number) => ({
  match: /NOT \(/,
  rows: [{ total }],
})

/** El SELECT de la lista y el de excluidos comparten fragmentos; el orden del router importa. */
const listQuery = () => queries.find(q => /application_stage/.test(q.text))
const excludedQuery = () => queries.find(q => /NOT \(/.test(q.text) && /COUNT\(\*\)::int AS total\b/.test(q.text))

beforeEach(() => {
  queries.length = 0
  handlers = []
  liveIntent.mockReset()
  liveIntent.mockResolvedValue({ outcome: 'assigned', reasonCode: null })
})

describe('resolveAssignmentDeadEndsForPolicy — el predicado del callejón', () => {
  it('exige las cinco condiciones que definen "esta fila quema una clave alcanzable"', async () => {
    handlers = [excludedHandler(0), deadEndListHandler([DEAD_END_ROW]), policyHandler()]

    await resolveAssignmentDeadEndsForPolicy('hoap-1')

    const sql = listQuery()?.text ?? ''

    // Sólo la fila VIGENTE ocupa la clave.
    expect(sql).toContain('asg.superseded_at IS NULL')
    // El carril manual tiene su propia reversa (attempt_seq + 1, TASK-1755).
    expect(sql).toContain("asg.origin <> 'manual'")
    // Una fila de versión o etapa vieja NO bloquea nada alcanzable: la clave incluye la versión.
    expect(sql).toContain('asg.policy_version = p.policy_version')
    expect(sql).toContain('asg.trigger_stage = p.trigger_stage')
    // Sin carril automático no hay callejón que desbloquear.
    expect(sql).toContain("p.state = 'enabled'")
    expect(sql).toContain("p.mode = 'on_stage_entry'")
  })

  it('sólo considera resultados recuperables, y los toma de la constante canónica', async () => {
    handlers = [excludedHandler(0), deadEndListHandler([DEAD_END_ROW]), policyHandler()]

    await resolveAssignmentDeadEndsForPolicy('hoap-1')

    expect(listQuery()?.values[0]).toEqual([...RECOVERABLE_ASSIGNMENT_OUTCOMES])
    expect(listQuery()?.text).toContain('asg.outcome = ANY($1::text[])')
  })

  it('excluye procedencia sintética y postulaciones archivadas, y REPORTA el conteo excluido', async () => {
    handlers = [excludedHandler(4), deadEndListHandler([]), policyHandler()]

    const queue = await resolveAssignmentDeadEndsForPolicy('hoap-1')

    expect(listQuery()?.text).toContain("app.data_origin = 'real'")
    expect(listQuery()?.text).toContain('app.archived_at IS NULL')
    // La exclusión nunca es silenciosa: si no se reportara, un cap por procedencia se leería
    // como "no hay callejones".
    expect(queue.excludedSynthetic).toBe(4)
    expect(queue.deadEnds).toHaveLength(0)
    expect(excludedQuery()?.text).toContain('NOT (')
  })

  it('declara el truncamiento en vez de dejar que un LIMIT se lea como "no hay más"', async () => {
    handlers = [
      excludedHandler(0),
      deadEndListHandler([{ ...DEAD_END_ROW, total_matching: 37 }]),
      policyHandler(),
    ]

    const queue = await resolveAssignmentDeadEndsForPolicy('hoap-1')

    expect(queue.totalMatching).toBe(37)
    expect(queue.truncated).toBe(true)
  })

  it('no trunca cuando el total cabe', async () => {
    handlers = [excludedHandler(0), deadEndListHandler([DEAD_END_ROW]), policyHandler()]

    const queue = await resolveAssignmentDeadEndsForPolicy('hoap-1')

    expect(queue.totalMatching).toBe(1)
    expect(queue.truncated).toBe(false)
    expect(queue.deadEnds[0]).toMatchObject({
      assignmentId: 'hoaa-1',
      outcome: 'blocked',
      outcomeReason: 'volume_cap',
      origin: 'stage_auto',
      recoveryCount: 0,
    })
  })

  it('devuelve la cola vacía cuando no hay carril automático que desbloquear', async () => {
    for (const override of [{ state: 'draft' }, { state: 'disabled' }, { mode: 'manual' }]) {
      queries.length = 0
      handlers = [excludedHandler(9), deadEndListHandler([DEAD_END_ROW]), policyHandler(override)]

      const queue = await resolveAssignmentDeadEndsForPolicy('hoap-1')

      expect(queue).toEqual({ deadEnds: [], totalMatching: 0, truncated: false, excludedSynthetic: 0 })
      // Y no consulta el ledger: sin policy activa la pregunta no aplica.
      expect(listQuery()).toBeUndefined()
    }
  })

  it('devuelve la cola vacía cuando la policy no existe', async () => {
    handlers = [{ match: /hiring_opening_assessment_policy\s+WHERE policy_id/, rows: [] }]

    const queue = await resolveAssignmentDeadEndsForPolicy('hoap-inexistente')

    expect(queue.deadEnds).toHaveLength(0)
    expect(queue.totalMatching).toBe(0)
  })

  it('acota el LIMIT pedido en vez de confiar en el caller', async () => {
    handlers = [excludedHandler(0), deadEndListHandler([DEAD_END_ROW]), policyHandler()]

    await resolveAssignmentDeadEndsForPolicy('hoap-1', null, 100000)

    expect(listQuery()?.values[1]).toBe(500)
  })
})

describe('countAssignmentDeadEnds — la señal no reescribe el predicado', () => {
  it('cuenta reales y sintéticos por separado, sin devolver un solo ID', async () => {
    handlers = [excludedHandler(4), deadEndListHandler([DEAD_END_ROW]), policyHandler()]

    const counts = await countAssignmentDeadEnds()

    expect(counts).toMatchObject({ deadEnds: 1, recoverable: 1, honest: 0, capReached: 0, excludedSynthetic: 4 })

    // La señal devuelve NÚMEROS y booleanos. Los IDs viajan por dentro para poder evaluar cada
    // fila, pero NO salen del resumen: una señal de reliability es PII-free por contrato.
    expect(Object.values(counts).every(value => typeof value === 'number' || typeof value === 'boolean')).toBe(true)
    expect(JSON.stringify(counts)).not.toContain('happ-')
    expect(JSON.stringify(counts)).not.toContain('hoaa-')
  })

  /**
   * INVARIANTE 19 del ADR. Es el test que impide que la señal y la cola se separen con el
   * tiempo: si alguien "arregla" uno de los dos predicados a mano, acá se rompe. Antes de esta
   * task ese drift ya había ocurrido una vez — un bump de versión de policy llenaba la cola
   * mientras la señal seguía en `ok`.
   */
  it('comparte literalmente el predicado con el reader scoped', async () => {
    handlers = [excludedHandler(0), deadEndListHandler([]), policyHandler()]
    await countAssignmentDeadEnds()

    const signalSql = listQuery()?.text ?? ''

    queries.length = 0
    handlers = [excludedHandler(0), deadEndListHandler([]), policyHandler()]
    await resolveAssignmentDeadEndsForPolicy('hoap-1')

    const readerSql = listQuery()?.text ?? ''

    for (const fragment of [
      'asg.superseded_at IS NULL',
      "asg.origin <> 'manual'",
      'asg.outcome = ANY($1::text[])',
      'asg.policy_version = p.policy_version',
      'asg.trigger_stage = p.trigger_stage',
      "p.state = 'enabled'",
      "p.mode = 'on_stage_entry'",
      "app.data_origin = 'real'",
      'app.archived_at IS NULL',
    ]) {
      expect(signalSql).toContain(fragment)
      expect(readerSql).toContain(fragment)
    }
  })
})

describe('evaluateAssignmentDeadEndRecovery — la condición de avance', () => {
  const POLICY = {
    policyId: 'hoap-1',
    openingId: 'opng-1',
    templateId: 'atpl-1',
    policyVersion: 2,
    mode: 'on_stage_entry' as const,
    state: 'enabled' as const,
    triggerStage: 'shortlisted' as const,
    timeLimitMinutes: 45,
    templateContentDigest: 'digest',
    volumeCapPerWindow: 3,
    volumeWindowMinutes: 60,
    createdBy: 'user-1',
    enabledBy: 'user-1',
    enabledAt: '2026-08-17T00:00:00.000Z',
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  }

  const deadEnd = (overrides: Record<string, unknown> = {}) => ({
    assignmentId: 'hoaa-1',
    applicationId: 'happ-1',
    policyId: 'hoap-1',
    policyVersion: 2,
    triggerStage: 'shortlisted' as const,
    attemptSeq: 1,
    origin: 'stage_auto' as const,
    outcome: 'blocked' as const,
    outcomeReason: 'volume_cap' as const,
    recordedAt: '2026-08-19T04:00:00.000Z',
    applicationStage: 'shortlisted',
    recoveryCount: 0,
    ...overrides,
  })

  it('es recuperable SÓLO cuando hoy la asignación ocurriría', async () => {
    liveIntent.mockResolvedValue({ outcome: 'assigned', reasonCode: null })

    const evaluation = await evaluateAssignmentDeadEndRecovery({} as never, POLICY, deadEnd())

    expect(evaluation).toMatchObject({ recoverable: true, blockedBy: null, liveOutcome: 'assigned' })
  })

  /**
   * EL CASO QUE OBLIGÓ AL CRITERIO ESTRICTO. Contra la base compartida (2026-08-23) hay filas que
   * dicen `volume_cap` y hoy evaluarían `policy_disabled`, porque su policy se apagó después. Con
   * "la evaluación difiere de lo registrado" como condición de avance, el supersede autorizaría
   * volver a quemar la clave con otra razón: el bucle con otro nombre.
   */
  it('NO es recuperable cuando la causa cambió pero sigue bloqueando', async () => {
    liveIntent.mockResolvedValue({ outcome: 'blocked', reasonCode: 'policy_disabled' })

    const evaluation = await evaluateAssignmentDeadEndRecovery({} as never, POLICY, deadEnd())

    expect(evaluation.liveReason).not.toBe(evaluation.recoverable ? null : 'volume_cap')
    expect(evaluation).toMatchObject({ recoverable: false, blockedBy: 'cause', liveReason: 'policy_disabled' })
  })

  it('tampoco es recuperable si hoy resolvería `stale`: superseder no revive una decisión tomada', async () => {
    liveIntent.mockResolvedValue({ outcome: 'stale', reasonCode: 'application_decided' })

    const evaluation = await evaluateAssignmentDeadEndRecovery({} as never, POLICY, deadEnd())

    expect(evaluation).toMatchObject({ recoverable: false, blockedBy: 'cause' })
  })

  it('el tope corta aunque la causa ya no aplique — es lo que detiene el bucle', async () => {
    liveIntent.mockResolvedValue({ outcome: 'assigned', reasonCode: null })

    const evaluation = await evaluateAssignmentDeadEndRecovery(
      {} as never,
      POLICY,
      deadEnd({ recoveryCount: DEAD_END_RECOVERY_CAP }),
    )

    // `recoverable` sigue describiendo el mundo (la causa se corrigió); `blockedBy` describe la
    // autoridad. Colapsarlos diría "la causa sigue aplicando", que sería mentir sobre por qué.
    expect(evaluation).toMatchObject({ recoverable: true, capReached: true, blockedBy: 'cap' })
  })

  it('evalúa con el origen y la etapa REGISTRADOS, no con los de una asignación manual', async () => {
    liveIntent.mockResolvedValue({ outcome: 'assigned', reasonCode: null })

    await evaluateAssignmentDeadEndRecovery({} as never, POLICY, deadEnd({ triggerStage: 'interview' }))

    // Evaluar un `stage_auto` como si fuera `manual` saltaría el cap de volumen y la guarda de
    // modo — dos de las siete condiciones, y justo las que más bloquean.
    expect(liveIntent).toHaveBeenCalledWith(expect.anything(), POLICY, 'happ-1', 'stage_auto', 'interview')
  })
})

describe('resolveEvaluatedAssignmentDeadEndsForPolicy — las tres poblaciones', () => {
  it('separa recuperable, honesto y agotado, que no son lo mismo', async () => {
    handlers = [
      excludedHandler(0),
      deadEndListHandler([
        { ...DEAD_END_ROW, assignment_id: 'hoaa-1', total_matching: 3 },
        { ...DEAD_END_ROW, assignment_id: 'hoaa-2', total_matching: 3 },
        { ...DEAD_END_ROW, assignment_id: 'hoaa-3', recovery_count: 3, total_matching: 3 },
      ]),
      policyHandler(),
    ]

    liveIntent
      .mockResolvedValueOnce({ outcome: 'assigned', reasonCode: null })
      .mockResolvedValueOnce({ outcome: 'blocked', reasonCode: 'template_inactive' })
      .mockResolvedValueOnce({ outcome: 'assigned', reasonCode: null })

    const queue = await resolveEvaluatedAssignmentDeadEndsForPolicy('hoap-1')

    expect(queue).toMatchObject({ recoverable: 1, honest: 1, capReached: 1, truncated: false })
    expect(queue.deadEnds.map(d => d.evaluation.blockedBy)).toEqual([null, 'cause', 'cap'])
  })

  it('no evalúa nada cuando no hay callejones: la cola vacía no consulta el mundo', async () => {
    handlers = [excludedHandler(2), deadEndListHandler([]), policyHandler()]

    const queue = await resolveEvaluatedAssignmentDeadEndsForPolicy('hoap-1')

    expect(queue).toMatchObject({ recoverable: 0, honest: 0, capReached: 0, excludedSynthetic: 2 })
    expect(liveIntent).not.toHaveBeenCalled()
  })
})
