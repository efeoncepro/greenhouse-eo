/**
 * TASK-1136 — núcleo PURO de evaluación de retrieval (sin IO, testeable).
 *
 * Lo consumen los runners offline `scripts/knowledge/retrieval-eval.ts` (baseline
 * FTS / FTS+rerank) y `scripts/knowledge/hybrid-shadow-eval.ts` (brazo vector/híbrido).
 * Single source of truth de: scoring de las golden questions, taxonomía de fallas,
 * MRR, cosine y la fusión RRF. No toca el contrato `knowledge-search.v1` ni el SSOT
 * `searchKnowledge`; solo MIDE su salida (y la del prototipo) contra el set golden.
 *
 * Decisión de fusión = RRF (Reciprocal Rank Fusion). Robusto sin tuning de escalas
 * heterogéneas: `ts_rank` (FTS) y cosine (vector) viven en rangos distintos; RRF
 * fusiona por POSICIÓN, no por magnitud → no requiere normalización frágil.
 */

import { KNOWLEDGE_CONFIDENCE_RANK, type KnowledgeGoldenQuestion } from './golden-questions'
// Fusión/vector math vive en `retrieval-fusion.ts` (pura, cero deps) para que el SSOT de
// runtime pueda importarla sin arrastrar las golden questions. Re-export por compat.
export { cosineSimilarity, RRF_K, rrfFuse } from './retrieval-fusion'
import type { KnowledgeSearchConfidence } from './types'

// ── Taxonomía de fallas (Slice 1) ───────────────────────────────────────────
export type RetrievalFailureClass =
  | 'lexical_miss' // el doc correcto NO apareció pero sí hubo resultados (FTS no lo encontró léxicamente)
  | 'wrong_source' // doc correcto presente pero no primero, o se devolvió un doc prohibido
  | 'cross_doc_miss' // no se cruzaron los ≥N documentos esperados
  | 'corpus_gap' // el doc correcto NO apareció y cero resultados (no está en el corpus / no-answer indebido)
  | 'no_answer_violation' // se esperaba no-answer y el retrieval respondió (riesgo clásico del vector)
  | 'low_confidence' // contenido correcto pero confianza bajo el mínimo
  | 'denied_preservation' // no se preservó el conteo de denegados por política
  | 'none'

export interface RetrievalEvalResultInput {
  /** Títulos de los chunks en el ORDEN final del arm (post-rerank/fusión). */
  orderedTitles: string[]
  /** documentId de los chunks en el mismo orden (para cross-doc). */
  orderedDocIds: string[]
  confidence: KnowledgeSearchConfidence
  deniedOrFilteredCount: number
}

export interface RetrievalCheck {
  name: string
  applicable: boolean
  passed: boolean
  detail?: string
}

export interface RetrievalQuestionEval {
  id: string
  mode: KnowledgeGoldenQuestion['mode']
  passed: boolean
  failureClass: RetrievalFailureClass
  checks: RetrievalCheck[]
  /** Rank 1-based del primer título que satisface `expectAnyTitleIncludes` (0 si no aplica/ausente). */
  firstRelevantRank: number
}

const includesCI = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase())

const firstMatchRank = (titles: string[], needle: string): number => {
  const idx = titles.findIndex(t => includesCI(t, needle))

  return idx === -1 ? 0 : idx + 1
}

/**
 * Evalúa una golden question contra el resultado de un arm. Determinista.
 * `passed` = todas las aserciones APLICABLES pasaron.
 */
export const evaluateGoldenQuestion = (
  question: KnowledgeGoldenQuestion,
  result: RetrievalEvalResultInput
): RetrievalQuestionEval => {
  const { orderedTitles, orderedDocIds } = result
  const checks: RetrievalCheck[] = []

  const recallMatch = question.expectAnyTitleIncludes
    ? orderedTitles.some(t => includesCI(t, question.expectAnyTitleIncludes!))
    : true

  const firstRelevantRank = question.expectAnyTitleIncludes
    ? firstMatchRank(orderedTitles, question.expectAnyTitleIncludes)
    : 0

  // recall
  checks.push({
    name: 'recall',
    applicable: Boolean(question.expectAnyTitleIncludes),
    passed: recallMatch,
    detail: question.expectAnyTitleIncludes
  })

  // first-hit (precision@1)
  const firstHitPass = question.expectFirstTitleIncludes
    ? includesCI(orderedTitles[0] ?? '', question.expectFirstTitleIncludes)
    : true

  checks.push({
    name: 'firstHit',
    applicable: Boolean(question.expectFirstTitleIncludes),
    passed: firstHitPass,
    detail: question.expectFirstTitleIncludes
  })

  // cross-doc
  const distinctDocs = new Set(orderedDocIds).size

  const crossDocPass =
    typeof question.expectDistinctDocumentsAtLeast === 'number'
      ? distinctDocs >= question.expectDistinctDocumentsAtLeast
      : true

  checks.push({
    name: 'crossDoc',
    applicable: typeof question.expectDistinctDocumentsAtLeast === 'number',
    passed: crossDocPass,
    detail: typeof question.expectDistinctDocumentsAtLeast === 'number' ? `>=${question.expectDistinctDocumentsAtLeast}, got ${distinctDocs}` : undefined
  })

  // wrong-source guard
  const wrongSourcePass = question.mustNotReturnTitleIncludes
    ? !orderedTitles.some(t => includesCI(t, question.mustNotReturnTitleIncludes!))
    : true

  checks.push({
    name: 'wrongSourceGuard',
    applicable: Boolean(question.mustNotReturnTitleIncludes),
    passed: wrongSourcePass,
    detail: question.mustNotReturnTitleIncludes
  })

  // no-answer honesty
  const noAnswerPass = question.expectNoAnswer
    ? result.confidence === 'none' && orderedTitles.length === 0
    : true

  checks.push({
    name: 'noAnswer',
    applicable: Boolean(question.expectNoAnswer),
    passed: noAnswerPass
  })

  // min confidence
  const minConfPass = question.expectMinConfidence
    ? KNOWLEDGE_CONFIDENCE_RANK[result.confidence] >= KNOWLEDGE_CONFIDENCE_RANK[question.expectMinConfidence]
    : true

  checks.push({
    name: 'minConfidence',
    applicable: Boolean(question.expectMinConfidence),
    passed: minConfPass,
    detail: question.expectMinConfidence
  })

  // denied preservation
  const deniedPass =
    typeof question.expectDeniedAtLeast === 'number'
      ? result.deniedOrFilteredCount >= question.expectDeniedAtLeast
      : true

  checks.push({
    name: 'deniedPreserved',
    applicable: typeof question.expectDeniedAtLeast === 'number',
    passed: deniedPass
  })

  const passed = checks.filter(c => c.applicable).every(c => c.passed)

  return {
    id: question.id,
    mode: question.mode,
    passed,
    failureClass: passed ? 'none' : classifyFailure(question, result, { recallMatch, firstHitPass, crossDocPass, wrongSourcePass, noAnswerPass, minConfPass, deniedPass }),
    checks,
    firstRelevantRank
  }
}

interface CheckOutcomes {
  recallMatch: boolean
  firstHitPass: boolean
  crossDocPass: boolean
  wrongSourcePass: boolean
  noAnswerPass: boolean
  minConfPass: boolean
  deniedPass: boolean
}

/**
 * Clasifica la primera causa de falla en una taxonomía cerrada (Slice 1). Orden de
 * prioridad: violaciones de seguridad/contrato primero (no-answer, wrong-source),
 * luego recall, luego cross-doc, luego confianza/denegados.
 */
export const classifyFailure = (
  question: KnowledgeGoldenQuestion,
  result: RetrievalEvalResultInput,
  outcomes: CheckOutcomes
): RetrievalFailureClass => {
  if (question.expectNoAnswer && !outcomes.noAnswerPass) {
    return 'no_answer_violation'
  }

  if (question.mustNotReturnTitleIncludes && !outcomes.wrongSourcePass) {
    return 'wrong_source'
  }

  // recall fallida: distinguir corpus_gap (cero resultados) de lexical_miss (hubo otros)
  if (question.expectAnyTitleIncludes && !outcomes.recallMatch) {
    return result.orderedTitles.length === 0 ? 'corpus_gap' : 'lexical_miss'
  }

  // doc correcto presente pero no primero
  if (question.expectFirstTitleIncludes && !outcomes.firstHitPass) {
    return 'wrong_source'
  }

  if (typeof question.expectDistinctDocumentsAtLeast === 'number' && !outcomes.crossDocPass) {
    return 'cross_doc_miss'
  }

  if (question.expectMinConfidence && !outcomes.minConfPass) {
    return 'low_confidence'
  }

  if (typeof question.expectDeniedAtLeast === 'number' && !outcomes.deniedPass) {
    return 'denied_preservation'
  }

  return 'none'
}

// ── Métricas agregadas ───────────────────────────────────────────────────────
export interface RetrievalArmMetrics {
  total: number
  passed: number
  passRate: number
  /** MRR sobre las preguntas con `expectAnyTitleIncludes` (recall set). */
  mrr: number
  recallRate: number
  firstHitRate: number
  crossDocRate: number
  wrongSourceViolations: number
  noAnswerCorrect: number
  noAnswerTotal: number
  failureClassCounts: Record<RetrievalFailureClass, number>
}

const emptyFailureCounts = (): Record<RetrievalFailureClass, number> => ({
  lexical_miss: 0,
  wrong_source: 0,
  cross_doc_miss: 0,
  corpus_gap: 0,
  no_answer_violation: 0,
  low_confidence: 0,
  denied_preservation: 0,
  none: 0
})

export const aggregateArmMetrics = (
  evals: RetrievalQuestionEval[],
  questions: KnowledgeGoldenQuestion[]
): RetrievalArmMetrics => {
  const byId = new Map(questions.map(q => [q.id, q]))
  const failureClassCounts = emptyFailureCounts()

  let passed = 0
  let recallApplicable = 0
  let recallHit = 0
  let firstHitApplicable = 0
  let firstHitOk = 0
  let crossDocApplicable = 0
  let crossDocOk = 0
  let wrongSourceViolations = 0
  let noAnswerTotal = 0
  let noAnswerCorrect = 0
  let rrSum = 0
  let rrCount = 0

  for (const e of evals) {
    if (e.passed) passed += 1
    failureClassCounts[e.failureClass] += 1

    const q = byId.get(e.id)

    if (!q) continue

    if (q.expectAnyTitleIncludes) {
      recallApplicable += 1
      const recallCheck = e.checks.find(c => c.name === 'recall')

      if (recallCheck?.passed) recallHit += 1
      rrCount += 1
      rrSum += e.firstRelevantRank > 0 ? 1 / e.firstRelevantRank : 0
    }

    if (q.expectFirstTitleIncludes) {
      firstHitApplicable += 1
      if (e.checks.find(c => c.name === 'firstHit')?.passed) firstHitOk += 1
    }

    if (typeof q.expectDistinctDocumentsAtLeast === 'number') {
      crossDocApplicable += 1
      if (e.checks.find(c => c.name === 'crossDoc')?.passed) crossDocOk += 1
    }

    if (q.mustNotReturnTitleIncludes && !(e.checks.find(c => c.name === 'wrongSourceGuard')?.passed)) {
      wrongSourceViolations += 1
    }

    if (q.expectNoAnswer) {
      noAnswerTotal += 1
      if (e.checks.find(c => c.name === 'noAnswer')?.passed) noAnswerCorrect += 1
    }
  }

  const ratio = (num: number, den: number) => (den === 0 ? 1 : num / den)

  return {
    total: evals.length,
    passed,
    passRate: ratio(passed, evals.length),
    mrr: rrCount === 0 ? 0 : rrSum / rrCount,
    recallRate: ratio(recallHit, recallApplicable),
    firstHitRate: ratio(firstHitOk, firstHitApplicable),
    crossDocRate: ratio(crossDocOk, crossDocApplicable),
    wrongSourceViolations,
    noAnswerCorrect,
    noAnswerTotal,
    failureClassCounts
  }
}

// `cosineSimilarity`, `RRF_K` y `rrfFuse` viven en `retrieval-fusion.ts` (pura, cero deps)
// y se re-exportan arriba — el SSOT de runtime las importa de ahí sin arrastrar fixtures.
