import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()
const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const supersedeOrphansMock = vi.fn()

const createScoringRunMock = vi.fn()
const findActiveScoringRunMock = vi.fn()
const getScoringRunByIdMock = vi.fn()
const insertRunEventMock = vi.fn()
const insertRunItemsMock = vi.fn()
const listRunItemsMock = vi.fn()
const listScoringRunsForAssessmentMock = vi.fn()
const lockScoringRunForUpdateMock = vi.fn()
const transitionRunItemMock = vi.fn()
const transitionScoringRunMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

vi.mock('../proposal-store', () => ({
  supersedeOrphanResponseScoreProposals: (...args: unknown[]) => supersedeOrphansMock(...args),
}))

vi.mock('./store', () => ({
  createScoringRun: (...args: unknown[]) => createScoringRunMock(...args),
  findActiveScoringRun: (...args: unknown[]) => findActiveScoringRunMock(...args),
  getScoringRunById: (...args: unknown[]) => getScoringRunByIdMock(...args),
  insertRunEvent: (...args: unknown[]) => insertRunEventMock(...args),
  insertRunItems: (...args: unknown[]) => insertRunItemsMock(...args),
  listRunItems: (...args: unknown[]) => listRunItemsMock(...args),
  listScoringRunsForAssessment: (...args: unknown[]) => listScoringRunsForAssessmentMock(...args),
  lockScoringRunForUpdate: (...args: unknown[]) => lockScoringRunForUpdateMock(...args),
  transitionRunItem: (...args: unknown[]) => transitionRunItemMock(...args),
  transitionScoringRun: (...args: unknown[]) => transitionScoringRunMock(...args),
}))

const { resolveRunTransition } = await import('./state')

const {
  cancelAssessmentAiScoringRun,
  computeScoringRunInputDigest,
  listEligibleResponses,
  reconcileAssessmentAiScoringRuns,
  startAssessmentAiScoringRun,
} = await import('./commands')

// ── Fixtures ──

const runFixture = {
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  inputDigest: 'digest-1',
  model: 'claude-sonnet-5',
  promptVersion: 'hiring_assessment_ai_scoring.v1',
  policyVersion: 'hiring_assessment_ai_risk_policy.v1',
  status: 'created' as const,
  statusReason: null,
  leaseOwner: null,
  leaseExpiresAt: null,
  createdBy: 'user-1',
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
}

const itemFixture = {
  runItemId: 'asri-1',
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  responseId: 'arsp-1',
  proposalId: null,
  inputDigest: null,
  status: 'pending' as const,
  riskClass: null,
  reasonCode: null,
  routingReasons: [] as string[],
  attemptCount: 0,
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
}

const assessmentRow = { assessment_id: 'asmt-1', application_id: 'happ-1', status: 'submitted' }

const eligibleRows = [
  { response_id: 'arsp-1', answer_json: { text: 'Respuesta abierta A' }, question_prompt: '¿P1?', rubric_json: { c: 1 } },
  { response_id: 'arsp-2', answer_json: { text: 'Respuesta abierta B' }, question_prompt: '¿P2?', rubric_json: { c: 2 } },
]

const txClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'

  withTransactionMock.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) => fn(txClient))
  txClient.query.mockReset()

  // Transición con la state machine REAL (el mock solo evita la DB).
  transitionScoringRunMock.mockImplementation(async (_client, run, target, opts) => {
    const t = resolveRunTransition(run.status, target)

    return t.apply ? { ...run, status: t.next, statusReason: opts?.reasonCode ?? null } : run
  })
  transitionRunItemMock.mockImplementation(async (_client, item, target, opts) => ({
    ...item,
    status: target,
    reasonCode: opts?.reasonCode ?? null,
  }))

  findActiveScoringRunMock.mockResolvedValue(null)
  createScoringRunMock.mockResolvedValue({ run: runFixture, created: true })
  insertRunItemsMock.mockResolvedValue([itemFixture, { ...itemFixture, runItemId: 'asri-2', responseId: 'arsp-2' }])
  listRunItemsMock.mockResolvedValue([itemFixture])
})

afterEach(() => {
  delete process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED
})

// ── Digest (Delta punto 5: modelo EFECTIVO, orden estable) ──

describe('computeScoringRunInputDigest', () => {
  const parts = [
    { responseId: 'arsp-1', questionPrompt: '¿P1?', rubricJson: { c: 1 }, answerText: 'A' },
    { responseId: 'arsp-2', questionPrompt: '¿P2?', rubricJson: { c: 2 }, answerText: 'B' },
  ]

  it('es determinístico e insensible al orden de las respuestas', () => {
    const a = computeScoringRunInputDigest('asmt-1', 'claude-sonnet-5', 'p.v1', 'pol.v1', parts)
    const b = computeScoringRunInputDigest('asmt-1', 'claude-sonnet-5', 'p.v1', 'pol.v1', [...parts].reverse())

    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it('cambia si cambia el modelo EFECTIVO, la policy o una respuesta', () => {
    const base = computeScoringRunInputDigest('asmt-1', 'claude-sonnet-5', 'p.v1', 'pol.v1', parts)

    expect(computeScoringRunInputDigest('asmt-1', 'claude-opus-5', 'p.v1', 'pol.v1', parts)).not.toBe(base)
    expect(computeScoringRunInputDigest('asmt-1', 'claude-sonnet-5', 'p.v1', 'pol.v2', parts)).not.toBe(base)
    expect(
      computeScoringRunInputDigest('asmt-1', 'claude-sonnet-5', 'p.v1', 'pol.v1', [
        parts[0],
        { ...parts[1], answerText: 'B editada' },
      ]),
    ).not.toBe(base)
  })
})

// ── Enumeración exacta (Slice 2 la reusa desde el drain) ──

describe('listEligibleResponses', () => {
  it('filtra por assessment EXACTO + needs_human_rating pendiente + tipos human-rated', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) }

    await listEligibleResponses('asmt-9', client as never)

    const [text, values] = client.query.mock.calls[0]

    expect(text).toContain('r.assessment_id = $1')
    expect(text).toContain('needs_human_rating = TRUE')
    expect(text).toContain('human_score IS NULL')
    expect(values[0]).toBe('asmt-9')
    expect(values[1]).toEqual(['situational', 'open_text'])
  })
})

// ── start ──

describe('startAssessmentAiScoringRun', () => {
  it('flag OFF → 409 estable sin tocar la DB', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'false'

    await expect(startAssessmentAiScoringRun('asmt-1', 'user-1')).rejects.toMatchObject({
      code: 'assessment_ai_run_enqueue_disabled',
      statusCode: 409,
    })

    expect(runQueryMock).not.toHaveBeenCalled()
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('replay idempotente: run activo con el mismo digest → lo retorna SIN crear nada', async () => {
    runQueryMock.mockResolvedValueOnce([assessmentRow]).mockResolvedValueOnce(eligibleRows)
    findActiveScoringRunMock.mockResolvedValue({ ...runFixture, status: 'scoring' })

    const result = await startAssessmentAiScoringRun('asmt-1', 'user-1')

    expect(result.created).toBe(false)
    expect(result.run.runId).toBe('asrun-1')
    expect(withTransactionMock).not.toHaveBeenCalled()
    expect(createScoringRunMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('crea run + items + historia + outbox IDs-only y termina en scoring', async () => {
    runQueryMock.mockResolvedValueOnce([assessmentRow]).mockResolvedValueOnce(eligibleRows)

    const result = await startAssessmentAiScoringRun('asmt-1', 'user-1')

    expect(result.created).toBe(true)
    expect(result.run.status).toBe('scoring')
    expect(result.items).toHaveLength(2)

    // Enumeración exacta: los items nacen de las respuestas elegibles del assessment.
    expect(insertRunItemsMock.mock.calls[0][2]).toEqual(['arsp-1', 'arsp-2'])

    expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.eventType).toBe('hiring.assessment.ai_run_created')
    expect(event.payload).toMatchObject({ runId: 'asrun-1', assessmentId: 'asmt-1', applicationId: 'happ-1', itemCount: 2 })

    // IDs-only: el texto del candidato JAMÁS viaja en el payload del outbox.
    expect(JSON.stringify(event.payload)).not.toContain('Respuesta abierta')
  })

  it('carrera perdida del índice único (created=false) → retorna el ganador sin re-enumerar ni re-emitir', async () => {
    runQueryMock.mockResolvedValueOnce([assessmentRow]).mockResolvedValueOnce(eligibleRows)
    createScoringRunMock.mockResolvedValue({ run: { ...runFixture, status: 'scoring' }, created: false })

    const result = await startAssessmentAiScoringRun('asmt-1', 'user-1')

    expect(result.created).toBe(false)
    expect(insertRunItemsMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('sin respuestas elegibles → run awaiting_review con reason no_eligible_items (nada desaparece)', async () => {
    runQueryMock.mockResolvedValueOnce([assessmentRow]).mockResolvedValueOnce([])
    insertRunItemsMock.mockResolvedValue([])

    const result = await startAssessmentAiScoringRun('asmt-1', 'user-1')

    expect(result.run.status).toBe('awaiting_review')
    expect(result.run.statusReason).toBe('no_eligible_items')
    expect(result.items).toHaveLength(0)
  })

  it('assessment inexistente → 404', async () => {
    runQueryMock.mockResolvedValueOnce([])

    await expect(startAssessmentAiScoringRun('asmt-nope', 'user-1')).rejects.toMatchObject({
      code: 'assessment_not_found',
    })
  })
})

// ── cancel (terminal-once, NO flag-gated: es el camino de rollback) ──

describe('cancelAssessmentAiScoringRun', () => {
  it('opera con el flag de enqueue OFF (rollback por commands, Delta punto 4)', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'false'
    lockScoringRunForUpdateMock.mockResolvedValue({ ...runFixture, status: 'scoring' })
    listRunItemsMock.mockResolvedValue([itemFixture])

    const result = await cancelAssessmentAiScoringRun('asrun-1', 'user-1')

    expect(result.run.status).toBe('cancelled')
  })

  it('cancela run + items no terminales y emite el evento', async () => {
    lockScoringRunForUpdateMock.mockResolvedValue({ ...runFixture, status: 'scoring' })
    listRunItemsMock.mockResolvedValue([itemFixture, { ...itemFixture, runItemId: 'asri-2', status: 'abstained' }])

    const result = await cancelAssessmentAiScoringRun('asrun-1', 'user-1', 'rollback_drill')

    expect(result.run.status).toBe('cancelled')
    expect(result.run.statusReason).toBe('rollback_drill')

    // Solo el item no terminal transiciona; el abstained no se toca.
    expect(transitionRunItemMock).toHaveBeenCalledTimes(1)
    expect(transitionRunItemMock.mock.calls[0][1].runItemId).toBe('asri-1')

    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.eventType).toBe('hiring.assessment.ai_run_cancelled')
    expect(event.payload).toMatchObject({ runId: 'asrun-1', reasonCode: 'rollback_drill', actorUserId: 'user-1' })
  })

  it('terminal-once: cancelar un run ya cancelled es no-op idempotente (sin re-tocar items ni re-emitir)', async () => {
    lockScoringRunForUpdateMock.mockResolvedValue({ ...runFixture, status: 'cancelled' })
    listRunItemsMock.mockResolvedValue([{ ...itemFixture, status: 'cancelled' }])

    const result = await cancelAssessmentAiScoringRun('asrun-1', 'user-1')

    expect(result.run.status).toBe('cancelled')
    expect(transitionRunItemMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('terminal-once: cancelar un run confirmed → 409 (nunca se des-confirma)', async () => {
    lockScoringRunForUpdateMock.mockResolvedValue({ ...runFixture, status: 'confirmed' })

    await expect(cancelAssessmentAiScoringRun('asrun-1', 'user-1')).rejects.toMatchObject({
      code: 'assessment_ai_run_invalid_transition',
      statusCode: 409,
    })
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('sin actor → 401', async () => {
    await expect(cancelAssessmentAiScoringRun('asrun-1', '')).rejects.toMatchObject({
      code: 'assessment_ai_run_missing_actor',
      statusCode: 401,
    })
  })
})

// ── reconcile (backlog huérfano D3 — fixture del caso real EO-ASM-0050) ──

describe('reconcileAssessmentAiScoringRuns', () => {
  it('caso EO-ASM-0050: proposals proposed + assessment scored → superseded_by_manual + evento con counts', async () => {
    // El carril manual aplicó recordHumanScore + finalizeAssessment sin confirm: las
    // proposals del ledger quedaron huérfanas en `proposed` para siempre (Delta punto 3).
    supersedeOrphansMock.mockResolvedValue([
      { proposalId: 'aip-1', status: 'superseded_by_manual', targetRef: 'arsp-1' },
      { proposalId: 'aip-2', status: 'superseded_by_manual', targetRef: 'arsp-2' },
      { proposalId: 'aip-3', status: 'superseded_by_manual', targetRef: 'arsp-3' },
    ])
    txClient.query
      // items no terminales superados por el score humano
      .mockResolvedValueOnce({ rows: [{ run_item_id: 'asri-1', run_id: 'asrun-1' }] })
      // runs sin trabajo restante de assessments ya scored
      .mockResolvedValueOnce({ rows: [{ run_id: 'asrun-1' }] })

    const result = await reconcileAssessmentAiScoringRuns('system:reconciler')

    expect(result).toEqual({ proposalsSuperseded: 3, itemsSuperseded: 1, runsClosed: 1 })

    // Historia append-only: un evento de reconciliación por item y por run cerrado.
    expect(insertRunEventMock).toHaveBeenCalledTimes(2)
    expect(insertRunEventMock.mock.calls[0][1]).toMatchObject({
      runId: 'asrun-1',
      runItemId: 'asri-1',
      eventType: 'reconciliation',
      toStatus: 'superseded_by_manual',
    })
    expect(insertRunEventMock.mock.calls[1][1]).toMatchObject({
      runId: 'asrun-1',
      eventType: 'reconciliation',
      toStatus: 'cancelled',
      reasonCode: 'superseded_by_manual',
    })

    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.eventType).toBe('hiring.assessment.ai_run_reconciled')
    expect(event.payload).toMatchObject({ proposalsSuperseded: 3, itemsSuperseded: 1, runsClosed: 1 })
  })

  it('idempotente: segunda pasada sin huérfanas → cero cambios y CERO evento', async () => {
    supersedeOrphansMock.mockResolvedValue([])
    txClient.query.mockResolvedValue({ rows: [] })

    const result = await reconcileAssessmentAiScoringRuns(null)

    expect(result).toEqual({ proposalsSuperseded: 0, itemsSuperseded: 0, runsClosed: 0 })
    expect(insertRunEventMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('opera con todos los flags OFF (es parte del camino de rollback/limpieza)', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'false'
    supersedeOrphansMock.mockResolvedValue([])
    txClient.query.mockResolvedValue({ rows: [] })

    await expect(reconcileAssessmentAiScoringRuns(null)).resolves.toBeTruthy()
  })
})
