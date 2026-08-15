/**
 * TASK-1664 Slice 0 — contratos puros: límites, validación de seeds y perfil de costo.
 *
 * El costo se prueba contra la fórmula publicada (task setup + filas), no contra números
 * mágicos sueltos: si cambia una tarifa, cambia UNA constante y estos tests siguen contando
 * la historia correcta.
 */
import { describe, expect, it } from 'vitest'

import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from '../../keyword-market-data'
import {
  DISCOVERY_STUCK_RUN_MINUTES,
  MAX_DISCOVERY_CANDIDATES_PER_RUN,
  MAX_DISCOVERY_ENRICHMENT_KEYWORDS,
  MAX_DISCOVERY_EXPANSION_METHODS,
  MAX_DISCOVERY_OVERVIEW_CALLS,
  MAX_DISCOVERY_PROVIDER_CALLS,
  MAX_DISCOVERY_RESULTS_PER_CALL,
  MAX_DISCOVERY_SEEDS,
  SEO_DISCOVERY_METHOD_ENDPOINTS,
  SEO_DISCOVERY_METHODS,
  estimateDiscoveryCost,
  validateSeedKeyword
} from '../contracts'

describe('límites del contrato V1', () => {
  it('fija los techos de la spec: 10 seeds, 3 métodos de expansión, 500 candidates, 200 enrichment, 30 llamadas', () => {
    expect(MAX_DISCOVERY_SEEDS).toBe(10)
    expect(MAX_DISCOVERY_EXPANSION_METHODS).toBe(3)
    expect(MAX_DISCOVERY_CANDIDATES_PER_RUN).toBe(500)
    expect(MAX_DISCOVERY_ENRICHMENT_KEYWORDS).toBe(200)
    expect(MAX_DISCOVERY_PROVIDER_CALLS).toBe(30)
    expect(DISCOVERY_STUCK_RUN_MINUTES).toBe(15)
  })

  it('el enriquecimiento a 200 keywords con lotes de 100 son exactamente 2 llamadas', () => {
    expect(MAX_DISCOVERY_OVERVIEW_CALLS).toBe(2)
  })

  it('el peor caso V1 (10 seeds × 2 métodos por-seed + ideas + dominio + 2 overview = 24) cabe en el techo de 30', () => {
    const estimate = estimateDiscoveryCost({
      seedCount: MAX_DISCOVERY_SEEDS,
      methods: [
        { method: 'keyword_suggestions', resultsPerCall: MAX_DISCOVERY_RESULTS_PER_CALL },
        { method: 'related_keywords', resultsPerCall: MAX_DISCOVERY_RESULTS_PER_CALL },
        { method: 'keyword_ideas', resultsPerCall: MAX_DISCOVERY_RESULTS_PER_CALL },
        { method: 'keywords_for_site', resultsPerCall: MAX_DISCOVERY_RESULTS_PER_CALL }
      ]
    })

    expect(estimate.providerCalls).toBe(24)
    expect(estimate.providerCalls).toBeLessThanOrEqual(MAX_DISCOVERY_PROVIDER_CALLS)
  })

  it('cada método mapea a un endpoint Labs bajo el prefijo de la familia', () => {
    for (const method of SEO_DISCOVERY_METHODS) {
      expect(SEO_DISCOVERY_METHOD_ENDPOINTS[method]).toMatch(/^\/v3\/dataforseo_labs\/google\//)
    }
  })
})

describe('validateSeedKeyword', () => {
  it('acepta una seed normal y conserva tildes como parte del texto', () => {
    expect(validateSeedKeyword('pintura para fachadas')).toEqual({ ok: true })
    expect(validateSeedKeyword('  pintura económica  ')).toEqual({ ok: true })
  })

  it('rechaza vacío, >80 caracteres y >10 palabras con razón tipada', () => {
    expect(validateSeedKeyword('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(validateSeedKeyword('a'.repeat(81))).toEqual({ ok: false, reason: 'too_long' })
    expect(validateSeedKeyword('uno dos tres cuatro cinco seis siete ocho nueve diez once')).toEqual({
      ok: false,
      reason: 'too_many_words'
    })
  })
})

describe('estimateDiscoveryCost', () => {
  it('una corrida GSC-only (sin métodos) tiene costo provider CERO', () => {
    const estimate = estimateDiscoveryCost({ seedCount: 10, methods: [] })

    expect(estimate.providerCalls).toBe(0)
    expect(estimate.requestedRows).toBe(0)
    expect(estimate.estimatedCostUsd).toBe(0)
  })

  it('sugerencias/relacionadas cuentan una llamada POR seed; ideas y dominio una por corrida', () => {
    const estimate = estimateDiscoveryCost({
      seedCount: 3,
      methods: [
        { method: 'keyword_suggestions', resultsPerCall: 50 },
        { method: 'keyword_ideas', resultsPerCall: 50 }
      ],
      enrichmentKeywords: 0
    })

    // 3 llamadas de sugerencias + 1 de ideas.
    expect(estimate.providerCalls).toBe(4)
    expect(estimate.requestedRows).toBe(3 * 50 + 50)
  })

  it('aplica la fórmula publicada: setup por llamada + costo por fila solicitada', () => {
    const estimate = estimateDiscoveryCost({
      seedCount: 1,
      methods: [{ method: 'keyword_suggestions', resultsPerCall: 10 }],
      enrichmentKeywords: 10
    })

    // 1 llamada de sugerencias + 1 de overview (10 faltantes caben en un lote).
    const expected = 2 * LABS_TASK_SETUP_USD + 20 * LABS_RESULT_ROW_USD

    expect(estimate.providerCalls).toBe(2)
    expect(estimate.estimatedCostUsd).toBeCloseTo(expected, 6)
    expect(estimate.formula).toContain('task setup')
  })

  it('clampea el limit por llamada al máximo del contrato (100)', () => {
    const estimate = estimateDiscoveryCost({
      seedCount: 1,
      methods: [{ method: 'related_keywords', resultsPerCall: 900 }],
      enrichmentKeywords: 0
    })

    expect(estimate.requestedRows).toBe(MAX_DISCOVERY_RESULTS_PER_CALL)
  })

  it('el enriquecimiento no aplica cuando no hay expansión que produzca candidatos', () => {
    const estimate = estimateDiscoveryCost({ seedCount: 5, methods: [], enrichmentKeywords: 200 })

    expect(estimate.providerCalls).toBe(0)
    expect(estimate.estimatedCostUsd).toBe(0)
  })
})
