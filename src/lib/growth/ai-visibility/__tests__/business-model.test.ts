import { describe, expect, it } from 'vitest'

import {
  CATEGORY_HEURISTIC_CONFIDENCE,
  GROUNDED_BUSINESS_MODEL_MIN_CONFIDENCE,
  UNKNOWN_BUSINESS_MODEL,
  classifyBusinessModel
} from '../taxonomy'

describe('growth/ai-visibility — classifyBusinessModel (deterministic spine)', () => {
  it('deriva por arquetipo desde la categoría canónica (no solo agencias)', () => {
    const cases: Array<[string, string]> = [
      ['sector:passenger_airlines', 'consumer_b2c'], // SKY — el caso que destapó ISSUE-110
      ['industry:aviation', 'consumer_b2c'],
      ['industry:automotive', 'consumer_b2c'],
      ['industry:telecommunications', 'consumer_b2c'],
      ['sector:supermarkets_grocery', 'consumer_b2c'],
      ['sector:b2b_saas', 'b2b_product_saas'],
      ['sector:martech', 'b2b_product_saas'],
      ['industry:marketing_communications', 'b2b_service_provider'], // el ICP histórico de Efeonce
      ['sector:creative_agency', 'b2b_service_provider'],
      ['sector:ecommerce_marketplaces', 'retail_ecommerce'],
      ['category:marketplace_platform', 'marketplace'],
      ['industry:government', 'public_institution']
    ]

    for (const [categoryNodeId, expected] of cases) {
      const result = classifyBusinessModel({ categoryNodeId })

      expect(result.businessModel, categoryNodeId).toBe(expected)
      expect(result.source, categoryNodeId).toBe('category_heuristic')
      expect(result.confidence, categoryNodeId).toBe(CATEGORY_HEURISTIC_CONFIDENCE)
    }
  })

  it('ABSTIENE (unknown) en macros ambiguas — NUNCA defaultea a agencia', () => {
    // industry:manufacturing puede ser industrial B2B o bienes de consumo (Grupo Berel: pinturas).
    // industry:finance puede ser banco de personas o fintech B2B. La heurística no adivina.
    for (const categoryNodeId of [
      'industry:manufacturing',
      'industry:finance',
      'industry:healthcare',
      'industry:technology',
      'industry:education',
      'industry:energy',
      'industry:real_estate'
    ]) {
      const result = classifyBusinessModel({ categoryNodeId })

      expect(result.businessModel, categoryNodeId).toBe(UNKNOWN_BUSINESS_MODEL)
      expect(result.source, categoryNodeId).toBe('unknown')
    }
  })

  it('el candidato grounded confiable gana sobre la heurística de categoría', () => {
    // Berel: category=industry:manufacturing (heurística → unknown) pero el grounded read
    // entiende que vende pinturas a consumidores → consumer_b2c.
    const result = classifyBusinessModel({
      categoryNodeId: 'industry:manufacturing',
      groundedCandidate: { businessModel: 'consumer_b2c', confidence: 0.82 }
    })

    expect(result.businessModel).toBe('consumer_b2c')
    expect(result.source).toBe('brand_intelligence')
    expect(result.confidence).toBe(0.82)
  })

  it('un grounded poco confiable NO gana — cae a la heurística de categoría', () => {
    const result = classifyBusinessModel({
      categoryNodeId: 'sector:b2b_saas',
      groundedCandidate: { businessModel: 'consumer_b2c', confidence: GROUNDED_BUSINESS_MODEL_MIN_CONFIDENCE - 0.1 }
    })

    expect(result.businessModel).toBe('b2b_product_saas')
    expect(result.source).toBe('category_heuristic')
  })

  it('un grounded `unknown` NO gana aunque venga con confianza — cae a la cascada', () => {
    const result = classifyBusinessModel({
      categoryNodeId: 'sector:passenger_airlines',
      groundedCandidate: { businessModel: 'unknown', confidence: 0.95 }
    })

    expect(result.businessModel).toBe('consumer_b2c')
    expect(result.source).toBe('category_heuristic')
  })

  it('sin señales (sin grounded, sin categoría) → unknown honesto', () => {
    const result = classifyBusinessModel({})

    expect(result.businessModel).toBe(UNKNOWN_BUSINESS_MODEL)
    expect(result.source).toBe('unknown')
    expect(result.confidence).toBe(0)
  })

  it('una categoría desconocida/no-nodo → unknown (no rompe)', () => {
    const result = classifyBusinessModel({ categoryNodeId: 'unknown' })

    expect(result.businessModel).toBe(UNKNOWN_BUSINESS_MODEL)
    expect(result.source).toBe('unknown')
  })
})
