import { describe, expect, it } from 'vitest'

import { resolveGrowthMarket } from '@/lib/growth/markets'

import { FIXTURE_DISCOVERY_ABSENT } from '../../evals/observation-fixtures'
import { normalizeObservation } from '../../normalization/normalizer'
import { matchesAlias, validateCompetitors, type MatchingSnapshot } from '../contracts'

const snapshot: MatchingSnapshot = {
  version: 'matching.v1',
  marketSource: 'profile',
  brand: {
    name: 'SKY Airline',
    aliases: [{ name: 'SKY', matchMode: 'word_cs' }],
    websiteUrl: null,
    category: 'Aerolíneas'
  },
  market: resolveGrowthMarket('BR'),
  providerPolicyVersion: 'policy.v2.multilingual-geo',
  competitorSetId: 'set1',
  setVersion: 1,
  competitors: validateCompetitors([
    { name: 'LATAM Airlines', aliases: [{ name: 'LATAM', matchMode: 'word_cs' }] },
    { name: 'Gol', matchMode: 'word_cs' }
  ])
}

describe('immutable measurement matching', () => {
  it('uses canonical competitor names and explicit case-sensitive aliases', () => {
    const observation = {
      ...FIXTURE_DISCOVERY_ABSENT,
      answerExcerpt: 'SKY, LATAM y Gol. Un gol es distinto de Google.',
      citations: []
    }

    const before = normalizeObservation(observation, {
      subjectBrand: 'WRONG LIVE NAME',
      subjectDomain: null,
      competitorsDeclared: ['Wrong'],
      matchingSnapshot: snapshot
    })

    expect(before.brandMentioned).toBe('yes')
    expect(before.competitorsMentioned).toEqual(['LATAM Airlines', 'Gol'])

    const after = normalizeObservation(observation, {
      subjectBrand: 'Another changed profile',
      subjectDomain: null,
      competitorsDeclared: [],
      matchingSnapshot: structuredClone(snapshot)
    })

    expect(after).toEqual(before)
  })
  it('preserves single-character brands with whole-word matching', () => {
    expect(validateCompetitors([{ name: 'X', matchMode: 'word_cs' }])[0].name).toBe('X')
    expect(matchesAlias('X publica', { name: 'X', matchMode: 'word_cs' })).toBe(true)
    expect(matchesAlias('EXXON', { name: 'X', matchMode: 'word_cs' })).toBe(false)
    expect(() => validateCompetitors([{ name: ' ' }])).toThrow()
  })
  it('does not confuse common words or partial substrings with case-sensitive brands', () => {
    expect(matchesAlias('gol Google golazo', { name: 'Gol', matchMode: 'word_cs' })).toBe(false)
    expect(matchesAlias('cielo sky', { name: 'SKY', matchMode: 'word_cs' })).toBe(false)
    expect(matchesAlias('PERÚ', { name: 'Peru', matchMode: 'word_ci' })).toBe(true)
  })
})
