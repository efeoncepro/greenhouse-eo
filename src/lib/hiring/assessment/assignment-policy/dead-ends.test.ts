import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RECOVERABLE_ASSIGNMENT_OUTCOMES } from './assignment-store'

vi.mock('server-only', () => ({}))

const queries: { text: string; values: unknown[] }[] = []
let handlers: { match: RegExp; rows: Record<string, unknown>[] }[] = []

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async (text: string, values: unknown[] = []) => {
    queries.push({ text, values })

    const handler = handlers.find(h => h.match.test(text))

    return handler ? handler.rows : []
  }),
  withGreenhousePostgresTransaction: vi.fn(),
}))

const { countAssignmentDeadEnds, resolveAssignmentDeadEndsForPolicy } = await import('./dead-ends')

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

    expect(listQuery()?.values[2]).toBe(500)
  })
})

describe('countAssignmentDeadEnds — la señal no reescribe el predicado', () => {
  it('cuenta reales y sintéticos por separado, sin devolver un solo ID', async () => {
    handlers = [{ match: /dead_ends/, rows: [{ dead_ends: 3, excluded_synthetic: 4 }] }]

    const counts = await countAssignmentDeadEnds()

    expect(counts).toEqual({ deadEnds: 3, excludedSynthetic: 4 })

    // La señal devuelve NÚMEROS. Los IDs aparecen en el JOIN —son la llave— pero no pueden
    // salir en la proyección: una señal de reliability es PII-free por contrato.
    const projection = (queries[0]?.text ?? '').split(/\bFROM\b/)[0]

    expect(projection).not.toContain('application_id')
    expect(projection).not.toContain('assignment_id')
    expect(Object.values(counts).every(value => typeof value === 'number')).toBe(true)
  })

  /**
   * INVARIANTE 19 del ADR. Es el test que impide que la señal y la cola se separen con el
   * tiempo: si alguien "arregla" uno de los dos predicados a mano, acá se rompe. Antes de esta
   * task ese drift ya había ocurrido una vez — un bump de versión de policy llenaba la cola
   * mientras la señal seguía en `ok`.
   */
  it('comparte literalmente el predicado con el reader scoped', async () => {
    handlers = [{ match: /dead_ends/, rows: [{ dead_ends: 0, excluded_synthetic: 0 }] }]
    await countAssignmentDeadEnds()

    const signalSql = queries[0]?.text ?? ''

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
