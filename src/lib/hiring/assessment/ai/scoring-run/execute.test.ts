import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// TASK-1734 Slice 2 — Fan-out del drain: concurrencia acotada, retry, fail-closed,
// cost cap y claim atómico multi-drain. El provider es SIEMPRE un mock (jamás gasto real).

const runQueryMock = vi.fn()
const withTransactionMock = vi.fn()
const proposeScoreMock = vi.fn()
const listEligibleResponsesMock = vi.fn()
const captureWithDomainMock = vi.fn()

const claimScoringRunLeaseMock = vi.fn()
const countAssessmentAiProviderAttemptsSinceMock = vi.fn()
const insertRunItemsMock = vi.fn()
const listClaimableScoringRunIdsMock = vi.fn()
const listRunItemsMock = vi.fn()
const lockScoringRunForUpdateMock = vi.fn()
const releaseScoringRunLeaseMock = vi.fn()
const transitionRunItemMock = vi.fn()
const transitionScoringRunMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomainMock(...args),
}))

vi.mock('../score-response', () => ({
  proposeScoreForResponse: (...args: unknown[]) => proposeScoreMock(...args),
}))

vi.mock('./commands', () => ({
  listEligibleResponses: (...args: unknown[]) => listEligibleResponsesMock(...args),
}))

vi.mock('./store', () => ({
  claimScoringRunLease: (...args: unknown[]) => claimScoringRunLeaseMock(...args),
  countAssessmentAiProviderAttemptsSince: (...args: unknown[]) => countAssessmentAiProviderAttemptsSinceMock(...args),
  insertRunItems: (...args: unknown[]) => insertRunItemsMock(...args),
  listClaimableScoringRunIds: (...args: unknown[]) => listClaimableScoringRunIdsMock(...args),
  listRunItems: (...args: unknown[]) => listRunItemsMock(...args),
  lockScoringRunForUpdate: (...args: unknown[]) => lockScoringRunForUpdateMock(...args),
  releaseScoringRunLease: (...args: unknown[]) => releaseScoringRunLeaseMock(...args),
  transitionRunItem: (...args: unknown[]) => transitionRunItemMock(...args),
  transitionScoringRun: (...args: unknown[]) => transitionScoringRunMock(...args),
}))

const { drainAssessmentAiScoringRuns, executeClaimedScoringRun } = await import('./execute')

// ── Fixtures ──

const LONG_ANSWER =
  'Una respuesta suficientemente larga y desarrollada para superar el mínimo de caracteres de la policy v1.'

const runFixture = {
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  inputDigest: 'digest-1',
  model: 'claude-sonnet-5',
  promptVersion: 'hiring_assessment_ai_scoring.v1',
  policyVersion: 'hiring_assessment_ai_risk_policy.v1',
  status: 'scoring' as const,
  statusReason: null,
  leaseOwner: 'system:assessment-ai-scoring-drain:test',
  leaseExpiresAt: '2026-08-16T13:00:00.000Z',
  createdBy: null,
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
}

const makeItem = (n: number, status = 'pending') => ({
  runItemId: `asri-${n}`,
  runId: 'asrun-1',
  assessmentId: 'asmt-1',
  applicationId: 'happ-1',
  responseId: `arsp-${n}`,
  proposalId: null,
  inputDigest: null,
  status,
  riskClass: null,
  reasonCode: null,
  routingReasons: [] as string[],
  attemptCount: 0,
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z',
})

const makeContextRow = (n: number, answer: unknown = { text: LONG_ANSWER }) => ({
  response_id: `arsp-${n}`,
  answer_json: answer,
  rubric_json: { criteria: ['claridad'] },
  human_score: null,
  competency_weight: '20',
})

const okProposal = (n: number) => ({
  status: 'ok',
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  proposal: { proposalId: `aip-${n}` },
  suggested: {
    score: 85,
    rationale: 'Sólida.',
    // Escala declarada del contrato: aportes ponderados que suman el score global (43+42=85).
    perCriterion: [
      { criterion: 'claridad', weight: 50, score: 43 },
      { criterion: 'profundidad', weight: 50, score: 42 },
    ],
  },
})

const txClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'
  process.env.HIRING_ASSESSMENT_AI_ENABLED = 'true'
  delete process.env.HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED
  delete process.env.HIRING_ASSESSMENT_AI_RUN_CONCURRENCY
  delete process.env.HIRING_ASSESSMENT_AI_RUN_MAX_PROVIDER_ATTEMPTS
  delete process.env.HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP

  withTransactionMock.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) => fn(txClient))
  countAssessmentAiProviderAttemptsSinceMock.mockResolvedValue(0)
  lockScoringRunForUpdateMock.mockResolvedValue({ ...runFixture })
  transitionScoringRunMock.mockImplementation(async (_c, run, target, opts) => ({
    ...run,
    status: target,
    statusReason: opts?.reasonCode ?? null,
  }))
  transitionRunItemMock.mockImplementation(async (_c, item, target, opts) => ({
    ...item,
    status: target,
    reasonCode: opts?.reasonCode ?? null,
    riskClass: opts?.riskClass ?? item.riskClass,
    routingReasons: opts?.routingReasons ?? item.routingReasons,
  }))
  releaseScoringRunLeaseMock.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED
  delete process.env.HIRING_ASSESSMENT_AI_ENABLED
})

/** items para prep (fase 1) y para settle (fase 3): listRunItems se llama dos veces. */
const primeItems = (pending: ReturnType<typeof makeItem>[], settled: ReturnType<typeof makeItem>[]) => {
  listRunItemsMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(settled)
}

describe('executeClaimedScoringRun — fan-out', () => {
  it('concurrencia acotada (config, default 3): nunca más de N llamadas en vuelo', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_CONCURRENCY = '2'
    const items = [1, 2, 3, 4, 5].map(n => makeItem(n))

    primeItems(items, items.map(n => ({ ...n, status: 'proposed' })))
    runQueryMock.mockResolvedValue([1, 2, 3, 4, 5].map(n => makeContextRow(n)))

    let inFlight = 0
    let maxInFlight = 0

    proposeScoreMock.mockImplementation(async (responseId: string) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(resolve => setTimeout(resolve, 10))
      inFlight -= 1

      return okProposal(Number(responseId.split('-')[1]))
    })

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.proposed).toBe(5)
    expect(summary.failed).toBe(0)
    expect(maxInFlight).toBeLessThanOrEqual(2)
    expect(proposeScoreMock).toHaveBeenCalledTimes(5)

    // Con la policy de excepción OFF (default) todo item propuesto es mandatory_review.
    const proposedCalls = transitionRunItemMock.mock.calls.filter(c => c[2] === 'proposed')

    expect(proposedCalls).toHaveLength(5)

    for (const call of proposedCalls) {
      expect(call[3]).toMatchObject({
        riskClass: 'mandatory_review',
        routingReasons: ['exception_policy_disabled'],
      })
      expect(call[3].proposalId).toMatch(/^aip-/)
      expect(call[3].attemptDelta).toBe(1)
    }

    expect(releaseScoringRunLeaseMock).toHaveBeenCalled()
  })

  it('registra el proposal_id creado en cada item y cierra el run en awaiting_review', async () => {
    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'proposed' }])
    runQueryMock.mockResolvedValue([makeContextRow(1)])
    proposeScoreMock.mockResolvedValue(okProposal(1))

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.status).toBe('awaiting_review')
    expect(summary.remainingPending).toBe(0)

    const proposedCall = transitionRunItemMock.mock.calls.find(c => c[2] === 'proposed')

    expect(proposedCall?.[3].proposalId).toBe('aip-1')
    expect(transitionScoringRunMock).toHaveBeenCalledWith(
      txClient,
      expect.objectContaining({ runId: 'asrun-1' }),
      'awaiting_review',
      expect.objectContaining({ reasonCode: 'scoring_complete' }),
    )
  })

  it('retry acotado: primer intento falla, el segundo propone (attemptDelta=2)', async () => {
    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'proposed' }])
    runQueryMock.mockResolvedValue([makeContextRow(1)])
    proposeScoreMock
      .mockRejectedValueOnce(new Error('blip transitorio del provider'))
      .mockResolvedValueOnce(okProposal(1))

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.proposed).toBe(1)
    expect(proposeScoreMock).toHaveBeenCalledTimes(2)

    const proposedCall = transitionRunItemMock.mock.calls.find(c => c[2] === 'proposed')

    expect(proposedCall?.[3].attemptDelta).toBe(2)
  })

  it('fail-closed: provider agota retries → item failed con reason code, NUNCA se pierde de la cola', async () => {
    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'failed' }])
    runQueryMock.mockResolvedValue([makeContextRow(1)])
    proposeScoreMock.mockResolvedValue({ status: 'provider_error', provider: 'anthropic', model: 'x', proposal: null, suggested: null })

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.failed).toBe(1)
    expect(summary.proposed).toBe(0)

    // 1 intento inicial + 2 retries (config default).
    expect(proposeScoreMock).toHaveBeenCalledTimes(3)

    const failedCall = transitionRunItemMock.mock.calls.find(c => c[2] === 'failed')

    expect(failedCall?.[3]).toMatchObject({ reasonCode: 'provider_error', riskClass: 'mandatory_review', attemptDelta: 3 })
  })

  it('salida malformada del LLM (schema_invalid) agotada → abstained, no failed', async () => {
    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'abstained' }])
    runQueryMock.mockResolvedValue([makeContextRow(1)])
    proposeScoreMock.mockResolvedValue({ status: 'schema_invalid', provider: 'anthropic', model: 'x', proposal: null, suggested: null })

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.abstained).toBe(1)

    const abstainedCall = transitionRunItemMock.mock.calls.find(c => c[2] === 'abstained')

    expect(abstainedCall?.[3]).toMatchObject({ reasonCode: 'schema_invalid', riskClass: 'mandatory_review' })
  })

  it('respuesta vacía → abstained answer_empty SIN llamar al provider (cero gasto)', async () => {
    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'abstained' }])
    runQueryMock.mockResolvedValue([makeContextRow(1, { text: '   ' })])

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.abstained).toBe(1)
    expect(proposeScoreMock).not.toHaveBeenCalled()

    const abstainedCall = transitionRunItemMock.mock.calls.find(c => c[2] === 'abstained')

    expect(abstainedCall?.[3]).toMatchObject({ reasonCode: 'answer_empty', routingReasons: ['answer_empty'] })
  })

  it('score humano ya aplicado (carril manual ganó) → superseded_by_manual sin gasto', async () => {
    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'superseded_by_manual' }])
    runQueryMock.mockResolvedValue([{ ...makeContextRow(1), human_score: 80 }])

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.supersededByManual).toBe(1)
    expect(proposeScoreMock).not.toHaveBeenCalled()
  })

  it('cost cap por run: presupuesto agotado a mitad del batch → resto failed run_cost_cap_exceeded', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_CONCURRENCY = '1'
    process.env.HIRING_ASSESSMENT_AI_RUN_MAX_PROVIDER_ATTEMPTS = '1'
    const items = [makeItem(1), makeItem(2)]

    primeItems(items, [
      { ...items[0], status: 'proposed' },
      { ...items[1], status: 'failed' },
    ])
    runQueryMock.mockResolvedValue([makeContextRow(1), makeContextRow(2)])
    proposeScoreMock.mockResolvedValue(okProposal(1))

    const summary = await executeClaimedScoringRun({ ...runFixture })

    expect(summary.proposed).toBe(1)
    expect(summary.failed).toBe(1)
    expect(proposeScoreMock).toHaveBeenCalledTimes(1)

    const failedCall = transitionRunItemMock.mock.calls.find(c => c[2] === 'failed')

    expect(failedCall?.[3]).toMatchObject({ reasonCode: 'run_cost_cap_exceeded' })
  })

  it('run enumerating (self-heal): re-enumera SOLO el assessment exacto y sigue el fan-out', async () => {
    const enumeratingRun = { ...runFixture, status: 'enumerating' as const }
    const items = [makeItem(1)]

    lockScoringRunForUpdateMock.mockResolvedValue(enumeratingRun)
    listEligibleResponsesMock.mockResolvedValue([{ response_id: 'arsp-1' }])
    insertRunItemsMock.mockResolvedValue(items)

    // listRunItems: hasItems check + prep + settle.
    listRunItemsMock
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ ...items[0], status: 'proposed' }])
    runQueryMock.mockResolvedValue([makeContextRow(1)])
    proposeScoreMock.mockResolvedValue(okProposal(1))

    const summary = await executeClaimedScoringRun(enumeratingRun)

    expect(listEligibleResponsesMock).toHaveBeenCalledWith('asmt-1', txClient)
    expect(insertRunItemsMock.mock.calls[0][2]).toEqual(['arsp-1'])
    expect(summary.proposed).toBe(1)
  })
})

describe('drainAssessmentAiScoringRuns — gates + claim atómico', () => {
  it('daily cost cap agotado → skip sin claims ni provider', async () => {
    process.env.HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP = '10'
    countAssessmentAiProviderAttemptsSinceMock.mockResolvedValue(10)

    const summary = await drainAssessmentAiScoringRuns()

    expect(summary).toMatchObject({ skipped: 'daily_cost_cap_exceeded', claimed: 0, dailyAttemptCap: 10 })
    expect(listClaimableScoringRunIdsMock).not.toHaveBeenCalled()
    expect(proposeScoreMock).not.toHaveBeenCalled()
  })

  it('flag de enqueue OFF → 409 estable sin claims ni gasto', async () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'false'

    await expect(drainAssessmentAiScoringRuns()).rejects.toMatchObject({
      code: 'assessment_ai_run_enqueue_disabled',
      statusCode: 409,
    })
    expect(listClaimableScoringRunIdsMock).not.toHaveBeenCalled()
    expect(proposeScoreMock).not.toHaveBeenCalled()
  })

  it('master de TASK-1361 OFF en este runtime → 409 estable sin claims', async () => {
    process.env.HIRING_ASSESSMENT_AI_ENABLED = 'false'

    await expect(drainAssessmentAiScoringRuns()).rejects.toMatchObject({
      code: 'assessment_ai_disabled',
      statusCode: 409,
    })
    expect(listClaimableScoringRunIdsMock).not.toHaveBeenCalled()
  })

  it('dos drains concurrentes sobre los mismos runs NO duplican: el claim atómico deja uno busy', async () => {
    listClaimableScoringRunIdsMock.mockResolvedValue(['asrun-1'])

    // Simula el conditional UPDATE del lease: SOLO el primer claim del run gana.
    const claimedOnce = new Set<string>()

    claimScoringRunLeaseMock.mockImplementation(async (runId: string) => {
      if (claimedOnce.has(runId)) return null
      claimedOnce.add(runId)

      // cede el event loop para que el segundo drain intente el claim en paralelo
      await new Promise(resolve => setTimeout(resolve, 5))

      return { ...runFixture, runId }
    })

    // El run reclamado no tiene items pendientes: el execute termina como no-op.
    lockScoringRunForUpdateMock.mockResolvedValue({ ...runFixture })
    listRunItemsMock.mockResolvedValue([])

    const [a, b] = await Promise.all([
      drainAssessmentAiScoringRuns({ drainOwner: 'drain-a' }),
      drainAssessmentAiScoringRuns({ drainOwner: 'drain-b' }),
    ])

    expect(a.claimed + b.claimed).toBe(1)
    expect(a.busy + b.busy).toBe(1)
    expect(claimScoringRunLeaseMock).toHaveBeenCalledTimes(2)
  })

  it('un run que explota libera la lease, se observa y NO aborta el tick', async () => {
    listClaimableScoringRunIdsMock.mockResolvedValue(['asrun-1'])
    claimScoringRunLeaseMock.mockResolvedValue({ ...runFixture })
    lockScoringRunForUpdateMock.mockRejectedValue(new Error('conexión perdida'))

    const summary = await drainAssessmentAiScoringRuns({ drainOwner: 'drain-a' })

    expect(summary.failedRuns).toEqual(['asrun-1'])
    expect(summary.runs).toHaveLength(0)
    expect(releaseScoringRunLeaseMock).toHaveBeenCalledWith('asrun-1', 'drain-a')
    expect(captureWithDomainMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'conexión perdida' }),
      'hiring',
      expect.objectContaining({ tags: expect.objectContaining({ source: 'assessment_ai_scoring_drain', run_id: 'asrun-1' }) }),
    )
  })

  it('anti head-of-line: el primer run venenoso NO bloquea al segundo — el drain lo procesa igual', async () => {
    // Auditoría 2026-08-16: antes el catch hacía `throw` y el run venenoso (primero por
    // created_at ASC) mataba TODOS los ticks (starvation determinista del resto de la cola).
    listClaimableScoringRunIdsMock.mockResolvedValue(['asrun-veneno', 'asrun-2'])
    claimScoringRunLeaseMock.mockImplementation(async (runId: string) => ({ ...runFixture, runId }))

    // El run venenoso explota en el lock; el segundo ejecuta normal con 1 item propuesto.
    lockScoringRunForUpdateMock.mockImplementation(async (_c: unknown, runId: string) => {
      if (runId === 'asrun-veneno') throw new Error('payload venenoso')

      return { ...runFixture, runId }
    })

    const items = [makeItem(1)]

    primeItems(items, [{ ...items[0], status: 'proposed' }])
    runQueryMock.mockResolvedValue([makeContextRow(1)])
    proposeScoreMock.mockResolvedValue(okProposal(1))

    const summary = await drainAssessmentAiScoringRuns({ drainOwner: 'drain-a' })

    expect(summary.claimed).toBe(2)
    expect(summary.failedRuns).toEqual(['asrun-veneno'])
    expect(summary.runs).toHaveLength(1)
    expect(summary.runs[0]).toMatchObject({ runId: 'asrun-2', proposed: 1 })

    // La lease del venenoso se liberó para que el próximo tick lo retome.
    expect(releaseScoringRunLeaseMock).toHaveBeenCalledWith('asrun-veneno', 'drain-a')
    expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
  })
})
