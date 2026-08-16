import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const lockProposalMock = vi.fn()
const markDecidedMock = vi.fn()
const recordNoteMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

vi.mock('./store', () => ({
  lockDossierProposalForUpdate: (...args: unknown[]) => lockProposalMock(...args),
  markDossierProposalDecided: (...args: unknown[]) => markDecidedMock(...args)
}))

vi.mock('../application-notes', () => ({
  HIRING_APPLICATION_NOTE_BODY_MAX: 8000,
  recordHiringApplicationNote: (...args: unknown[]) => recordNoteMock(...args)
}))

const { confirmEvaluationDossier, renderEvaluationDossierMarkdown, resolveDossierProposalTransition } = await import('./confirm')

const draft = {
  resumenEjecutivo: 'Candidato con perfil coherente entre CV y assessment.',
  coherencias: [{ afirmacion: 'Domina SEO técnico', evidencia: 'CV: 5 años en SEO; score 82 en la competencia' }],
  gaps: [{ afirmacion: 'Sin evidencia de liderazgo', evidencia: 'CV no menciona equipos a cargo' }],
  focosEntrevista: ['Profundizar experiencia liderando equipos'],
  noVerificable: ['Certificación Google Analytics declarada']
}

const proposalFixture = {
  proposalId: 'hdsp-1',
  applicationId: 'happ-1',
  proposed: { dossier: draft, sources: { cvContentHash: 'hash-cv-1' } },
  provider: 'anthropic',
  model: 'claude-sonnet-5-20260101',
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

const noteFixture = {
  noteId: 'hnote-9',
  applicationId: 'happ-1',
  kind: 'cv_analysis',
  bodyMd: 'cuerpo',
  authorUserId: 'user-2',
  source: 'agent',
  contextJson: {},
  createdAt: '2026-08-16T13:00:00.000Z'
}

const txClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  withTransactionMock.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) => fn(txClient))
  lockProposalMock.mockResolvedValue(proposalFixture)
  markDecidedMock.mockImplementation(async (_client: unknown, input: { status: string }) => ({
    ...proposalFixture,
    status: input.status,
    confirmedBy: 'user-2'
  }))
  recordNoteMock.mockResolvedValue(noteFixture)
})

describe('confirmEvaluationDossier', () => {
  it('confirm materializa la nota source=agent con provenance completo en la MISMA tx', async () => {
    const result = await confirmEvaluationDossier({
      proposalId: 'hdsp-1',
      decision: 'confirm',
      actorUserId: 'user-2'
    })

    expect(result.proposal.status).toBe('confirmed')
    expect(result.note?.noteId).toBe('hnote-9')

    expect(recordNoteMock).toHaveBeenCalledTimes(1)
    const [noteInput, clientArg] = recordNoteMock.mock.calls[0]

    expect(clientArg).toBe(txClient)
    expect(noteInput.kind).toBe('cv_analysis')
    expect(noteInput.source).toBe('agent')
    expect(noteInput.authorUserId).toBe('user-2')
    expect(noteInput.contextJson).toEqual({
      dossierProposalId: 'hdsp-1',
      inputDigest: 'digest-1',
      model: 'claude-sonnet-5-20260101',
      promptVersion: 'hiring_evaluation_dossier.v1'
    })

    // Sin edición humana → render markdown del borrador original.
    expect(noteInput.bodyMd).toContain('## Resumen ejecutivo')
    expect(noteInput.bodyMd).toContain('## No verificable con las fuentes')

    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.eventType).toBe('hiring.application.dossier_confirmed')
    expect(event.payload).toEqual({
      proposalId: 'hdsp-1',
      applicationId: 'happ-1',
      decision: 'confirm',
      status: 'confirmed',
      noteId: 'hnote-9',
      actorUserId: 'user-2'
    })
  })

  it('el cuerpo editado por el humano es lo que se persiste; la propuesta original queda intacta', async () => {
    await confirmEvaluationDossier({
      proposalId: 'hdsp-1',
      decision: 'confirm',
      editedBodyMd: 'Versión editada por el operador.',
      actorUserId: 'user-2'
    })

    expect(recordNoteMock.mock.calls[0][0].bodyMd).toBe('Versión editada por el operador.')

    // markDossierProposalDecided nunca toca proposed_json (la propuesta original es inmutable).
    expect(markDecidedMock.mock.calls[0][1]).toEqual({
      proposalId: 'hdsp-1',
      status: 'confirmed',
      decisionNote: null,
      actorUserId: 'user-2'
    })
  })

  it('kind derivado: sin cvContentHash en las fuentes → assessment_review', async () => {
    lockProposalMock.mockResolvedValue({
      ...proposalFixture,
      proposed: { dossier: draft, sources: { responseCount: 3 } }
    })

    await confirmEvaluationDossier({ proposalId: 'hdsp-1', decision: 'confirm', actorUserId: 'user-2' })

    expect(recordNoteMock.mock.calls[0][0].kind).toBe('assessment_review')
  })

  it('reject solo marca: no crea nota y emite el evento con noteId null', async () => {
    const result = await confirmEvaluationDossier({
      proposalId: 'hdsp-1',
      decision: 'reject',
      decisionNote: 'Borrador con afirmaciones débiles.',
      actorUserId: 'user-2'
    })

    expect(result.proposal.status).toBe('rejected')
    expect(result.note).toBeNull()
    expect(recordNoteMock).not.toHaveBeenCalled()

    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.payload.noteId).toBeNull()
    expect(event.payload.decision).toBe('reject')
  })

  it('terminal-once: decisión distinta sobre estado terminal → 409; misma decisión → no-op idempotente', async () => {
    lockProposalMock.mockResolvedValue({ ...proposalFixture, status: 'confirmed' })

    await expect(
      confirmEvaluationDossier({ proposalId: 'hdsp-1', decision: 'reject', actorUserId: 'user-2' })
    ).rejects.toMatchObject({ code: 'hiring_dossier_invalid_transition', statusCode: 409 })

    const idempotent = await confirmEvaluationDossier({ proposalId: 'hdsp-1', decision: 'confirm', actorUserId: 'user-2' })

    expect(idempotent.proposal.status).toBe('confirmed')
    expect(idempotent.note).toBeNull()
    expect(recordNoteMock).not.toHaveBeenCalled()
    expect(markDecidedMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('valida actor y decisión antes de abrir la tx', async () => {
    await expect(
      confirmEvaluationDossier({ proposalId: 'hdsp-1', decision: 'confirm', actorUserId: '' })
    ).rejects.toMatchObject({ code: 'hiring_dossier_missing_actor' })

    await expect(
      confirmEvaluationDossier({ proposalId: 'hdsp-1', decision: 'otra' as never, actorUserId: 'user-2' })
    ).rejects.toMatchObject({ code: 'hiring_dossier_invalid_decision' })

    expect(withTransactionMock).not.toHaveBeenCalled()
  })
})

describe('resolveDossierProposalTransition', () => {
  it('proposed → confirmed|rejected con apply=true; terminal repetido → apply=false', () => {
    expect(resolveDossierProposalTransition('proposed', 'confirm')).toEqual({ next: 'confirmed', apply: true })
    expect(resolveDossierProposalTransition('proposed', 'reject')).toEqual({ next: 'rejected', apply: true })
    expect(resolveDossierProposalTransition('rejected', 'reject')).toEqual({ next: 'rejected', apply: false })
  })
})

describe('renderEvaluationDossierMarkdown', () => {
  it('trunca al máximo del body de nota sin romper el límite', () => {
    const huge = {
      ...draft,
      resumenEjecutivo: 'r'.repeat(1500),
      coherencias: Array.from({ length: 12 }, (_, i) => ({
        afirmacion: `a${i}-` + 'x'.repeat(390),
        evidencia: 'e'.repeat(590)
      }))
    }

    const rendered = renderEvaluationDossierMarkdown(huge)

    expect(rendered.length).toBeLessThanOrEqual(8000)
    expect(rendered).toContain('truncado')
  })
})
