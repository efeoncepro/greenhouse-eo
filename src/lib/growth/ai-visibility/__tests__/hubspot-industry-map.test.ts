import { describe, expect, it } from 'vitest'

import {
  CATEGORY_TAXONOMY_NODES_BY_ID,
  HUBSPOT_INDUSTRY_ENUM_VALUES,
  HUBSPOT_INDUSTRY_MATCH_CONFIDENCE,
  HUBSPOT_INDUSTRY_NODE_MAP,
  resolveHubSpotIndustryNode
} from '../taxonomy'

describe('growth/ai-visibility — HubSpot industry enum → canonical node map', () => {
  it('COVERAGE: every mapped HubSpot enum points at a real, active industry node', () => {
    const broken: string[] = []

    for (const [enumValue, nodeId] of Object.entries(HUBSPOT_INDUSTRY_NODE_MAP)) {
      const node = CATEGORY_TAXONOMY_NODES_BY_ID.get(nodeId)

      if (!node) broken.push(`${enumValue} → ${nodeId} (node missing)`)
      else if (node.status !== 'active') broken.push(`${enumValue} → ${nodeId} (node not active)`)
      else if (node.level !== 'industry') broken.push(`${enumValue} → ${nodeId} (node not industry-level)`)
    }

    expect(broken).toEqual([])
  })

  it('cubre un espectro amplio de marcas (no solo agencias/aerolineas)', () => {
    // The whole point of EPIC-021: universal coverage, not ICP-only calibration.
    expect(HUBSPOT_INDUSTRY_ENUM_VALUES.length).toBeGreaterThanOrEqual(120)

    const sampledBrandTypes: Record<string, string> = {
      AIRLINES_AVIATION: 'industry:aviation',
      BANKING: 'industry:finance',
      RETAIL: 'industry:retail',
      AUTOMOTIVE: 'industry:automotive',
      TELECOMMUNICATIONS: 'industry:telecommunications',
      FOOD_BEVERAGES: 'industry:food_beverage',
      APPAREL_FASHION: 'industry:consumer_goods',
      COMPUTER_SOFTWARE: 'industry:technology',
      MARKETING_AND_ADVERTISING: 'industry:marketing_communications',
      HOSPITALITY: 'industry:hospitality_travel'
    }

    for (const [enumValue, expectedNodeId] of Object.entries(sampledBrandTypes)) {
      expect(HUBSPOT_INDUSTRY_NODE_MAP[enumValue]).toBe(expectedNodeId)
    }
  })

  it('resuelve el enum tolerando casing/separadores', () => {
    const match = resolveHubSpotIndustryNode('AIRLINES_AVIATION')

    expect(match).toEqual({ nodeId: 'industry:aviation', confidence: HUBSPOT_INDUSTRY_MATCH_CONFIDENCE })
    expect(resolveHubSpotIndustryNode('airlines aviation')).toEqual(match)
    expect(resolveHubSpotIndustryNode('Airlines/Aviation')).toEqual(match)
  })

  it('devuelve null para free-text/CIIU/null (no es un enum reconocido)', () => {
    expect(resolveHubSpotIndustryNode(null)).toBeNull()
    expect(resolveHubSpotIndustryNode('')).toBeNull()
    expect(resolveHubSpotIndustryNode('Actividades profesionales, cientificas y tecnicas')).toBeNull()
  })
})
