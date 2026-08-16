import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

// display.ts → generate.ts → packet.ts arrastra la cadena del store; el mock cubre
// también withGreenhousePostgresTransaction para los módulos transitivos (db.ts).
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args),
  withGreenhousePostgresTransaction: vi.fn(),
  onGreenhousePostgresReset: vi.fn()
}))

vi.mock('@/lib/ai/anthropic', () => ({
  isAnthropicConfigured: vi.fn(),
  generateStructuredAnthropic: vi.fn()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

// confirm.ts (renderEvaluationDossierMarkdown) importa el módulo de notas y el outbox;
// acá solo se necesita el render puro para probar el invariante del panel.
vi.mock('../application-notes', () => ({
  HIRING_APPLICATION_NOTE_BODY_MAX: 8000,
  recordHiringApplicationNote: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

const { getCompetencyNameMapForApplication, translateAgentNoteBodiesForDisplay, translateDossierProposalForDisplay } =
  await import('./display')

const { renderEvaluationDossierMarkdown } = await import('./confirm')
const { translateCompetencyKeys } = await import('./generate')

// ══════════════════════════════════════════════════════════════════════════
// TASK-1737 — Capa de display al servir: las propuestas v1 almacenadas conservan
// keys snake_case en el ledger inmutable; el GET las traduce en lectura.
// ══════════════════════════════════════════════════════════════════════════

const NAME_MAP = {
  delivery_coordination: 'Coordinación de entrega',
  composure_pressure: 'Temple bajo presión',
  client_relationship_comm: 'Comunicación con clientes'
}

const storedV1Dossier = {
  resumenEjecutivo: 'Fuerte en delivery_coordination y composure_pressure; débil en client_relationship_comm.',
  coherencias: [
    {
      afirmacion: 'El CV respalda delivery_coordination.',
      evidencia: 'Score 82 en delivery_coordination y experiencia liderando entregas.'
    }
  ],
  gaps: [{ afirmacion: 'Brecha en client_relationship_comm.', evidencia: 'Score 45 en client_relationship_comm.' }],
  focosEntrevista: ['Profundizar composure_pressure con un caso real.'],
  noVerificable: ['Certificación mencionada junto a delivery_coordination sin respaldo.']
}

const storedProposal = {
  proposalId: 'hdp-1',
  applicationId: 'happ-1',
  proposed: { dossier: storedV1Dossier, sources: { cvContentHash: 'hash-1' } },
  provider: 'anthropic',
  model: 'claude-x',
  promptVersion: 'hiring_evaluation_dossier.v1',
  inputDigest: 'digest-1',
  status: 'proposed' as const,
  decisionNote: null,
  confirmedBy: null,
  confirmedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-08-10T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z'
}

beforeEach(() => {
  queryMock.mockReset()
})

describe('translateDossierProposalForDisplay (propuestas v1 almacenadas)', () => {
  it('traduce toda key conocida a su nombre humano en los 5 campos del dossier', () => {
    const display = translateDossierProposalForDisplay(storedProposal, NAME_MAP)
    const dossier = display.proposed.dossier as typeof storedV1Dossier

    expect(dossier.resumenEjecutivo).toBe(
      'Fuerte en Coordinación de entrega y Temple bajo presión; débil en Comunicación con clientes.'
    )
    expect(dossier.resumenEjecutivo).not.toContain('delivery_coordination')
    expect(dossier.coherencias[0]).toEqual({
      afirmacion: 'El CV respalda Coordinación de entrega.',
      evidencia: 'Score 82 en Coordinación de entrega y experiencia liderando entregas.'
    })
    expect(dossier.gaps[0].afirmacion).toBe('Brecha en Comunicación con clientes.')
    expect(dossier.focosEntrevista[0]).toBe('Profundizar Temple bajo presión con un caso real.')
    expect(dossier.noVerificable[0]).toBe('Certificación mencionada junto a Coordinación de entrega sin respaldo.')
  })

  it('deja intactas las keys desconocidas (no traduce lo que no está en el mapa)', () => {
    const display = translateDossierProposalForDisplay(
      {
        ...storedProposal,
        proposed: {
          dossier: {
            ...storedV1Dossier,
            resumenEjecutivo: 'Mide delivery_coordination y una unknown_competency_key sin catálogo.'
          }
        }
      },
      NAME_MAP
    )

    const dossier = display.proposed.dossier as typeof storedV1Dossier

    expect(dossier.resumenEjecutivo).toBe('Mide Coordinación de entrega y una unknown_competency_key sin catálogo.')
  })

  it('NO muta la propuesta almacenada: devuelve copia y el original conserva las keys', () => {
    const display = translateDossierProposalForDisplay(storedProposal, NAME_MAP)

    expect(display).not.toBe(storedProposal)
    expect(display.proposed).not.toBe(storedProposal.proposed)

    // La "fila" original (objeto leído del ledger) queda idéntica, con sus keys v1.
    expect((storedProposal.proposed.dossier as typeof storedV1Dossier).resumenEjecutivo).toContain(
      'delivery_coordination'
    )
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('devuelve la propuesta tal cual con mapa vacío o dossier sin forma usable', () => {
    expect(translateDossierProposalForDisplay(storedProposal, {})).toBe(storedProposal)

    const invalid = { ...storedProposal, proposed: { dossier: 'no-es-objeto' } }

    expect(translateDossierProposalForDisplay(invalid, NAME_MAP)).toBe(invalid)
  })
})

describe('translateAgentNoteBodiesForDisplay (notas source=agent)', () => {
  const agentNote = {
    noteId: 'note-1',
    applicationId: 'happ-1',
    kind: 'cv_analysis' as const,
    bodyMd: '## Resumen\n\nFuerte en delivery_coordination.',
    authorUserId: 'user-1',
    source: 'agent' as const,
    contextJson: { dossierProposalId: 'hdp-1' },
    createdAt: '2026-08-10T12:00:00.000Z'
  }

  const humanNote = {
    ...agentNote,
    noteId: 'note-2',
    source: 'human' as const,
    bodyMd: 'Nota humana que menciona delivery_coordination a propósito.'
  }

  it('traduce solo el bodyMd de notas agent; las humanas quedan intactas', () => {
    const [agent, human] = translateAgentNoteBodiesForDisplay([agentNote, humanNote], NAME_MAP)

    expect(agent.bodyMd).toBe('## Resumen\n\nFuerte en Coordinación de entrega.')
    expect(human.bodyMd).toBe(humanNote.bodyMd)

    // Sin mutación del objeto leído de la DB.
    expect(agentNote.bodyMd).toContain('delivery_coordination')
  })

  it('con mapa vacío devuelve el arreglo original sin tocar nada', () => {
    const notes = [agentNote]

    expect(translateAgentNoteBodiesForDisplay(notes, {})).toBe(notes)
  })

  it('INVARIANTE del panel: nota v1 sin editar traducida ≡ proposalBodyMd traducido (byte a byte)', () => {
    // Lo que el confirm v1 materializó como nota: el render canónico del dossier CON keys.
    const storedBodyMd = renderEvaluationDossierMarkdown(storedV1Dossier as never)

    // Camino del reader de notas: replacer sobre el bodyMd almacenado.
    const [servedNote] = translateAgentNoteBodiesForDisplay([{ ...agentNote, bodyMd: storedBodyMd }], NAME_MAP)

    // Camino del GET del dossier: replacer sobre el render del dossier ALMACENADO.
    const servedProposalBodyMd = translateCompetencyKeys(storedBodyMd, NAME_MAP)

    // La igualdad que el panel usa para elegir la rama estructurada se preserva…
    expect(servedNote.bodyMd).toBe(servedProposalBodyMd)
    expect(servedNote.bodyMd).not.toContain('delivery_coordination')

    // …y el draft traducido (rama estructurada / prefill de edición) renderiza EXACTAMENTE
    // ese mismo bodyMd: traducir campo a campo ≡ traducir el render completo.
    const display = translateDossierProposalForDisplay(storedProposal, NAME_MAP)

    expect(renderEvaluationDossierMarkdown(display.proposed.dossier as never)).toBe(servedProposalBodyMd)
  })
})

describe('getCompetencyNameMapForApplication', () => {
  it('construye el mapa desde la query y descarta nombres vacíos o iguales a la key', async () => {
    queryMock.mockResolvedValue([
      { competency_key: 'delivery_coordination', competency_name: 'Coordinación de entrega' },
      { competency_key: 'raw_key', competency_name: 'raw_key' },
      { competency_key: 'empty_name', competency_name: '   ' },
      { competency_key: 'composure_pressure', competency_name: 'Temple bajo presión' }
    ])

    await expect(getCompetencyNameMapForApplication('happ-1')).resolves.toEqual({
      delivery_coordination: 'Coordinación de entrega',
      composure_pressure: 'Temple bajo presión'
    })

    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(queryMock.mock.calls[0][1]).toEqual(['happ-1'])
  })
})
