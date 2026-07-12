import { describe, expect, it } from 'vitest'

import { defaultAudienceForKind } from '../assets'
import type { ProposalAssetKind } from '../types'

/**
 * TASK-1392 — el default de audience es SEGURO: interno salvo los 3 kinds client-facing. El
 * diagnóstico, el squad blueprint y la matriz llevan loaded cost y piso de negociación — filtrarlos
 * al comprador es entregarle nuestra estructura de costos. Promover a client_facing es SIEMPRE una
 * declaración explícita, nunca un default.
 */
describe('defaultAudienceForKind', () => {
  const INTERNAL_KINDS: ProposalAssetKind[] = [
    'rfp_source',
    'fillable_template',
    'diagnostic',
    'admissibility_matrix',
    'other_doc'
  ]

  const CLIENT_FACING_KINDS: ProposalAssetKind[] = ['technical_offer', 'economic_offer', 'deck']

  it.each(INTERNAL_KINDS)('%s nace internal', kind => {
    expect(defaultAudienceForKind(kind)).toBe('internal')
  })

  it.each(CLIENT_FACING_KINDS)('%s nace client_facing (es lo que evalúa el comité)', kind => {
    expect(defaultAudienceForKind(kind)).toBe('client_facing')
  })
})
