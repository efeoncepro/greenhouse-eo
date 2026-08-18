// @vitest-environment jsdom

// TASK-1737 — Contratos de UI del tab Expediente (render diseñado del dossier IA):
// (1) el borrador `proposed` se renderiza como COMPOSICIÓN estructurada (lead + claims
//     con evidencia citada + focos numerados + disclosure de no verificable), no como
//     dump markdown;
// (2) los scores mencionados en la evidencia se resaltan como chips tonales del
//     semáforo canónico de hiring;
// (3) la nota confirmada SIN edición humana (bodyMd ≡ render canónico del server)
//     prefiere el render estructurado; la nota EDITADA conserva el fallback markdown
//     (lo editado es la fuente de la nota y siempre gana).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanup, screen, waitFor, within } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'
import { hiringDesk } from '@/lib/copy/dictionaries/es-CL/hiringDesk'
import type { HiringApplicationNote } from '@/types/hiring-application-notes'
import type { DossierProposal, EvaluationDossierDraft } from '@/types/hiring-dossier-ai'

import ApplicationDossierPanel from './ApplicationDossierPanel'

const expediente = hiringDesk.application.expediente

const draftFixture: EvaluationDossierDraft = {
  resumenEjecutivo: 'Perfil sólido para el rol, con evidencia consistente entre CV y assessment.',
  coherencias: [
    {
      afirmacion: 'Domina Coordinación de delivery',
      evidencia: 'Coordinación de delivery (82 promedio) respaldada por proyectos del CV'
    }
  ],
  gaps: [
    {
      afirmacion: 'Brecha en Comunicación con clientes',
      evidencia: 'Comunicación con clientes con score efectivo: 55'
    }
  ],
  focosEntrevista: ['Profundizar en gestión de proveedores', 'Validar liderazgo de squads'],
  noVerificable: ['Título universitario declarado', 'Certificación PMP']
}

const CANONICAL_BODY_MD = '## Resumen ejecutivo\n\nPerfil sólido para el rol.'

const proposalFixture = (status: DossierProposal['status']): DossierProposal => ({
  proposalId: 'hdsp-1',
  applicationId: 'happ-1',
  proposed: { dossier: draftFixture, sources: { cvContentHash: 'hash-1' } },
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  promptVersion: 'hiring_evaluation_dossier.v2',
  inputDigest: 'digest-1',
  status,
  decisionNote: null,
  confirmedBy: status === 'confirmed' ? 'user-2' : null,
  confirmedAt: status === 'confirmed' ? '2026-08-16T13:00:00.000Z' : null,
  createdBy: 'user-1',
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:00:00.000Z'
})

const agentNote = (bodyMd: string): HiringApplicationNote => ({
  noteId: 'note-1',
  applicationId: 'happ-1',
  kind: 'cv_analysis',
  bodyMd,
  authorUserId: 'user-2',
  source: 'agent',
  contextJson: {
    dossierProposalId: 'hdsp-1',
    inputDigest: 'digest-1',
    model: 'claude-sonnet-5',
    promptVersion: 'hiring_evaluation_dossier.v2'
  },
  createdAt: '2026-08-16T13:00:00.000Z',
  supersededByNoteId: null
})

const mockDossierGet = (payload: Record<string, unknown>) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/dossier')) {
        return new Response(JSON.stringify(payload), { status: 200 })
      }

      throw new Error(`fetch inesperado en el test: ${url}`)
    })
  )
}

const renderPanel = (props: Partial<Parameters<typeof ApplicationDossierPanel>[0]> = {}) =>
  renderWithTheme(
    <ApplicationDossierPanel
      copy={hiringDesk}
      applicationId='happ-1'
      stageLabel='Assessment'
      appliedAt='2026-08-01T12:00:00.000Z'
      stageUpdatedAt='2026-08-15T12:00:00.000Z'
      decisionHistory={[]}
      initialNotes={[]}
      initialHiddenNoteCount={0}
      initialViewerBlind={false}
      canAnnotate
      noteAuthorNames={{ 'user-2': 'Valentina R.' }}
      onGoToScorecard={vi.fn()}
      onToast={vi.fn()}
      {...props}
    />
  )

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ApplicationDossierPanel — render estructurado del borrador (TASK-1737)', () => {
  it('renderiza la propuesta como composición diseñada, no como dump markdown', async () => {
    mockDossierGet({
      aiEnabled: true,
      proposal: proposalFixture('proposed'),
      proposalBodyMd: CANONICAL_BODY_MD,
      proposalStale: false,
      viewerBlindUntilScorecardSubmitted: false
    })

    renderPanel()

    // Lead + secciones con jerarquía real (headings h6 por sección).
    await waitFor(() => {
      expect(screen.getByText(draftFixture.resumenEjecutivo)).toBeTruthy()
    })

    // El título del panel es `h3` y las secciones bajan a `h4`: el árbol de encabezados no
    // salta niveles (el tab ya aporta el `h2`).
    expect(screen.getByRole('heading', { level: 3, name: expediente.proposalTitle })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: expediente.sectionSummary })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: expediente.sectionCoherences })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: expediente.sectionGaps })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: expediente.sectionInterviewFocus })).toBeTruthy()

    // Claims: afirmación como texto principal + bloque de evidencia etiquetado.
    expect(screen.getByText('Domina Coordinación de delivery')).toBeTruthy()
    expect(screen.getAllByText(expediente.evidenceTitle).length).toBe(2)

    // Focos como lista accionable numerada (1 y 2 visibles). La numeración se consulta
    // DENTRO de su propia lista: los encabezados de sección también rinden un conteo, así
    // que un `getByText('1')` global sería ambiguo por diseño.
    expect(screen.getByText('Profundizar en gestión de proveedores')).toBeTruthy()

    const focusList = screen
      .getByRole('heading', { name: expediente.sectionInterviewFocus })
      .closest('section')
      ?.querySelector('ol')

    expect(focusList).toBeTruthy()
    expect(within(focusList as HTMLElement).getByText('1')).toBeTruthy()
    expect(within(focusList as HTMLElement).getByText('2')).toBeTruthy()

    // No verificable como disclosure colapsable con conteo.
    expect(screen.getByText('No verificable con las fuentes (2)')).toBeTruthy()

    // Nada de markdown crudo en el panel de propuesta.
    expect(screen.queryByText(/## /)).toBeNull()
  })

  it('resalta los scores mencionados en la evidencia como chips tonales', async () => {
    mockDossierGet({
      aiEnabled: true,
      proposal: proposalFixture('proposed'),
      proposalBodyMd: CANONICAL_BODY_MD,
      proposalStale: false,
      viewerBlindUntilScorecardSubmitted: false
    })

    renderPanel()

    // '82 promedio' y 'score efectivo: 55' → el número vive en un chip, separado del texto.
    await waitFor(() => {
      expect(screen.getByText('82')).toBeTruthy()
    })

    expect(screen.getByText('55')).toBeTruthy()
  })

  it('nota confirmada SIN editar → render estructurado; nota EDITADA → fallback markdown', async () => {
    mockDossierGet({
      aiEnabled: true,
      proposal: proposalFixture('confirmed'),
      proposalBodyMd: CANONICAL_BODY_MD,
      proposalStale: null,
      viewerBlindUntilScorecardSubmitted: false
    })

    const { unmount } = renderPanel({ initialNotes: [agentNote(CANONICAL_BODY_MD)] })

    // bodyMd ≡ render canónico → composición estructurada dentro de la nota.
    await waitFor(() => {
      expect(screen.getByText('Domina Coordinación de delivery')).toBeTruthy()
    })

    expect(screen.getByText('No verificable con las fuentes (2)')).toBeTruthy()

    unmount()
    cleanup()

    // Nota editada por el humano: lo editado es la fuente → markdown fallback.
    mockDossierGet({
      aiEnabled: true,
      proposal: proposalFixture('confirmed'),
      proposalBodyMd: CANONICAL_BODY_MD,
      proposalStale: null,
      viewerBlindUntilScorecardSubmitted: false
    })

    renderPanel({ initialNotes: [agentNote('## Análisis ajustado\n\nEl humano corrigió el resumen.')] })

    await waitFor(() => {
      expect(screen.getByText('El humano corrigió el resumen.')).toBeTruthy()
    })

    // El render estructurado NO se usa cuando hubo edición.
    expect(screen.queryByText('Domina Coordinación de delivery')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Análisis ajustado' })).toBeTruthy()
  })

  it('respuesta del GET traducida (propuesta v1, TASK-1737) → el panel conserva el render estructurado', async () => {
    // El server tradujo key→nombre humano AMBOS lados con el mismo replacer: el dossier
    // de la propuesta, el bodyMd canónico y el bodyMd de la nota agent (reader). La
    // igualdad nota ≡ render canónico se preserva y la rama estructurada sigue eligiéndose.
    const translatedDraft: EvaluationDossierDraft = {
      ...draftFixture,
      resumenEjecutivo: 'Fuerte en Coordinación de entrega; brecha en Comunicación con clientes.',
      gaps: [
        {
          afirmacion: 'Brecha en Comunicación con clientes',
          evidencia: 'Comunicación con clientes con score efectivo: 55'
        }
      ]
    }

    const translatedBodyMd =
      '## Resumen ejecutivo\n\nFuerte en Coordinación de entrega; brecha en Comunicación con clientes.'

    const proposal = proposalFixture('confirmed')

    mockDossierGet({
      aiEnabled: true,
      proposal: { ...proposal, proposed: { ...proposal.proposed, dossier: translatedDraft } },
      proposalBodyMd: translatedBodyMd,
      proposalStale: null,
      viewerBlindUntilScorecardSubmitted: false
    })

    renderPanel({ initialNotes: [agentNote(translatedBodyMd)] })

    // Rama estructurada con los NOMBRES humanos (nada de snake_case en pantalla).
    await waitFor(() => {
      expect(screen.getByText(translatedDraft.resumenEjecutivo)).toBeTruthy()
    })

    expect(screen.getByText('Brecha en Comunicación con clientes')).toBeTruthy()
    expect(screen.getAllByText(expediente.evidenceTitle).length).toBeGreaterThan(0)
    expect(screen.queryByText(/delivery_coordination|client_relationship_comm/)).toBeNull()

    // Nada de markdown crudo: la nota NO cayó al fallback.
    expect(screen.queryByText(/## /)).toBeNull()
  })
})
