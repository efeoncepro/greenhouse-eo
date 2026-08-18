import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HIRING_APPLICATION_NOTE_BODY_MAX as NOTE_BODY_MAX } from '@/types/hiring-application-notes'

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

// El literal del mock queda amarrado al contrato puro por el test `alineado con el contrato`
// (abajo): si alguien mueve el techo y no mueve el CHECK/el mock, el test rompe.
vi.mock('../application-notes', () => ({
  HIRING_APPLICATION_NOTE_BODY_MAX: 20000,
  recordHiringApplicationNote: (...args: unknown[]) => recordNoteMock(...args)
}))

const {
  assertDossierBodyWithinLimit,
  confirmEvaluationDossier,
  renderEvaluationDossierMarkdown,
  resolveDossierProposalTransition
} = await import('./confirm')

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

  // Regresión TASK-1735: el análisis confirmado de una candidata se persistió cortado a 8000
  // porque el render truncaba en silencio. Ahora el borrador largo se persiste ÍNTEGRO…
  it('un dossier que renderiza >8000 se persiste íntegro (nada se recorta)', async () => {
    const longDraft = {
      ...draft,
      resumenEjecutivo: 'r'.repeat(1500),
      coherencias: Array.from({ length: 12 }, (_, i) => ({
        afirmacion: `a${i}-` + 'x'.repeat(390),
        evidencia: 'e'.repeat(590)
      }))
    }

    lockProposalMock.mockResolvedValue({
      ...proposalFixture,
      proposed: { dossier: longDraft, sources: { cvContentHash: 'hash-cv-1' } }
    })

    await confirmEvaluationDossier({ proposalId: 'hdsp-1', decision: 'confirm', actorUserId: 'user-2' })

    const { bodyMd } = recordNoteMock.mock.calls[0][0]

    expect(bodyMd.length).toBeGreaterThan(8000)
    expect(bodyMd).not.toContain('truncado')
    expect(bodyMd).toContain('## No verificable con las fuentes')
    expect(bodyMd).toBe(renderEvaluationDossierMarkdown(longDraft))
  })

  // …y si aun así excede el techo nuevo, se ABORTA con error accionable en vez de cortar callado.
  it('cuerpo sobre el techo → falla loud, sin nota, sin marcar la propuesta ni emitir evento', async () => {
    await expect(
      confirmEvaluationDossier({
        proposalId: 'hdsp-1',
        decision: 'confirm',
        editedBodyMd: 'x'.repeat(NOTE_BODY_MAX + 1),
        actorUserId: 'user-2'
      })
    ).rejects.toMatchObject({ code: 'hiring_dossier_body_too_long', statusCode: 400 })

    expect(recordNoteMock).not.toHaveBeenCalled()
    expect(markDecidedMock).not.toHaveBeenCalled()
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
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
  it('alineado con el contrato: el techo del mock es el del primitive de notas', () => {
    expect(NOTE_BODY_MAX).toBe(20000)
  })

  // Regresión TASK-1735: el render cortaba a 8000 y persistía el análisis a mitad de frase.
  it('un dossier que renderiza >8000 se devuelve ÍNTEGRO (sin recorte ni marca de truncado)', () => {
    const huge = {
      ...draft,
      resumenEjecutivo: 'r'.repeat(1500),
      coherencias: Array.from({ length: 12 }, (_, i) => ({
        afirmacion: `a${i}-` + 'x'.repeat(390),
        evidencia: 'e'.repeat(590)
      }))
    }

    const rendered = renderEvaluationDossierMarkdown(huge)

    expect(rendered.length).toBeGreaterThan(8000)
    expect(rendered).not.toContain('truncado')
    // La última sección sobrevive: era justo lo que se perdía al cortar.
    expect(rendered).toContain('## No verificable con las fuentes')
    expect(rendered.endsWith(draft.noVerificable[0])).toBe(true)
  })
})

describe('assertDossierBodyWithinLimit', () => {
  it('deja pasar lo que cabe y falla LOUD (no trunca) lo que excede el techo', () => {
    expect(() => assertDossierBodyWithinLimit('x'.repeat(NOTE_BODY_MAX))).not.toThrow()

    expect(() => assertDossierBodyWithinLimit('x'.repeat(NOTE_BODY_MAX + 1))).toThrowError(
      expect.objectContaining({ code: 'hiring_dossier_body_too_long', statusCode: 400 })
    )
  })
})
