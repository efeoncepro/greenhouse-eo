import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const assemblePacketMock = vi.fn()
const computeDigestMock = vi.fn()
const runGenerationMock = vi.fn()
const findActiveMock = vi.fn()
const createProposalMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

vi.mock('./packet', () => ({
  assembleEvaluationDossierPacket: (...args: unknown[]) => assemblePacketMock(...args),
  computeDossierInputDigest: (...args: unknown[]) => computeDigestMock(...args)
}))

vi.mock('./generate', () => ({
  runDossierGeneration: (...args: unknown[]) => runGenerationMock(...args)
}))

vi.mock('./store', () => ({
  findActiveDossierProposal: (...args: unknown[]) => findActiveMock(...args),
  createDossierProposal: (...args: unknown[]) => createProposalMock(...args)
}))

const { proposeEvaluationDossier } = await import('./propose')

const packetFixture = {
  schemaVersion: 'hiring_evaluation_dossier_packet.v1',
  applicationId: 'happ-1',
  cv: { contentHash: 'hash-cv-1', text: 'CV redactado' },
  assessment: { competencyResults: [], responses: [], overallScore: 78 },
  journey: { appliedAt: '', source: 'public_portal', currentStage: 'assessment', stages: [], decision: null }
}

const proposalFixture = {
  proposalId: 'hdsp-1',
  applicationId: 'happ-1',
  proposed: { dossier: { resumenEjecutivo: 'ok' }, sources: { cvContentHash: 'hash-cv-1' } },
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  promptVersion: 'hiring_evaluation_dossier.v1',
  inputDigest: 'digest-1',
  status: 'proposed',
  decisionNote: null,
  confirmedBy: null,
  confirmedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z'
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.HIRING_EVALUATION_DOSSIER_AI_ENABLED = 'true'
  assemblePacketMock.mockResolvedValue(packetFixture)
  computeDigestMock.mockReturnValue('digest-1')
  findActiveMock.mockResolvedValue(null)
  runGenerationMock.mockResolvedValue({
    dossier: { resumenEjecutivo: 'ok', coherencias: [], gaps: [], focosEntrevista: [], noVerificable: [] },
    provider: 'anthropic',
    model: 'claude-sonnet-5-20260101',
    usage: { inputTokens: 10, outputTokens: 20 },
    status: 'ok'
  })
  createProposalMock.mockResolvedValue({ proposal: proposalFixture, created: true })
  withTransactionMock.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: vi.fn() })
  )
})

afterEach(() => {
  delete process.env.HIRING_EVALUATION_DOSSIER_AI_ENABLED
})

describe('proposeEvaluationDossier', () => {
  it('flag OFF → 409 estable sin tocar packet ni provider', async () => {
    process.env.HIRING_EVALUATION_DOSSIER_AI_ENABLED = 'false'

    await expect(proposeEvaluationDossier('happ-1', 'user-1')).rejects.toMatchObject({
      code: 'hiring_dossier_ai_disabled',
      statusCode: 409
    })

    expect(assemblePacketMock).not.toHaveBeenCalled()
    expect(runGenerationMock).not.toHaveBeenCalled()
  })

  it('idempotente por digest: propuesta activa existente → la retorna SIN llamar al provider', async () => {
    findActiveMock.mockResolvedValue(proposalFixture)

    const proposal = await proposeEvaluationDossier('happ-1', 'user-1')

    expect(proposal.proposalId).toBe('hdsp-1')
    expect(runGenerationMock).not.toHaveBeenCalled()
    expect(createProposalMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('genera, persiste la propuesta y publica el evento IDs-only en la misma tx', async () => {
    const proposal = await proposeEvaluationDossier('happ-1', 'user-1')

    expect(proposal.proposalId).toBe('hdsp-1')
    expect(runGenerationMock).toHaveBeenCalledTimes(1)

    // TASK-1737: el digest se computa con el prompt contract vigente (v2) — las
    // propuestas v1 quedan stale por diseño al cambiar la versión.
    expect(computeDigestMock).toHaveBeenCalledWith(packetFixture, 'claude-sonnet-5', 'hiring_evaluation_dossier.v2')

    const createInput = createProposalMock.mock.calls[0][1]

    expect(createInput.promptVersion).toBe('hiring_evaluation_dossier.v2')

    expect(createInput.inputDigest).toBe('digest-1')
    expect(createInput.model).toBe('claude-sonnet-5-20260101')
    expect(createInput.proposed.sources.cvContentHash).toBe('hash-cv-1')

    expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.eventType).toBe('hiring.application.dossier_proposed')
    expect(event.payload).toEqual({
      proposalId: 'hdsp-1',
      applicationId: 'happ-1',
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      actorUserId: 'user-1'
    })

    // IDs-only: el borrador jamás viaja en el payload del outbox.
    expect(JSON.stringify(event.payload)).not.toContain('resumenEjecutivo')
  })

  it('carrera perdida del insert (created=false) → retorna la ganadora sin re-emitir evento', async () => {
    createProposalMock.mockResolvedValue({ proposal: proposalFixture, created: false })

    const proposal = await proposeEvaluationDossier('happ-1', 'user-1')

    expect(proposal.proposalId).toBe('hdsp-1')
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('fallas del provider mapean a codes estables sin persistir nada', async () => {
    runGenerationMock.mockResolvedValue({ dossier: null, provider: 'anthropic', model: 'm', usage: {}, status: 'provider_error' })
    await expect(proposeEvaluationDossier('happ-1', 'user-1')).rejects.toMatchObject({
      code: 'hiring_dossier_provider_error',
      statusCode: 502
    })

    runGenerationMock.mockResolvedValue({ dossier: null, provider: 'anthropic', model: 'm', usage: {}, status: 'not_configured' })
    await expect(proposeEvaluationDossier('happ-1', 'user-1')).rejects.toMatchObject({
      code: 'hiring_dossier_provider_not_configured',
      statusCode: 503
    })

    runGenerationMock.mockResolvedValue({ dossier: null, provider: 'anthropic', model: 'm', usage: {}, status: 'schema_invalid' })
    await expect(proposeEvaluationDossier('happ-1', 'user-1')).rejects.toMatchObject({
      code: 'hiring_dossier_output_invalid',
      statusCode: 502
    })

    expect(createProposalMock).not.toHaveBeenCalled()
  })
})
