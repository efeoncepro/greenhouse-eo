import { describe, expect, it } from 'vitest'

/**
 * TASK-1709 Slice 3 — derivación pura: evidencia cruda → hechos con lente.
 * Cubre: conteos por tipo/rank, muestras acotadas, ETV null (no 0) cuando el
 * proveedor no lo trae, fuentes caídas que no emiten hechos.
 */

import type { ProspectMarketEvidence, ProspectSourceOutcome } from '../collect'
import { deriveProspectMarketFacts } from '../derive'

const okOutcome = (source: ProspectSourceOutcome['source'], items: unknown[]): ProspectSourceOutcome => ({
  source,
  ok: true,
  costUsd: 0.01,
  items,
  errorCode: null
})

const failedOutcome = (source: ProspectSourceOutcome['source']): ProspectSourceOutcome => ({
  source,
  ok: false,
  costUsd: 0,
  items: [],
  errorCode: 'provider_error_40000'
})

const rankedItem = (type: string, rankGroup: number, keyword: string, etv?: number) => ({
  ranked_serp_element: { serp_item: { type, rank_group: rankGroup, ...(etv !== undefined ? { etv } : {}) } },
  keyword_data: { keyword }
})

const CAPTURED_AT = '2026-08-27T12:00:00.000Z'

const evidence = (overrides: Partial<ProspectMarketEvidence>): ProspectMarketEvidence => ({
  etvMethodology: {
    version: 'legacy_static_v1',
    evidence: 'explicit_request',
    requestedAt: CAPTURED_AT,
    policyVersion: 'etv-policy.v1',
    historicalBasis: null
  },
  rankedKeywords: failedOutcome('labs_ranked_keywords'),
  competitorsDomain: failedOutcome('labs_competitors_domain'),
  backlinksCompetitors: failedOutcome('backlinks_competitors'),
  domainIntersection: failedOutcome('backlinks_domain_intersection'),
  actualCostUsd: 0,
  ...overrides
})

describe('deriveProspectMarketFacts', () => {
  it('deriva superficie, top10, striking distance y citas AI Overview', () => {
    const facts = deriveProspectMarketFacts(
      evidence({
        rankedKeywords: okOutcome('labs_ranked_keywords', [
          rankedItem('organic', 3, 'pintura', 120),
          rankedItem('organic', 14, 'pintura para piso', 30),
          rankedItem('organic', 18, 'esmalte al agua', 10),
          rankedItem('ai_overview_reference', 5, 'mejor pintura exterior')
        ])
      }),
      CAPTURED_AT
    )

    const byKind = Object.fromEntries(facts.map(fact => [fact.kind, fact]))

    expect(byKind.ranked_keywords_total.magnitude).toBe(3)
    expect(byKind.ranked_keywords_top10.magnitude).toBe(1)
    expect(byKind.striking_distance_keywords.magnitude).toBe(2)
    expect(byKind.striking_distance_keywords.detail.sample).toEqual(['pintura para piso', 'esmalte al agua'])
    expect(byKind.ai_overview_citations.magnitude).toBe(1)
    expect(byKind.estimated_monthly_traffic.magnitude).toBe(160)

    for (const fact of facts) {
      expect(fact.lens).toBe('estimated')
      expect(fact.capturedAt).toBe(CAPTURED_AT)
    }
  })

  it('sin ETV del proveedor → magnitude null, JAMÁS 0', () => {
    const facts = deriveProspectMarketFacts(
      evidence({
        rankedKeywords: okOutcome('labs_ranked_keywords', [rankedItem('organic', 2, 'pintura')])
      }),
      CAPTURED_AT
    )

    const traffic = facts.find(fact => fact.kind === 'estimated_monthly_traffic')

    expect(traffic?.magnitude).toBeNull()
  })

  it('una fuente caída no emite hechos (degradación honesta por fuente)', () => {
    const facts = deriveProspectMarketFacts(
      evidence({
        competitorsDomain: okOutcome('labs_competitors_domain', [
          { domain: 'rival.cl', avg_position: 4.2, intersections: 88 }
        ])
      }),
      CAPTURED_AT
    )

    expect(facts.map(fact => fact.kind)).toEqual(['competitors_identified'])
    expect(facts[0].magnitude).toBe(1)
  })

  it('link gap: cuenta los dominios que enlazan a la competencia y no al prospecto', () => {
    const facts = deriveProspectMarketFacts(
      evidence({
        domainIntersection: okOutcome('backlinks_domain_intersection', [
          { referring_domain: 'medio.cl' },
          { referring_domain: 'blog-industrial.cl' }
        ])
      }),
      CAPTURED_AT
    )

    const gap = facts.find(fact => fact.kind === 'link_gap_referring_domains')

    expect(gap?.magnitude).toBe(2)
    expect(gap?.detail.sample).toEqual(['medio.cl', 'blog-industrial.cl'])
  })
})
