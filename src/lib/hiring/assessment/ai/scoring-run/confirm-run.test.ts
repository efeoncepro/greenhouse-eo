import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// TASK-1734 Slice 4 — resolución de excepciones UNO a uno + confirmación de run por lote.
// Cubre: terminal-once por item, gates del batch confirm (mandatory pendiente / sample
// incompleta / digest stale / flag OFF / assessment scored), el camino feliz aplicando VÍA
// confirmAiProposal (canónico, cero bypass) + manifest append-only, y la idempotencia del
// run ya confirmado (sin re-aplicar efectos ni manifest nuevo).

const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const confirmAiProposalMock = vi.fn()
const requireAiProposalByIdMock = vi.fn()
const computeResponseScoreInputDigestMock = vi.fn()
const extractResponseAnswerTextMock = vi.fn()
const computeCurrentScoringRunDigestMock = vi.fn()
const isRunConfirmEnabledMock = vi.fn()

const getRunItemInRunMock = vi.fn()
const insertRunEventMock = vi.fn()
const listRunItemsMock = vi.fn()
const lockScoringRunForUpdateMock = vi.fn()
const transitionRunItemMock = vi.fn()
const transitionScoringRunMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

vi.mock('../confirm', () => ({
  confirmAiProposal: (...args: unknown[]) => confirmAiProposalMock(...args),
}))

vi.mock('../proposal-store', () => ({
  requireAiProposalById: (...args: unknown[]) => requireAiProposalByIdMock(...args),
}))

vi.mock('../score-response', () => ({
  computeResponseScoreInputDigest: (...args: unknown[]) => computeResponseScoreInputDigestMock(...args),
  extractResponseAnswerText: (...args: unknown[]) => extractResponseAnswerTextMock(...args),
}))

vi.mock('./commands', () => ({
  computeCurrentScoringRunDigest: (...args: unknown[]) => computeCurrentScoringRunDigestMock(...args),
}))

vi.mock('./config', () => ({
  isHiringAssessmentAiRunConfirmEnabled: () => isRunConfirmEnabledMock(),
}))

vi.mock('./store', () => ({
  getRunItemInRun: (...args: unknown[]) => getRunItemInRunMock(...args),
  insertRunEvent: (...args: unknown[]) => insertRunEventMock(...args),
  listRunItems: (...args: unknown[]) => listRunItemsMock(...args),
  lockScoringRunForUpdate: (...args: unknown[]) => lockScoringRunForUpdateMock(...args),
  transitionRunItem: (...args: unknown[]) => transitionRunItemMock(...args),
  transitionScoringRun: (...args: unknown[]) => transitionScoringRunMock(...args),
}))

const { confirmAssessmentAiScoringRun, resolveScoringRunItem } = await import('./confirm-run')

// ── Fixtures ──

const runFixture = (over: Record<string, unknown> = {}) => ({
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  inputDigest: 'run-digest-1',
  model: 'claude-sonnet-5',
  promptVersion: 'hiring_assessment_ai_scoring.v1',
  policyVersion: 'hiring_assessment_ai_risk_policy.v1',
  status: 'awaiting_review' as const,
  statusReason: null,
  leaseOwner: null,
  leaseExpiresAt: null,
  createdBy: 'user-1',
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
  ...over,
})

const itemFixture = (over: Record<string, unknown> = {}) => ({
  runItemId: 'asri-1',
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  responseId: 'resp-1',
  proposalId: 'aiprop-1',
  inputDigest: null,
  status: 'proposed' as const,
  riskClass: 'mandatory_review' as const,
  reasonCode: null,
  routingReasons: ['score_decision_near_band'],
  attemptCount: 1,
  resolution: null,
  sawProposalBeforeScoring: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
  ...over,
})

const fakeClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()

  withTransactionMock.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(fakeClient))

  fakeClient.query.mockImplementation(async (text: string) => {
    if (text.includes('FROM greenhouse_hiring.hiring_assessment WHERE assessment_id')) {
      return { rows: [{ status: 'submitted' }] }
    }

    if (text.includes('hiring_assessment_response')) {
      return { rows: [{ answer_json: { text: 'respuesta' }, question_prompt: 'Pregunta' }] }
    }

    return { rows: [] }
  })

  lockScoringRunForUpdateMock.mockResolvedValue(runFixture())
  getRunItemInRunMock.mockResolvedValue(itemFixture())
  listRunItemsMock.mockResolvedValue([itemFixture()])
  requireAiProposalByIdMock.mockResolvedValue({ proposalId: 'aiprop-1', inputDigest: 'resp-digest-1' })
  computeResponseScoreInputDigestMock.mockReturnValue('resp-digest-1')
  extractResponseAnswerTextMock.mockReturnValue('respuesta')
  computeCurrentScoringRunDigestMock.mockResolvedValue('run-digest-1')
  isRunConfirmEnabledMock.mockReturnValue(true)
  confirmAiProposalMock.mockResolvedValue({ proposalId: 'aiprop-1', status: 'confirmed' })

  transitionRunItemMock.mockImplementation(
    async (_client: unknown, item: Record<string, unknown>, target: string, opts: Record<string, unknown> = {}) => ({
      ...item,
      status: target,
      resolution: opts.resolution ?? item.resolution,
      sawProposalBeforeScoring: opts.sawProposalBeforeScoring ?? item.sawProposalBeforeScoring,
      reasonCode: opts.reasonCode ?? item.reasonCode,
    }),
  )

  transitionScoringRunMock.mockImplementation(
    async (_client: unknown, run: Record<string, unknown>, target: string) => ({ ...run, status: target }),
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

const baseResolveInput = {
  runId: 'asrun-1',
  runItemId: 'asri-1',
  resolution: 'confirmed' as const,
  sawProposalBeforeScoring: true,
  actorUserId: 'user-9',
}

// ── resolveScoringRunItem ──

describe('resolveScoringRunItem', () => {
  it('resuelve una excepción mandatory_review VÍA confirmAiProposal + registra la evidencia anti-anclaje', async () => {
    const result = await resolveScoringRunItem(baseResolveInput)

    expect(result.applied).toBe(true)
    expect(result.item.status).toBe('confirmed')
    expect(result.item.resolution).toBe('confirmed')
    expect(result.item.sawProposalBeforeScoring).toBe(true)

    // El efecto downstream va por el command canónico de TASK-1361, en la MISMA tx (client).
    expect(confirmAiProposalMock).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'aiprop-1', decision: 'confirm' }),
      'user-9',
      fakeClient,
    )
    expect(confirmAiProposalMock.mock.calls[0][0]).not.toHaveProperty('finalScore')

    expect(transitionRunItemMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({ runItemId: 'asri-1' }),
      'confirmed',
      expect.objectContaining({ resolution: 'confirmed', sawProposalBeforeScoring: true }),
    )

    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'hiring.assessment.ai_run_item_resolved',
        payload: expect.objectContaining({ resolution: 'confirmed', sawProposalBeforeScoring: true }),
      }),
      fakeClient,
    )
  })

  it('overridden aplica el finalScore humano vía el confirm canónico', async () => {
    const result = await resolveScoringRunItem({ ...baseResolveInput, resolution: 'overridden', finalScore: 42 })

    expect(result.applied).toBe(true)
    expect(confirmAiProposalMock).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'confirm', finalScore: 42 }),
      'user-9',
      fakeClient,
    )
  })

  it('rejected_to_manual rechaza la proposal y deja el item rejected_to_manual (cola manual)', async () => {
    const result = await resolveScoringRunItem({ ...baseResolveInput, resolution: 'rejected_to_manual' })

    expect(result.item.status).toBe('rejected_to_manual')
    expect(confirmAiProposalMock).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'reject' }),
      'user-9',
      fakeClient,
    )
  })

  it('overridden sin finalScore válido → 400 sin abrir tx', async () => {
    await expect(resolveScoringRunItem({ ...baseResolveInput, resolution: 'overridden' })).rejects.toMatchObject({
      code: 'assessment_ai_run_invalid_final_score',
      statusCode: 400,
    })
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('sin evidencia anti-anclaje (sawProposalBeforeScoring) → 400', async () => {
    await expect(
      resolveScoringRunItem({ ...baseResolveInput, sawProposalBeforeScoring: undefined as unknown as boolean }),
    ).rejects.toMatchObject({ code: 'assessment_ai_run_missing_anchoring_evidence', statusCode: 400 })
  })

  it('un item batch_eligible NO se resuelve uno a uno → 409 (lo cubre el confirm del run)', async () => {
    getRunItemInRunMock.mockResolvedValue(itemFixture({ riskClass: 'batch_eligible' }))

    await expect(resolveScoringRunItem(baseResolveInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_item_not_exception',
      statusCode: 409,
    })
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
  })

  it('terminal-once: la MISMA resolución repetida es no-op idempotente sin re-ejecutar efectos', async () => {
    getRunItemInRunMock.mockResolvedValue(
      itemFixture({ status: 'confirmed', resolution: 'confirmed', sawProposalBeforeScoring: true }),
    )

    const result = await resolveScoringRunItem(baseResolveInput)

    expect(result.applied).toBe(false)
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
    expect(transitionRunItemMock).not.toHaveBeenCalled()
  })

  it('terminal-once: una resolución DISTINTA sobre un item resuelto → 409', async () => {
    getRunItemInRunMock.mockResolvedValue(
      itemFixture({ status: 'confirmed', resolution: 'confirmed', sawProposalBeforeScoring: true }),
    )

    await expect(
      resolveScoringRunItem({ ...baseResolveInput, resolution: 'overridden', finalScore: 10 }),
    ).rejects.toMatchObject({ code: 'assessment_ai_run_item_already_resolved', statusCode: 409 })
  })

  it('digest stale (la respuesta cambió post-proposal) → item queda stale + 409, NUNCA aplica', async () => {
    computeResponseScoreInputDigestMock.mockReturnValue('resp-digest-CHANGED')

    await expect(resolveScoringRunItem(baseResolveInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_item_stale',
      statusCode: 409,
    })

    expect(transitionRunItemMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({ runItemId: 'asri-1' }),
      'stale',
      expect.objectContaining({ reasonCode: 'input_digest_stale' }),
    )
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
  })

  it('run fuera de revisión (scoring) → 409 assessment_ai_run_not_reviewable', async () => {
    lockScoringRunForUpdateMock.mockResolvedValue(runFixture({ status: 'scoring' }))

    await expect(resolveScoringRunItem(baseResolveInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_not_reviewable',
      statusCode: 409,
    })
  })
})

// ── confirmAssessmentAiScoringRun ──

const confirmInput = { runId: 'asrun-1', actorUserId: 'user-9', decisionNote: 'lote revisado' }

describe('confirmAssessmentAiScoringRun', () => {
  it('flag OFF → 409 estable sin abrir tx', async () => {
    isRunConfirmEnabledMock.mockReturnValue(false)

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_confirm_disabled',
      statusCode: 409,
    })
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('mandatory_review pendiente bloquea el confirm → 409', async () => {
    listRunItemsMock.mockResolvedValue([
      itemFixture({ runItemId: 'asri-1', riskClass: 'mandatory_review', status: 'proposed' }),
      itemFixture({ runItemId: 'asri-2', responseId: 'resp-2', riskClass: 'batch_eligible', status: 'proposed' }),
    ])

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_mandatory_pending',
      statusCode: 409,
    })
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
    expect(insertRunEventMock).not.toHaveBeenCalled()
  })

  it('un item proposed SIN risk class cuenta como mandatory pendiente (fail-closed)', async () => {
    listRunItemsMock.mockResolvedValue([itemFixture({ riskClass: null, status: 'proposed' })])

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_mandatory_pending',
    })
  })

  it('muestra ciega incompleta bloquea el confirm → 409', async () => {
    listRunItemsMock.mockResolvedValue([
      itemFixture({ runItemId: 'asri-1', riskClass: 'quality_sample', status: 'proposed' }),
      itemFixture({ runItemId: 'asri-2', responseId: 'resp-2', riskClass: 'batch_eligible', status: 'proposed' }),
    ])

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_sample_incomplete',
      statusCode: 409,
    })
  })

  it('digest stale (answers/rubric/modelo/policy cambiaron) → 409 run_stale sin aplicar nada', async () => {
    listRunItemsMock.mockResolvedValue([itemFixture({ riskClass: 'batch_eligible', status: 'proposed' })])
    computeCurrentScoringRunDigestMock.mockResolvedValue('run-digest-CHANGED')

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_stale',
      statusCode: 409,
    })
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
  })

  it('assessment ya scored → 409, el run jamás lo reescribe', async () => {
    fakeClient.query.mockImplementation(async (text: string) => {
      if (text.includes('FROM greenhouse_hiring.hiring_assessment WHERE assessment_id')) {
        return { rows: [{ status: 'scored' }] }
      }

      return { rows: [] }
    })

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_assessment_not_writable',
      statusCode: 409,
    })
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
  })

  it('items todavía en scoring → 409 assessment_ai_run_scoring_incomplete', async () => {
    listRunItemsMock.mockResolvedValue([itemFixture({ status: 'pending', riskClass: null, proposalId: null })])

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_scoring_incomplete',
    })
  })

  it('camino feliz: aplica el lote VÍA confirmAiProposal, escribe el manifest y confirma el run', async () => {
    const resolvedException = itemFixture({
      runItemId: 'asri-1',
      riskClass: 'mandatory_review',
      status: 'confirmed',
      resolution: 'overridden',
      sawProposalBeforeScoring: true,
      resolvedBy: 'user-9',
      resolvedAt: '2026-08-16T13:00:00.000Z',
    })

    const sampleReviewed = itemFixture({
      runItemId: 'asri-2',
      responseId: 'resp-2',
      proposalId: 'aiprop-2',
      riskClass: 'quality_sample',
      status: 'confirmed',
      resolution: 'confirmed',
      sawProposalBeforeScoring: false,
      resolvedBy: 'user-9',
      resolvedAt: '2026-08-16T13:05:00.000Z',
    })

    const batchItem = itemFixture({
      runItemId: 'asri-3',
      responseId: 'resp-3',
      proposalId: 'aiprop-3',
      riskClass: 'batch_eligible',
      status: 'proposed',
    })

    const failedItem = itemFixture({
      runItemId: 'asri-4',
      responseId: 'resp-4',
      proposalId: null,
      riskClass: 'mandatory_review',
      status: 'failed',
      reasonCode: 'provider_error',
    })

    listRunItemsMock.mockResolvedValue([resolvedException, sampleReviewed, batchItem, failedItem])

    const result = await confirmAssessmentAiScoringRun(confirmInput)

    expect(result.alreadyConfirmed).toBe(false)
    expect(result.appliedProposals).toBe(1)
    expect(result.run.status).toBe('confirmed')

    // El lote se aplica por el command canónico, dentro de la MISMA tx.
    expect(confirmAiProposalMock).toHaveBeenCalledTimes(1)
    expect(confirmAiProposalMock).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'aiprop-3', decision: 'confirm' }),
      'user-9',
      fakeClient,
    )

    // Manifest append-only con cobertura completa + evidencia anti-anclaje por item humano.
    expect(insertRunEventMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({
        eventType: 'run_confirm_manifest',
        detail: expect.objectContaining({
          batchConfirmed: [expect.objectContaining({ runItemId: 'asri-3', proposalId: 'aiprop-3' })],
          exceptionsResolved: [
            expect.objectContaining({ runItemId: 'asri-1', resolution: 'overridden', sawProposalBeforeScoring: true }),
          ],
          sampleReviewed: [
            expect.objectContaining({ runItemId: 'asri-2', resolution: 'confirmed', sawProposalBeforeScoring: false }),
          ],
          returnedToManual: [expect.objectContaining({ runItemId: 'asri-4', status: 'failed' })],
          inputDigest: 'run-digest-1',
          policyVersion: 'hiring_assessment_ai_risk_policy.v1',
          actorUserId: 'user-9',
        }),
      }),
    )

    // awaiting_review → confirmable → confirmed (ambas transiciones auditadas).
    expect(transitionScoringRunMock).toHaveBeenNthCalledWith(
      1,
      fakeClient,
      expect.objectContaining({ status: 'awaiting_review' }),
      'confirmable',
      expect.anything(),
    )
    expect(transitionScoringRunMock).toHaveBeenNthCalledWith(
      2,
      fakeClient,
      expect.objectContaining({ status: 'confirmable' }),
      'confirmed',
      expect.anything(),
    )

    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'hiring.assessment.ai_run_confirmed',
        payload: expect.objectContaining({ appliedProposals: 1 }),
      }),
      fakeClient,
    )

    // NO auto-finaliza: finalizeAssessment es una decisión humana aparte (ningún query
    // del command toca finalize/competency_result).
    const touchedFinalize = fakeClient.query.mock.calls.some(([text]) =>
      String(text).includes('hiring_competency_result'),
    )

    expect(touchedFinalize).toBe(false)
  })

  it('run ya confirmado → no-op idempotente: sin re-aplicar proposals ni manifest nuevo', async () => {
    lockScoringRunForUpdateMock.mockResolvedValue(runFixture({ status: 'confirmed' }))

    const result = await confirmAssessmentAiScoringRun(confirmInput)

    expect(result.alreadyConfirmed).toBe(true)
    expect(result.appliedProposals).toBe(0)
    expect(confirmAiProposalMock).not.toHaveBeenCalled()
    expect(insertRunEventMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('run cancelled → 409 vía la state machine (nunca se confirma un run cancelado)', async () => {
    lockScoringRunForUpdateMock.mockResolvedValue(runFixture({ status: 'cancelled' }))

    await expect(confirmAssessmentAiScoringRun(confirmInput)).rejects.toMatchObject({
      code: 'assessment_ai_run_invalid_transition',
      statusCode: 409,
    })
  })
})
