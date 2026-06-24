import { describe, expect, it } from 'vitest'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import {
  RECOMMENDATION_GAP_BELOW,
  RECOMMENDATION_MAPPING,
  buildRecommendation,
  buildRecommendations,
  computePriority,
  pickPrimaryGap,
  resolveSeverity,
  toPublicRecommendation
} from '../report/recommendations'
import { type ScoredDimensionInput } from '../report/recommendations'

describe('growth/ai-visibility — recommendation engine (§8.4)', () => {
  it('resuelve severidad nombrada; null → sin_dato (NUNCA 0)', () => {
    expect(resolveSeverity(null)).toBe('sin_dato')
    expect(resolveSeverity(0)).toBe('critico')
    expect(resolveSeverity(39)).toBe('critico')
    expect(resolveSeverity(40)).toBe('atencion')
    expect(resolveSeverity(69)).toBe('atencion')
    expect(resolveSeverity(70)).toBe('optimo')
    expect(resolveSeverity(100)).toBe('optimo')
  })

  it('mapea las 6 dimensiones driver a gap + motion (sin ai_visibility)', () => {
    expect(RECOMMENDATION_MAPPING).toHaveLength(6)
    expect(RECOMMENDATION_MAPPING.map(m => m.dimensionKey)).not.toContain('ai_visibility')
    expect(RECOMMENDATION_MAPPING.find(m => m.dimensionKey === 'entity_clarity')).toMatchObject({
      gapKey: 'low_entity_clarity',
      motion: 'entity_foundation'
    })
  })

  it('NO recomienda para ai_visibility (resultado compuesto)', () => {
    expect(buildRecommendation({ key: 'ai_visibility', score: 0, weight: 25 })).toBeNull()
  })

  it('NO recomienda dimensión sin evidencia (null) ni óptima (≥70)', () => {
    expect(buildRecommendation({ key: 'entity_clarity', score: null, weight: 15 })).toBeNull()
    expect(buildRecommendation({ key: 'entity_clarity', score: RECOMMENDATION_GAP_BELOW, weight: 15 })).toBeNull()
    expect(buildRecommendation({ key: 'entity_clarity', score: 85, weight: 15 })).toBeNull()
  })

  it('recomienda driver con gap, con copy de la skill + motion', () => {
    const recommendation = buildRecommendation({ key: 'citation_quality', score: 10, weight: 15 })

    expect(recommendation).not.toBeNull()
    expect(recommendation?.gapKey).toBe('weak_citation_quality')
    expect(recommendation?.motion).toBe('digital_pr_citations')
    expect(recommendation?.severity).toBe('critico')
    expect(recommendation?.title).toBe(GH_GROWTH_AI_VISIBILITY.recommendation.weak_citation_quality.title)
    expect(recommendation?.action).toContain('PR digital')
  })

  it('prioriza por peso × tamaño del gap (RICE-ish), orden desc', () => {
    // entity_clarity (w15, score 10 → gap 90 → prio 13.5) vs revenue (w5, score 0 → gap 100 → prio 5)
    expect(computePriority(15, 10)).toBe(13.5)
    expect(computePriority(5, 0)).toBe(5)

    const dims: ScoredDimensionInput[] = [
      { key: 'revenue_intent_coverage', score: 0, weight: 5 },
      { key: 'entity_clarity', score: 10, weight: 15 }
    ]

    const recommendations = buildRecommendations(dims)

    expect(recommendations.map(r => r.dimensionKey)).toEqual(['entity_clarity', 'revenue_intent_coverage'])
    expect(pickPrimaryGap(recommendations)?.dimensionKey).toBe('entity_clarity')
  })

  it('orden determinista en empate de prioridad (peso desc, luego key asc)', () => {
    // category_ownership (w15) y competitive_sov (w15) con mismo score → empate de prio.
    const dims: ScoredDimensionInput[] = [
      { key: 'competitive_sov', score: 20, weight: 15 },
      { key: 'category_ownership', score: 20, weight: 15 }
    ]

    const a = buildRecommendations(dims).map(r => r.dimensionKey)
    const b = buildRecommendations([...dims].reverse()).map(r => r.dimensionKey)

    expect(a).toEqual(b) // mismo set → mismo orden, sin importar input order
    expect(a).toEqual(['category_ownership', 'competitive_sov']) // tiebreak key asc
  })

  it('proyección pública de recomendación no incluye priority', () => {
    const recommendation = buildRecommendation({ key: 'entity_clarity', score: 10, weight: 15 })!
    const pub = toPublicRecommendation(recommendation)

    expect('priority' in pub).toBe(false)
    expect(pub).toMatchObject({ gapKey: 'low_entity_clarity', motion: 'entity_foundation' })
  })
})
