import { describe, expect, it } from 'vitest'

import {
  FIXTURE_DISCOVERY_ABSENT,
  FIXTURE_ENTITY_COLLISION,
  FIXTURE_RECALL_ACCURATE,
  FIXTURE_SKIPPED
} from '../evals/observation-fixtures'
import { isNormalizedFinding } from '../normalization/contracts'
import { normalizeObservation, type NormalizationContext } from '../normalization/normalizer'

const EFEONCE: NormalizationContext = {
  subjectBrand: 'Efeonce',
  subjectDomain: 'efeoncepro.com',
  competitorsDeclared: ['Cebra']
}

describe('growth/ai-visibility — deterministic normalizer', () => {
  it('descubrimiento sin marca (dominio ausente) → brandMentioned no, alta confianza', () => {
    const f = normalizeObservation(FIXTURE_DISCOVERY_ABSENT, EFEONCE)

    expect(isNormalizedFinding(f)).toBe(true)
    expect(f.brandMentioned).toBe('no')
    expect(f.confidence).toBeGreaterThanOrEqual(0.8)
    expect(f.commercialIntentMatch).toBe('no') // p03 = consideration (revenue intent)
    // Competidor declarado presente en el excerpt.
    expect(f.competitorsMentioned).toContain('Cebra')
    expect(f.citationDomains).toContain('cebra.cl')
    // Prosa preservada como unknown (no LLM).
    expect(f.sentimentLabel).toBe('unknown')
    expect(f.categoryAssociations).toEqual([])
    expect(f.messageDriftClaims).toEqual([])
    expect(f.brandRank).toBeNull()
  })

  it('recall con dominio del sujeto citado → brandMentioned yes + cita propia', () => {
    const f = normalizeObservation(FIXTURE_RECALL_ACCURATE, EFEONCE)

    expect(f.brandMentioned).toBe('yes')
    expect(f.citationDomains).toContain('efeoncepro.com')
    expect(f.sourceTypes).toContain('owned')
    expect(f.commercialIntentMatch).toBe('partial') // p14 = message_recall
    expect(f.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('colisión de entidad: determinista resuelve yes por dominio (ambiguous lo refina el LLM)', () => {
    const f = normalizeObservation(FIXTURE_ENTITY_COLLISION, EFEONCE)

    // Determinista: el dominio del sujeto está citado → yes (la desambiguación
    // ambiguous es señal de prosa que rellena el hook LLM, no el determinista).
    expect(f.brandMentioned).toBe('yes')
    expect(f.citationDomains).toEqual(expect.arrayContaining(['efeoncepro.com', 'f11.es']))
    expect(f.sentimentLabel).toBe('unknown')
  })

  it('observación skipped → finding vacío (todo unknown, confidence 0)', () => {
    const f = normalizeObservation(FIXTURE_SKIPPED, EFEONCE)

    expect(f.brandMentioned).toBe('unknown')
    expect(f.confidence).toBe(0)
    expect(f.citationDomains).toEqual([])
    expect(f.commercialIntentMatch).toBe('unknown')
  })

  it('sin subjectDomain: cae a name-match de menor confianza, sin inventar', () => {
    const f = normalizeObservation(FIXTURE_RECALL_ACCURATE, { ...EFEONCE, subjectDomain: null })

    // p14 nombra la marca + nombre en excerpt → yes pero confianza media.
    expect(f.brandMentioned).toBe('yes')
    expect(f.confidence).toBeLessThan(0.8)
  })

  it('NUNCA inventa rank/competidores fuera de los declarados/citados', () => {
    const f = normalizeObservation(FIXTURE_DISCOVERY_ABSENT, { ...EFEONCE, competitorsDeclared: [] })

    expect(f.brandRank).toBeNull()
    expect(f.competitorsMentioned).toEqual([])
  })
})
