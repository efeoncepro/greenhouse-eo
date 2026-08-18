import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// TASK-1734 Slice 4 — reader operator-only de revisión: exact-scope + lineage validado,
// DTO SIN campos de identidad del candidato, cobertura de gates y digest staleness.

const runQueryMock = vi.fn()
const getScoringRunByIdMock = vi.fn()
const computeCurrentScoringRunDigestMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
}))

vi.mock('./store', () => ({
  getScoringRunById: (...args: unknown[]) => getScoringRunByIdMock(...args),
}))

vi.mock('./commands', () => ({
  computeCurrentScoringRunDigest: (...args: unknown[]) => computeCurrentScoringRunDigestMock(...args),
}))

const { buildAssessmentAiRunReviewCoverage, listAssessmentAiReviewItems } = await import('./review-reader')

const runFixture = {
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  inputDigest: 'run-digest-1',
  model: 'claude-sonnet-5',
  promptVersion: 'hiring_assessment_ai_scoring.v1',
  policyVersion: 'hiring_assessment_ai_risk_policy.v1',
  status: 'awaiting_review',
  statusReason: null,
  leaseOwner: null,
  leaseExpiresAt: null,
  createdBy: 'user-1',
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
}

const itemRow = (over: Record<string, unknown> = {}) => ({
  run_item_id: 'asri-1',
  response_id: 'resp-1',
  status: 'proposed',
  risk_class: 'mandatory_review',
  reason_code: null,
  routing_reasons: ['score_decision_near_band'],
  attempt_count: 1,
  resolution: null,
  saw_proposal_before_scoring: null,
  resolved_by: null,
  resolved_at: null,
  question_prompt: '¿Cómo priorizas un backlog?',
  question_type: 'open_text',
  answer_json: { text: 'Primero ordeno por impacto…' },
  proposal_id: 'aiprop-1',
  proposal_status: 'proposed',
  proposed_json: {
    score: 62,
    rationale: 'Cubre priorización pero no menciona stakeholders.',
    perCriterion: [{ criterion: 'estructura', score: 60 }, { criterion: 'nope' }],
  },
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  prompt_version: 'hiring_assessment_ai_scoring.v1',
  proposal_input_digest: 'resp-digest-1',
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  getScoringRunByIdMock.mockResolvedValue(runFixture)
  computeCurrentScoringRunDigestMock.mockResolvedValue('run-digest-1')

  runQueryMock.mockImplementation(async (text: string) => {
    if (text.includes('FROM greenhouse_hiring.hiring_assessment ')) {
      return [{ application_id: 'happ-1' }]
    }

    return [itemRow()]
  })
})

describe('listAssessmentAiReviewItems', () => {
  it('retorna items con evidencia + provenance del proposal y cobertura; digest vigente', async () => {
    const review = await listAssessmentAiReviewItems('asrun-1')

    expect(review.run.runId).toBe('asrun-1')
    expect(review.items).toHaveLength(1)

    const item = review.items[0]

    expect(item).toMatchObject({
      runItemId: 'asri-1',
      responseId: 'resp-1',
      riskClass: 'mandatory_review',
      routingReasons: ['score_decision_near_band'],
      questionPrompt: '¿Cómo priorizas un backlog?',
      answerText: 'Primero ordeno por impacto…',
    })

    expect(item.proposal).toMatchObject({
      proposalId: 'aiprop-1',
      score: 62,
      rationale: 'Cubre priorización pero no menciona stakeholders.',
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      promptVersion: 'hiring_assessment_ai_scoring.v1',
      inputDigest: 'resp-digest-1',
    })

    // perCriterion malformado se filtra (solo entradas {criterion, score} válidas).
    expect(item.proposal?.perCriterion).toEqual([{ criterion: 'estructura', score: 60 }])

    expect(review.coverage).toMatchObject({ mandatoryPending: 1, batchEligible: 0, digestStale: false })
  })

  it('NUNCA expone campos de identidad del candidato en el DTO', async () => {
    const review = await listAssessmentAiReviewItems('asrun-1')
    const keys = Object.keys(review.items[0])

    for (const forbidden of ['candidateName', 'name', 'email', 'phone', 'contact', 'cv', 'candidate']) {
      expect(keys).not.toContain(forbidden)
    }

    // El SQL del reader tampoco selecciona columnas de identidad.
    const itemQuery = runQueryMock.mock.calls.map(([text]) => String(text)).find(t => t.includes('run_item'))

    expect(itemQuery).toBeDefined()

    for (const forbidden of ['full_name', 'email', 'phone', 'candidate_name']) {
      expect(itemQuery).not.toContain(forbidden)
    }
  })

  it('answerText usa la allowlist text|value: una respuesta malformada rinde cadena vacía', async () => {
    runQueryMock.mockImplementation(async (text: string) => {
      if (text.includes('FROM greenhouse_hiring.hiring_assessment ')) return [{ application_id: 'happ-1' }]

      return [itemRow({ answer_json: { attachment: 'gs://algo', email: 'x@y.z' } })]
    })

    const review = await listAssessmentAiReviewItems('asrun-1')

    expect(review.items[0].answerText).toBe('')
  })

  it('muestra ciega ESTRUCTURAL: un quality_sample sin resolver llega SIN bloque proposal', async () => {
    // Auditoría 2026-08-16: la ceguera no puede depender de que una UI futura oculte el
    // proposal (procedural) — el reader lo OMITE del DTO hasta que exista resolución humana.
    runQueryMock.mockImplementation(async (text: string) => {
      if (text.includes('FROM greenhouse_hiring.hiring_assessment ')) return [{ application_id: 'happ-1' }]

      return [itemRow({ risk_class: 'quality_sample', resolution: null })]
    })

    const review = await listAssessmentAiReviewItems('asrun-1')
    const item = review.items[0]

    expect(item.riskClass).toBe('quality_sample')
    expect(item.proposal).toBeNull()

    // Ni el score ni el rationale de la propuesta se filtran por ningún otro campo del DTO.
    expect(JSON.stringify(item)).not.toContain('62')
    expect(JSON.stringify(item)).not.toContain('Cubre priorización')

    // La cobertura del gate sigue contando la muestra pendiente (el confirm sigue bloqueado).
    expect(review.coverage).toMatchObject({ samplePending: 1, mandatoryPending: 0 })
  })

  it('muestra ciega: DESPUÉS de resolver, el proposal del quality_sample sí aparece (contraste/auditoría)', async () => {
    runQueryMock.mockImplementation(async (text: string) => {
      if (text.includes('FROM greenhouse_hiring.hiring_assessment ')) return [{ application_id: 'happ-1' }]

      return [
        itemRow({
          risk_class: 'quality_sample',
          status: 'confirmed',
          resolution: 'overridden',
          saw_proposal_before_scoring: false,
          resolved_by: 'user-2',
          resolved_at: '2026-08-16T13:00:00.000Z',
        }),
      ]
    })

    const review = await listAssessmentAiReviewItems('asrun-1')
    const item = review.items[0]

    expect(item.resolution).toBe('overridden')
    expect(item.proposal).toMatchObject({ proposalId: 'aiprop-1', score: 62 })
  })

  it('la ceguera NO aplica a mandatory_review: la excepción se revisa CON la evidencia del proposal', async () => {
    const review = await listAssessmentAiReviewItems('asrun-1')

    expect(review.items[0].riskClass).toBe('mandatory_review')
    expect(review.items[0].proposal).not.toBeNull()
  })

  it('marca digestStale cuando el digest recomputado difiere del digest del run', async () => {
    computeCurrentScoringRunDigestMock.mockResolvedValue('run-digest-CHANGED')

    const review = await listAssessmentAiReviewItems('asrun-1')

    expect(review.coverage.digestStale).toBe(true)
  })

  it('404 si el run no existe; 409 si el lineage assessment→application no es consistente', async () => {
    getScoringRunByIdMock.mockResolvedValue(null)
    await expect(listAssessmentAiReviewItems('asrun-x')).rejects.toMatchObject({
      code: 'assessment_ai_run_not_found',
    })

    getScoringRunByIdMock.mockResolvedValue(runFixture)
    runQueryMock.mockImplementation(async (text: string) => {
      if (text.includes('FROM greenhouse_hiring.hiring_assessment ')) return [{ application_id: 'happ-OTRA' }]

      return []
    })

    await expect(listAssessmentAiReviewItems('asrun-1')).rejects.toMatchObject({
      code: 'assessment_ai_run_lineage_mismatch',
      statusCode: 409,
    })
  })
})

describe('buildAssessmentAiRunReviewCoverage', () => {
  it('computa la cobertura del gate de confirmación', () => {
    const coverage = buildAssessmentAiRunReviewCoverage(
      [
        { status: 'pending', riskClass: null, resolution: null },
        { status: 'proposed', riskClass: 'mandatory_review', resolution: null },
        { status: 'confirmed', riskClass: 'mandatory_review', resolution: 'overridden' },
        { status: 'proposed', riskClass: 'quality_sample', resolution: null },
        { status: 'rejected_to_manual', riskClass: 'quality_sample', resolution: 'rejected_to_manual' },
        { status: 'proposed', riskClass: 'batch_eligible', resolution: null },
        { status: 'failed', riskClass: 'mandatory_review', resolution: null },
        { status: 'superseded_by_manual', riskClass: null, resolution: null },
      ],
      true,
    )

    expect(coverage).toEqual({
      scoringPending: 1,
      mandatoryPending: 1,
      mandatoryResolved: 1,
      samplePending: 1,
      sampleResolved: 1,
      batchEligible: 1,
      returnedToManual: 2,
      closedWithoutProposal: 1,
      digestStale: true,
    })
  })
})
