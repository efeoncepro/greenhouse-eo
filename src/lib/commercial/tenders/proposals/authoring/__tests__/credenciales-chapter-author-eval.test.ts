import { describe, expect, it } from 'vitest'

import { runChapterAuthorEval } from '../eval-harness'
import {
  credencialesChapterAuthor,
  deriveCredencialesFacts,
  type CredencialesFraming,
  type CredencialesSource
} from '../credenciales-chapter-author'
import { validateChapterProposal } from '../chapter-author'
import { ProposalInputError } from '../../errors'

/**
 * TASK-1415 Slice 3 — EVAL del segundo author (credenciales): LA PRUEBA DE AGNOSTICISMO.
 *
 * Este author es de OTRO servicio (no lee el Grader) y pasa por el MISMO harness sin que la
 * interface ni el harness hayan cambiado — ése es el assert estructural del test del segundo
 * consumidor. El fixture es sintético (author de prueba, no productivo).
 */

const SOURCE: CredencialesSource = {
  brandTitle: 'Trabajo ya hecho, medible',
  credentials: [
    {
      clientName: 'Cliente A',
      service: 'Contenido editorial',
      proof: '48 artículos publicados',
      evidenceRef: 'Notion · Space Cliente A · 2026-06'
    },
    {
      clientName: 'Cliente B',
      service: 'Social media',
      proof: '120 piezas al año',
      evidenceRef: 'Metricool · marca Cliente B · 2026-06'
    },
    {
      clientName: 'Cliente C',
      service: 'Web/CRM',
      proof: '3 portales productivos',
      evidenceRef: 'HubSpot · portal 48713323 · 2026-06'
    },
    {
      clientName: 'Cliente D',
      service: 'SEO/AEO',
      proof: '+65% tráfico orgánico',
      evidenceRef: 'Semrush · database CL · 2026-06'
    }
  ]
}

const GOLDEN_FRAMING: CredencialesFraming = {
  bullets: [
    { factId: 'credential.0', description: 'Operación editorial sostenida: 48 artículos publicados con el equipo del cliente.' },
    { factId: 'credential.1', description: 'Producción social continua de 120 piezas al año, gobernada por calendario.' },
    { factId: 'credential.2', description: 'Implementación y operación de 3 portales productivos sobre su CRM.' },
    { factId: 'credential.3', description: 'Crecimiento de +65% en tráfico orgánico sobre la base medida.' }
  ]
}

describe('credenciales chapter-author eval (el segundo consumidor — prueba de agnosticismo)', () => {
  it('el golden pasa el harness domain-free y ensambla los slots exactos', () => {
    const result = runChapterAuthorEval(credencialesChapterAuthor, [
      {
        name: 'credenciales sintéticas',
        source: SOURCE,
        goldenFraming: GOLDEN_FRAMING,
        expectedSlides: [
          {
            slideId: 'credenciales',
            contentType: 'bullet-list',
            slots: {
              brandTitle: 'Trabajo ya hecho, medible',
              bullets: [
                { lead: 'Cliente A — Contenido editorial', description: GOLDEN_FRAMING.bullets[0].description },
                { lead: 'Cliente B — Social media', description: GOLDEN_FRAMING.bullets[1].description },
                { lead: 'Cliente C — Web/CRM', description: GOLDEN_FRAMING.bullets[2].description },
                { lead: 'Cliente D — SEO/AEO', description: GOLDEN_FRAMING.bullets[3].description }
              ]
            }
          }
        ]
      }
    ])

    expect(result.findings).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('una cifra fabricada en una description RECHAZA (el guard compartido aplica a CUALQUIER servicio)', () => {
    const facts = deriveCredencialesFacts(SOURCE)

    const framingConCifraInventada: CredencialesFraming = {
      bullets: [
        { factId: 'credential.0', description: 'Más de 900 artículos publicados.' },
        ...GOLDEN_FRAMING.bullets.slice(1)
      ]
    }

    expect(() =>
      validateChapterProposal(credencialesChapterAuthor, framingConCifraInventada, facts)
    ).toThrow(ProposalInputError)
  })

  it('un bullet que refiere un hecho inexistente RECHAZA (no se inventan credenciales)', () => {
    const facts = deriveCredencialesFacts(SOURCE)

    expect(() =>
      validateChapterProposal(
        credencialesChapterAuthor,
        { bullets: [{ factId: 'credential.99', description: 'x' }, ...GOLDEN_FRAMING.bullets.slice(1)] },
        facts
      )
    ).toThrow(ProposalInputError)
  })

  it('el mapper exige 4..7 credenciales (contrato de la lámina)', () => {
    expect(() => deriveCredencialesFacts({ ...SOURCE, credentials: SOURCE.credentials.slice(0, 2) })).toThrow(
      ProposalInputError
    )
  })
})
