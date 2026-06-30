import { describe, expect, it } from 'vitest'

import { runProseExtractionEval, type ProseEvalRunOne } from '@/lib/growth/ai-visibility/evals/prose-extraction-eval'
import {
  PROSE_EXTRACTION_METHODOLOGY_FIXTURES,
  type ProseEvalCase
} from '@/lib/growth/ai-visibility/evals/prose-extraction-methodology-fixtures'
import {
  PROSE_EXTRACTION_VERSION,
  type ProseExtractionFields,
  type ProseExtractionResult
} from '@/lib/growth/ai-visibility/normalization/prose-extraction/contracts'

const okResult = (fields: ProseExtractionFields, costUsd = 0.001): ProseExtractionResult => ({
  fields,
  metadata: {
    providerId: 'gemini',
    model: 'fake',
    version: PROSE_EXTRACTION_VERSION,
    status: 'ok',
    costEstimateUsd: costUsd,
    latencyMs: 100,
    usage: { inputTokens: 100, outputTokens: 10 }
  }
})

const baseFields = (sentimentLabel: ProseExtractionFields['sentimentLabel']): ProseExtractionFields => ({
  brandMentioned: 'yes',
  sentimentLabel,
  sentimentScore: null,
  categoryAssociations: [],
  messageDriftClaims: [],
  confidence: 0.7
})

const cases: ProseEvalCase[] = [
  { id: 'fp', input: { excerpt: 'x', subjectBrand: 'B', subjectDomain: null }, expected: { sentimentLabel: 'unknown', driftExpected: false, note: '' } },
  { id: 'pos', input: { excerpt: 'x', subjectBrand: 'B', subjectDomain: null }, expected: { sentimentLabel: 'positive', driftExpected: false, note: '' } },
  { id: 'fn', input: { excerpt: 'x', subjectBrand: 'B', subjectDomain: null }, expected: { sentimentLabel: 'negative', driftExpected: false, note: '' } }
]

describe('runProseExtractionEval — scoring (PURO, fake provider)', () => {
  it('detecta false positive (tono general → unknown esperado, provider dice positive)', async () => {
    const runOne: ProseEvalRunOne = async () => okResult(baseFields('positive'))

    const report = await runProseExtractionEval([cases[0]], runOne)

    expect(report.falsePositives).toBe(1)
    expect(report.unknownPreservationRate).toBe(0)
    expect(report.sentimentAccuracy).toBe(0)
  })

  it('detecta false negative (juicio claro → provider dice unknown)', async () => {
    const runOne: ProseEvalRunOne = async () => okResult(baseFields('unknown'))

    const report = await runProseExtractionEval([cases[2]], runOne)

    expect(report.falseNegatives).toBe(1)
  })

  it('preserva unknown + acierta positive/negative cuando el provider clasifica bien', async () => {
    // Los casos comparten excerpt; el fake devuelve la etiqueta esperada de cada caso en orden.
    const perfectLabels: ProseExtractionFields['sentimentLabel'][] = ['unknown', 'positive', 'negative']
    let idx = 0
    const runOne: ProseEvalRunOne = async () => okResult(baseFields(perfectLabels[idx++]))

    const report = await runProseExtractionEval(cases, runOne)

    expect(report.sentimentAccuracy).toBe(1)
    expect(report.falsePositives).toBe(0)
    expect(report.falseNegatives).toBe(0)
    expect(report.unknownPreservationRate).toBe(1)
    expect(report.totalCostUsd).toBeGreaterThan(0)
  })

  it('fallo del proveedor (fields null) → schemaValid=false, no cuenta como match', async () => {
    const runOne: ProseEvalRunOne = async () => ({
      fields: null,
      metadata: {
        providerId: 'gemini',
        model: null,
        version: PROSE_EXTRACTION_VERSION,
        status: 'provider_error',
        costEstimateUsd: 0,
        latencyMs: 50,
        usage: null
      }
    })

    const report = await runProseExtractionEval(cases, runOne)

    expect(report.schemaValid).toBe(0)
    expect(report.schemaValidRate).toBe(0)
    expect(report.sentimentMatches).toBe(0)
  })

  it('drift match cuando el provider emite drift donde se espera', async () => {
    const driftCase: ProseEvalCase = {
      id: 'drift',
      input: { excerpt: 'x', subjectBrand: 'B', subjectDomain: null },
      expected: { sentimentLabel: 'neutral', driftExpected: true, note: '' }
    }

    const runOne: ProseEvalRunOne = async () =>
      okResult({ ...baseFields('neutral'), messageDriftClaims: ['narrativa genérica'] })

    const report = await runProseExtractionEval([driftCase], runOne)

    expect(report.driftMatches).toBe(1)
  })

  it('los fixtures metodológicos cubren los 5 outcomes de sentiment + drift', () => {
    const labels = new Set(PROSE_EXTRACTION_METHODOLOGY_FIXTURES.map(f => f.expected.sentimentLabel))

    expect(labels.has('unknown')).toBe(true)
    expect(labels.has('positive')).toBe(true)
    expect(labels.has('negative')).toBe(true)
    expect(labels.has('mixed')).toBe(true)
    expect(labels.has('neutral')).toBe(true)
    expect(PROSE_EXTRACTION_METHODOLOGY_FIXTURES.some(f => f.expected.driftExpected)).toBe(true)
  })
})
