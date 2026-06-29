/**
 * TASK-1271 — Growth AI Visibility · Prose Extraction · Eval/cost harness.
 *
 * Compara un proveedor de extracción de prosa contra los fixtures metodológicos:
 * exactitud de `sentimentLabel`, false positives (sentimiento de marca inventado
 * desde tono general), false negatives (juicio claro tratado como `unknown`),
 * preservación de `unknown`, drift no-vacío sólo con evidencia, schema-valid rate,
 * latencia y costo estimado por extracción.
 *
 * Provider-injectable: `runOne` puede ser el router real (`runProseExtraction` con
 * provider forzado) en el CLI/staging, o un fake en tests. El scoring es PURO.
 *
 * El cutover es EVIDENCIA-FIRST: no basta con que un proveedor sea más barato; debe
 * mantener exactitud aceptable y degradar honesto (preservar `unknown`).
 */

import { type ProseExtractionResult } from '../normalization/prose-extraction/contracts'
import { type ProseEvalCase } from './prose-extraction-methodology-fixtures'

/** Ejecuta una extracción para un caso. Devuelve el resultado del router (fields + metadata). */
export type ProseEvalRunOne = (input: {
  excerpt: string
  subjectBrand: string
  subjectDomain: string | null
  maxTokens: number
}) => Promise<ProseExtractionResult>

export interface ProseEvalCaseResult {
  id: string
  status: ProseExtractionResult['metadata']['status']
  schemaValid: boolean
  sentimentExpected: ProseEvalCase['expected']['sentimentLabel']
  sentimentActual: string | null
  sentimentMatch: boolean
  /** Provider emitió positive/negative cuando el caso solo tenía tono general → unknown/neutral. */
  falsePositive: boolean
  /** Provider emitió unknown cuando había un juicio claro (positive/negative/mixed). */
  falseNegative: boolean
  /** Caso esperaba unknown y el provider lo preservó. */
  unknownPreserved: boolean
  driftExpected: boolean
  driftActual: boolean
  driftMatch: boolean
  latencyMs: number
  costUsd: number
}

export interface ProseEvalReport {
  total: number
  schemaValid: number
  schemaValidRate: number
  sentimentMatches: number
  sentimentAccuracy: number
  falsePositives: number
  falseNegatives: number
  unknownExpected: number
  unknownPreserved: number
  unknownPreservationRate: number
  driftMatches: number
  avgLatencyMs: number
  totalCostUsd: number
  results: ProseEvalCaseResult[]
}

const POSITIVE_OR_NEGATIVE = new Set(['positive', 'negative'])
const CLEAR_JUDGMENT = new Set(['positive', 'negative', 'mixed'])

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4))

/**
 * Corre la eval de prosa para un set de casos contra `runOne`. ASYNC pero el
 * scoring por caso es determinista. No lanza por caso: un fallo del proveedor se
 * registra como `schemaValid=false` y no cuenta como sentiment match.
 */
export const runProseExtractionEval = async (
  cases: readonly ProseEvalCase[],
  runOne: ProseEvalRunOne
): Promise<ProseEvalReport> => {
  const results: ProseEvalCaseResult[] = []

  for (const evalCase of cases) {
    const { fields, metadata } = await runOne({
      excerpt: evalCase.input.excerpt,
      subjectBrand: evalCase.input.subjectBrand,
      subjectDomain: evalCase.input.subjectDomain,
      maxTokens: 1024
    })

    const schemaValid = fields !== null
    const sentimentActual = fields ? fields.sentimentLabel : null
    const expected = evalCase.expected.sentimentLabel
    const sentimentMatch = schemaValid && sentimentActual === expected

    const falsePositive =
      schemaValid &&
      (expected === 'unknown' || expected === 'neutral') &&
      POSITIVE_OR_NEGATIVE.has(sentimentActual ?? '')

    const falseNegative = schemaValid && CLEAR_JUDGMENT.has(expected) && sentimentActual === 'unknown'

    const unknownPreserved = expected === 'unknown' && sentimentActual === 'unknown'

    const driftActual = schemaValid ? fields.messageDriftClaims.length > 0 : false
    const driftMatch = schemaValid && driftActual === evalCase.expected.driftExpected

    results.push({
      id: evalCase.id,
      status: metadata.status,
      schemaValid,
      sentimentExpected: expected,
      sentimentActual,
      sentimentMatch,
      falsePositive,
      falseNegative,
      unknownPreserved,
      driftExpected: evalCase.expected.driftExpected,
      driftActual,
      driftMatch,
      latencyMs: metadata.latencyMs,
      costUsd: metadata.costEstimateUsd
    })
  }

  const schemaValid = results.filter(r => r.schemaValid).length
  const sentimentMatches = results.filter(r => r.sentimentMatch).length
  const unknownExpected = results.filter(r => r.sentimentExpected === 'unknown').length
  const unknownPreserved = results.filter(r => r.unknownPreserved).length
  const totalCostUsd = Number(results.reduce((sum, r) => sum + r.costUsd, 0).toFixed(6))

  const avgLatencyMs =
    results.length === 0 ? 0 : Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length)

  return {
    total: results.length,
    schemaValid,
    schemaValidRate: ratio(schemaValid, results.length),
    sentimentMatches,
    sentimentAccuracy: ratio(sentimentMatches, results.length),
    falsePositives: results.filter(r => r.falsePositive).length,
    falseNegatives: results.filter(r => r.falseNegative).length,
    unknownExpected,
    unknownPreserved,
    unknownPreservationRate: ratio(unknownPreserved, unknownExpected),
    driftMatches: results.filter(r => r.driftMatch).length,
    avgLatencyMs,
    totalCostUsd,
    results
  }
}
