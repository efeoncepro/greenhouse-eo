import { describe, expect, it } from 'vitest'

import {
  CATEGORY_CONFIDENT_THRESHOLD,
  HUBSPOT_INDUSTRY_MATCH_CONFIDENCE,
  UNKNOWN_CATEGORY_NODE_ID,
  resolveCanonicalCategory
} from '../taxonomy'

describe('growth/ai-visibility — resolveCanonicalCategory (cascade with confidence)', () => {
  it('resuelve marcas de varios tipos vía el HubSpot enum prior (no solo agencias)', () => {
    const cases: Array<[string, string]> = [
      ['AIRLINES_AVIATION', 'industry:aviation'], // SKY — el caso que destapó ISSUE-110
      ['BANKING', 'industry:finance'],
      ['RETAIL', 'industry:retail'],
      ['AUTOMOTIVE', 'industry:automotive'],
      ['TELECOMMUNICATIONS', 'industry:telecommunications'],
      ['FOOD_BEVERAGES', 'industry:food_beverage'],
      ['APPAREL_FASHION', 'industry:consumer_goods'],
      ['MARKETING_AND_ADVERTISING', 'industry:marketing_communications']
    ]

    for (const [industry, expectedNodeId] of cases) {
      const resolved = resolveCanonicalCategory({ industry })

      expect(resolved.nodeId).toBe(expectedNodeId)
      expect(resolved.source).toBe('hubspot_map')
      expect(resolved.confidence).toBe(HUBSPOT_INDUSTRY_MATCH_CONFIDENCE)
      expect(resolved.confidence).toBeGreaterThanOrEqual(CATEGORY_CONFIDENT_THRESHOLD)
      expect(resolved.label?.es.length).toBeGreaterThan(0)
    }
  })

  it('nunca devuelve el enum crudo como nodeId', () => {
    const resolved = resolveCanonicalCategory({ industry: 'AIRLINES_AVIATION' })

    expect(resolved.nodeId).not.toBe('AIRLINES_AVIATION')
    expect(resolved.nodeId.startsWith('industry:')).toBe(true)
  })

  it('cae a la taxonomía por alias para free-text conocido', () => {
    const resolved = resolveCanonicalCategory({ industry: 'aerolinea' })

    expect(resolved.nodeId).toBe('industry:aviation')
    expect(resolved.source).toBe('taxonomy_alias')
  })

  it('degrada a unknown honesto para CIIU/free-text no reconocido', () => {
    const resolved = resolveCanonicalCategory({
      industry: 'Actividades profesionales, cientificas y tecnicas'
    })

    expect(resolved.nodeId).toBe(UNKNOWN_CATEGORY_NODE_ID)
    expect(resolved.label).toBeNull()
    expect(resolved.source).toBe('unknown')
    expect(resolved.confidence).toBe(0)
  })

  it('unknown cuando industry es null/vacío y no hay candidatos', () => {
    expect(resolveCanonicalCategory({ industry: null }).nodeId).toBe(UNKNOWN_CATEGORY_NODE_ID)
    expect(resolveCanonicalCategory({}).source).toBe('unknown')
  })

  it('el grounded candidate confiable es AUTORITATIVO sobre el prior HubSpot (cascada S4)', () => {
    // HubSpot dice "manufacturing" pero el grounded read entendió que la marca es una aerolínea.
    const resolved = resolveCanonicalCategory({
      industry: 'MACHINERY',
      groundedCandidate: { nodeId: 'industry:aviation', confidence: 0.9 }
    })

    expect(resolved.nodeId).toBe('industry:aviation')
    expect(resolved.source).toBe('brand_intelligence')
    expect(resolved.confidence).toBe(0.9)
  })

  it('un grounded candidate de baja confianza NO pisa el prior', () => {
    const resolved = resolveCanonicalCategory({
      industry: 'BANKING',
      groundedCandidate: { nodeId: 'industry:aviation', confidence: 0.3 }
    })

    expect(resolved.nodeId).toBe('industry:finance')
    expect(resolved.source).toBe('hubspot_map')
  })

  it('modelo de dos planos: free-text fino resuelve al sector (MID), enum al macro', () => {
    // Lo fino que un sector curado capta resuelve a ese sector...
    const midCases: Array<[string, string]> = [
      ['supermercado', 'sector:supermarkets_grocery'],
      ['aerolinea de pasajeros', 'sector:passenger_airlines'],
      ['banca retail', 'sector:retail_consumer_banking'],
      ['moda', 'sector:apparel_fashion'],
      ['cosmetica', 'sector:beauty_personal_care']
    ]

    for (const [candidate, expectedNodeId] of midCases) {
      expect(resolveCanonicalCategory({ industry: candidate }).nodeId).toBe(expectedNodeId)
    }

    // ...mientras que el enum estructurado sigue resolviendo al macro (bucket confiable).
    expect(resolveCanonicalCategory({ industry: 'AIRLINES_AVIATION' }).nodeId).toBe('industry:aviation')
    expect(resolveCanonicalCategory({ industry: 'RETAIL' }).nodeId).toBe('industry:retail')
  })
})
