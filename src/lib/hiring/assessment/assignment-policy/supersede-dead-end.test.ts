import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queries: { text: string; values: unknown[] }[] = []
let handlers: { match: RegExp; rows: Record<string, unknown>[] }[] = []

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async () => []),
  withGreenhousePostgresTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values })

        const handler = handlers.find(h => h.match.test(text))

        return { rows: handler ? handler.rows : [] }
      },
    }),
  ),
}))

vi.mock('./assign', () => ({ resolveLiveAssignmentIntent: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn(async () => undefined) }))

const { resolveLiveAssignmentIntent } = await import('./assign')
const { publishOutboxEvent } = await import('@/lib/sync/publish-event')
const { supersedeAssignmentDeadEnd } = await import('./supersede-dead-end')
const { DEAD_END_RECOVERY_CAP } = await import('./dead-ends')

const liveIntent = vi.mocked(resolveLiveAssignmentIntent)
const publish = vi.mocked(publishOutboxEvent)

const ASSIGNMENT_ROW = {
  assignment_id: 'hoaa-1',
  application_id: 'happ-1',
  policy_id: 'hoap-1',
  assessment_id: null,
  policy_version: 2,
  trigger_stage: 'shortlisted',
  attempt_seq: 1,
  origin: 'stage_auto',
  outcome: 'blocked',
  outcome_reason: 'volume_cap',
  superseded_at: null,
  actor_user_id: null,
  created_at: '2026-08-19T04:00:00.000Z',
  updated_at: '2026-08-19T04:00:00.000Z',
}

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

const scenario = (
  overrides: {
    assignment?: Record<string, unknown> | null
    policy?: Record<string, unknown>
    recoveryCount?: number
    updateAffects?: boolean
  } = {},
) => {
  const assignment = overrides.assignment === null ? [] : [{ ...ASSIGNMENT_ROW, ...overrides.assignment }]

  handlers = [
    { match: /UPDATE greenhouse_hiring\.hiring_assessment_assignment/, rows: overrides.updateAffects === false ? [] : [{ assignment_id: 'hoaa-1' }] },
    { match: /COUNT\(\*\)::int AS total/, rows: [{ total: overrides.recoveryCount ?? 0 }] },
    { match: /hiring_opening_assessment_policy\s+WHERE policy_id/, rows: [{ ...POLICY_ROW, ...overrides.policy }] },
    { match: /hiring_assessment_assignment\s+WHERE assignment_id/, rows: assignment },
  ]
}

const input = { assignmentId: 'hoaa-1', openingId: 'opng-1', actorUserId: 'user-hr-1' }

beforeEach(() => {
  queries.length = 0
  handlers = []
  liveIntent.mockReset()
  liveIntent.mockResolvedValue({ outcome: 'assigned', reasonCode: null })
  publish.mockClear()
})

describe('supersedeAssignmentDeadEnd — el camino feliz', () => {
  it('libera la clave y publica el evento de auditoría', async () => {
    scenario()

    const result = await supersedeAssignmentDeadEnd(input)

    expect(result).toEqual({
      status: 'superseded',
      assignmentId: 'hoaa-1',
      applicationId: 'happ-1',
      recoveryCount: 1,
      remainingRecoveries: DEAD_END_RECOVERY_CAP - 1,
    })
    expect(publish).toHaveBeenCalledTimes(1)
  })

  /**
   * EL INVARIANTE MÁS FÁCIL DE ROMPER. `supersedeAssignmentsForAssessment` —el otro supersede del
   * dominio— reescribe `outcome` a `cancelled`, y copiar ese patrón acá borraría el `volume_cap`
   * que explica POR QUÉ se bloqueó, que es todo el valor de auditoría de la fila.
   */
  it('estampa SÓLO superseded_at: no toca outcome ni outcome_reason', async () => {
    scenario()

    await supersedeAssignmentDeadEnd(input)

    const update = queries.find(q => /UPDATE greenhouse_hiring\.hiring_assessment_assignment/.test(q.text))

    expect(update?.text).toContain('superseded_at = NOW()')
    expect(update?.text).not.toContain('outcome =')
    expect(update?.text).not.toContain('outcome_reason =')
    // Y sólo sobre la fila vigente: el WHERE es lo que hace del doble supersede un no-op.
    expect(update?.text).toContain('superseded_at IS NULL')
  })

  it('el evento es IDs-only y conserva el motivo registrado', async () => {
    scenario()

    await supersedeAssignmentDeadEnd(input)

    const payload = publish.mock.calls[0][0].payload as Record<string, unknown>

    expect(payload).toMatchObject({
      assignmentId: 'hoaa-1',
      applicationId: 'happ-1',
      recordedOutcome: 'blocked',
      recordedReason: 'volume_cap',
      recoveryCount: 1,
      actorUserId: 'user-hr-1',
    })

    const serialized = JSON.stringify(payload)

    expect(serialized).not.toMatch(/@/)
    expect(serialized).not.toMatch(/token/i)
    expect(serialized).not.toMatch(/score/i)
  })

  it('toma el lock de policy ANTES de re-leer la fila del ledger', async () => {
    scenario()

    await supersedeAssignmentDeadEnd(input)

    const forUpdate = queries.filter(q => /FOR UPDATE/.test(q.text)).map(q => q.text)

    // policy → ledger es el orden que toma `assignAssessmentFromPolicy`. Invertirlo acá sería la
    // receta del deadlock entre el supersede y una asignación concurrente de la misma policy.
    expect(forUpdate.some(t => /hiring_assessment_assignment/.test(t))).toBe(true)
    expect(forUpdate.some(t => /hiring_opening_assessment_policy/.test(t))).toBe(true)
    expect(forUpdate.filter(t => /hiring_opening_assessment_policy/.test(t))).toHaveLength(1)
  })
})

describe('supersedeAssignmentDeadEnd — los frenos', () => {
  /**
   * LA CONDICIÓN DE AVANCE, con el caso que la obligó. Verificado contra PostgreSQL el
   * 2026-08-23: hay filas que dicen `volume_cap` y hoy evaluarían `policy_disabled`. Con
   * "difiere de lo registrado" como criterio, el command las liberaría para volver a quemar la
   * clave con otra razón — y de paso gastaría una de las tres recuperaciones de esa persona.
   */
  it('rechaza cuando la causa cambió pero sigue bloqueando', async () => {
    scenario()
    liveIntent.mockResolvedValue({ outcome: 'blocked', reasonCode: 'policy_disabled' })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_cause_still_blocking',
      statusCode: 409,
    })
    expect(publish).not.toHaveBeenCalled()
  })

  it('rechaza cuando hoy resolvería `stale`: liberar no revive una decisión tomada', async () => {
    scenario()
    liveIntent.mockResolvedValue({ outcome: 'stale', reasonCode: 'application_decided' })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_cause_still_blocking',
    })
  })

  it('el tope detiene el bucle aunque la causa ya no aplique', async () => {
    scenario({ recoveryCount: DEAD_END_RECOVERY_CAP })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_cap_reached',
      details: { recoveryCount: DEAD_END_RECOVERY_CAP, cap: DEAD_END_RECOVERY_CAP },
    })
    expect(publish).not.toHaveBeenCalled()
  })

  it('el tope permite la última recuperación y la declara como última', async () => {
    scenario({ recoveryCount: DEAD_END_RECOVERY_CAP - 1 })

    const result = await supersedeAssignmentDeadEnd(input)

    expect(result).toMatchObject({ status: 'superseded', remainingRecoveries: 0 })
  })

  it('evalúa la causa con el origen y la etapa REGISTRADOS en la fila', async () => {
    scenario({ assignment: { trigger_stage: 'interview' }, policy: { trigger_stage: 'interview' } })

    await supersedeAssignmentDeadEnd(input)

    expect(liveIntent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ policyId: 'hoap-1' }),
      'happ-1',
      'stage_auto',
      'interview',
    )
  })
})

describe('supersedeAssignmentDeadEnd — lo que NUNCA se puede superseder', () => {
  it('un `assigned` vigente: esa clave está ocupada legítimamente', async () => {
    scenario({ assignment: { outcome: 'assigned', assessment_id: 'hasm-1' } })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_not_recoverable',
      details: { outcome: 'assigned' },
    })
  })

  it('un `intent` en reposo: es un FAULT, no un callejón', async () => {
    scenario({ assignment: { outcome: 'intent' } })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_not_recoverable',
    })
  })

  it('una fila del carril manual: su reversa es un intento nuevo', async () => {
    scenario({ assignment: { origin: 'manual', trigger_stage: 'manual' } })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_manual_lane',
    })
  })

  it('una fila de versión vieja: ya no bloquea ninguna clave alcanzable', async () => {
    scenario({ assignment: { policy_version: 1 } })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_stale_key',
    })
  })

  it('una policy sin carril automático activo', async () => {
    scenario({ policy: { state: 'disabled' } })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_policy_inactive',
    })
  })
})

describe('supersedeAssignmentDeadEnd — scope, actor e idempotencia', () => {
  it('una fila de OTRA vacante responde 404, nunca 403', async () => {
    scenario({ policy: { opening_id: 'opng-ajena' } })

    // Un 403 le confirmaría a quien sondea que la fila existe.
    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_not_found',
      statusCode: 404,
    })
  })

  it('exige actor humano: el carril reactivo corre con actorUserId nulo', async () => {
    scenario()

    await expect(supersedeAssignmentDeadEnd({ ...input, actorUserId: '  ' })).rejects.toMatchObject({
      code: 'assessment_assignment_supersede_actor_required',
      statusCode: 400,
    })
    // Ni siquiera abre transacción: corta antes de tocar la base.
    expect(queries).toHaveLength(0)
  })

  it('superseder dos veces es un no-op observable, no un doble efecto', async () => {
    scenario({ assignment: { superseded_at: '2026-08-20T00:00:00.000Z' } })

    const result = await supersedeAssignmentDeadEnd(input)

    expect(result).toEqual({ status: 'already_superseded', assignmentId: 'hoaa-1', applicationId: 'happ-1' })
    expect(publish).not.toHaveBeenCalled()
  })

  it('la carrera perdida contra otro supersede tampoco publica evento', async () => {
    scenario({ updateAffects: false })

    const result = await supersedeAssignmentDeadEnd(input)

    expect(result.status).toBe('already_superseded')
    expect(publish).not.toHaveBeenCalled()
  })

  it('una asignación inexistente es 404', async () => {
    scenario({ assignment: null })

    await expect(supersedeAssignmentDeadEnd(input)).rejects.toMatchObject({
      code: 'assessment_assignment_not_found',
      statusCode: 404,
    })
  })
})
