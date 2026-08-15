import { describe, expect, it } from 'vitest'

import {
  GROUNDED_QUERIES_ENDPOINT,
  TRACK_ENDPOINT,
  DISCOVERY_ENDPOINT,
  buildKeywordDiscoveryActionRequest,
  buildTrajectoryHref,
  resolveGroundedFeedback,
  resolveTrackFeedback
} from '../keyword-discovery-action'

/**
 * TASK-1665 Slice 4 — el mapeo de acciones gobernadas.
 *
 * Lo que se prueba acá no es cosmética: es la frontera donde una respuesta 200 puede significar
 * "no pasó nada" o "rebotó por techo". Leerla mal pinta seguimiento sobre términos que nadie
 * está midiendo, y el error sólo se descubre cuando llega la factura.
 */

const CONTEXT = {
  organizationId: 'org-1',
  seoTargetId: 'target-1',
  runId: 'run-1',
  candidateId: 'cand-1',
  keyword: 'pintura industrial',
  graderProfileId: 'profile-1'
}

describe('buildKeywordDiscoveryActionRequest', () => {
  it('declarar objetivo y seguir oportunidad usan el MISMO command con intención distinta', () => {
    const target = buildKeywordDiscoveryActionRequest('declareTarget', CONTEXT)
    const opportunity = buildKeywordDiscoveryActionRequest('followOpportunity', CONTEXT)

    expect(target?.endpoint).toBe(TRACK_ENDPOINT)
    expect(opportunity?.endpoint).toBe(TRACK_ENDPOINT)
    expect(target?.body.intent).toBe('target')
    expect(opportunity?.body.intent).toBe('opportunity')
  })

  it('descartar va al log append-only de discovery, NUNCA al command de tracking', () => {
    const request = buildKeywordDiscoveryActionRequest('dismiss', CONTEXT)

    expect(request?.endpoint).toBe(DISCOVERY_ENDPOINT)
    expect(request?.body).toMatchObject({ intent: 'record_action', actionKind: 'dismissed' })
    // Descartar no puede tocar el set monitoreado ni por accidente.
    expect(request?.body).not.toHaveProperty('keywords')
  })

  it('grounded exige perfil AEO: sin él no se arma un cuerpo incompleto', () => {
    expect(buildKeywordDiscoveryActionRequest('prepareGrounded', CONTEXT)?.endpoint).toBe(GROUNDED_QUERIES_ENDPOINT)
    expect(buildKeywordDiscoveryActionRequest('prepareGrounded', { ...CONTEXT, graderProfileId: null })).toBeNull()
  })
})

describe('resolveTrackFeedback', () => {
  it('lee el outcome de ESTA keyword dentro del lote, no el primero que venga', () => {
    const payload = {
      outcomes: [
        { keyword: 'otra cosa', status: 'tracked' },
        { keyword: 'pintura industrial', status: 'capacity_exceeded' }
      ]
    }

    const feedback = resolveTrackFeedback(payload, 'pintura industrial', 'followOpportunity')

    expect(feedback.severity).toBe('error')
    expect(feedback.tracked).toBe(false)
  })

  it('capacity_exceeded llega con HTTP 200 y NO es éxito', () => {
    const feedback = resolveTrackFeedback(
      { outcomes: [{ keyword: 'pintura industrial', status: 'capacity_exceeded' }] },
      'pintura industrial',
      'declareTarget'
    )

    expect(feedback.tracked).toBe(false)
    expect(feedback.severity).toBe('error')
  })

  it('already_tracked es info, no success: no pasó nada nuevo', () => {
    const feedback = resolveTrackFeedback(
      { outcomes: [{ keyword: 'pintura industrial', status: 'already_tracked' }] },
      'pintura industrial',
      'followOpportunity'
    )

    expect(feedback.severity).toBe('info')
    expect(feedback.tracked).toBe(true)
  })

  it('intent_changed (TASK-1659) se reporta como cambio real, no como already_tracked', () => {
    const feedback = resolveTrackFeedback(
      { outcomes: [{ keyword: 'pintura industrial', status: 'intent_changed' }] },
      'pintura industrial',
      'declareTarget'
    )

    expect(feedback.severity).toBe('success')
    expect(feedback.tracked).toBe(true)
    expect(feedback.message).toContain('clasificación')
  })

  it('un 200 sin outcomes NO se lee como éxito', () => {
    const feedback = resolveTrackFeedback({}, 'pintura industrial', 'declareTarget')

    expect(feedback.severity).toBe('error')
    expect(feedback.tracked).toBe(false)
  })
})

describe('resolveGroundedFeedback', () => {
  it('baseline_fallback NO se anuncia como si el modelo hubiera razonado el borrador', () => {
    const feedback = resolveGroundedFeedback({ mode: 'baseline_fallback' }, 'pintura industrial')

    expect(feedback.severity).toBe('info')
    expect(feedback.message).toContain('sin el modelo')
  })

  it('grounded_llm es el camino feliz', () => {
    expect(resolveGroundedFeedback({ mode: 'grounded_llm' }, 'pintura industrial').severity).toBe('success')
  })

  it('ninguna acción grounded marca el candidato como seguido', () => {
    expect(resolveGroundedFeedback({ mode: 'grounded_llm' }, 'kw').tracked).toBe(false)
  })

  /**
   * 🔴 El contrato del bridge dice que `coverageNotice` viaja OBLIGATORIO y el consumer no puede
   * omitirlo: un draft con huecos anunciado como éxito pleno es justo lo que prohíbe.
   */
  it('un draft con cobertura incompleta NO se anuncia como éxito pleno', () => {
    const feedback = resolveGroundedFeedback(
      { mode: 'grounded_llm', coverageNotice: '2 candidatos quedaron sin pregunta.' },
      'pintura industrial'
    )

    expect(feedback.severity).toBe('info')
    expect(feedback.message).toContain('cobertura incompleta')
    expect(feedback.message).toContain('2 candidatos quedaron sin pregunta.')
  })

  it('un coverageNotice vacío o en blanco no degrada el éxito', () => {
    expect(resolveGroundedFeedback({ mode: 'grounded_llm', coverageNotice: '   ' }, 'kw').severity).toBe('success')
    expect(resolveGroundedFeedback({ mode: 'grounded_llm', coverageNotice: null }, 'kw').severity).toBe('success')
  })

  it('reutilizar un draft vigente no se anuncia como creación', () => {
    const feedback = resolveGroundedFeedback({ mode: 'grounded_llm', deduped: true }, 'pintura industrial')

    expect(feedback.severity).toBe('info')
    expect(feedback.message).toContain('Ya existía')
  })

  it('el fallback manda sobre deduped y sobre la cobertura: cambia QUÉ hay que revisar', () => {
    const feedback = resolveGroundedFeedback(
      { mode: 'baseline_fallback', deduped: true, coverageNotice: 'hueco' },
      'kw'
    )

    expect(feedback.message).toContain('sin el modelo')
  })
})

describe('buildTrajectoryHref', () => {
  it('preserva el Space y codifica la keyword', () => {
    expect(buildTrajectoryHref('org-1', 'pintura industrial & más')).toBe(
      '/admin/growth/seo/performance?space=org-1&keywords=pintura%20industrial%20%26%20m%C3%A1s'
    )
  })
})
