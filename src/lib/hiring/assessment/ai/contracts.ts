// TASK-1361 — Assessment AI Assist: contratos puros (JSON Schema + sanitizers).
// El sanitizer es la FRONTERA de enforcement: valida+clampa la salida cruda del LLM y descarta lo
// malformado (espeja sanitizeBrandIntelligenceOutput del AEO grader). Ninguna IO acá.

import { QUESTION_LEVELS, QUESTION_TYPES } from '@/types/hiring-assessment'
import type { QuestionDraftProposal, ResponseScoreProposal } from '@/types/hiring-assessment-ai'

const MAX_PROMPT_LEN = 2000
const MAX_OPTION_LEN = 500
const MAX_OPTIONS = 8
const MAX_RATIONALE_LEN = 2000
const MAX_CRITERIA = 12

const clampStr = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const isLevel = (v: unknown): v is string => typeof v === 'string' && (QUESTION_LEVELS as readonly string[]).includes(v)
const isType = (v: unknown): v is string => typeof v === 'string' && (QUESTION_TYPES as readonly string[]).includes(v)

// ── Generación de preguntas ──

/** Salida cruda esperada del LLM para generación. `competencyKey`+`level` los inyecta el caller. */
export interface QuestionGenerationRawOutput {
  questions?: Array<{
    type?: unknown
    prompt?: unknown
    options?: unknown
    answerKey?: unknown
    rubric?: unknown
    note?: unknown
  }>
}

/** JSON Schema forzado en el structured call (Gemini responseJsonSchema / Anthropic inputSchema). */
export const QUESTION_GENERATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      maxItems: MAX_OPTIONS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'prompt'],
        properties: {
          type: { type: 'string', enum: [...QUESTION_TYPES] },
          prompt: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { id: { type: 'string' }, label: { type: 'string' } },
            },
          },
          answerKey: { type: 'object', additionalProperties: true },
          rubric: { type: 'object', additionalProperties: true },
          note: { type: 'string' },
        },
      },
    },
  },
} as const

/**
 * Valida+clampa los borradores generados. Inyecta competencyKey+level del contexto (el LLM no los
 * decide). Descarta drafts sin type válido o sin prompt. Devuelve [] si la forma es inservible.
 */
export const sanitizeQuestionDrafts = (
  raw: unknown,
  ctx: { competencyKey: string; level: string },
): QuestionDraftProposal[] => {
  if (!raw || typeof raw !== 'object') return []
  const questions = (raw as QuestionGenerationRawOutput).questions

  if (!Array.isArray(questions)) return []
  if (!isLevel(ctx.level)) return []

  const out: QuestionDraftProposal[] = []

  for (const q of questions.slice(0, MAX_OPTIONS)) {
    if (!q || typeof q !== 'object') continue
    if (!isType(q.type)) continue
    const prompt = clampStr(q.prompt, MAX_PROMPT_LEN)

    if (!prompt) continue

    const options = Array.isArray(q.options)
      ? q.options
          .slice(0, MAX_OPTIONS)
          .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === 'object')
          .map((o) => ({ id: clampStr(o.id, 64), label: clampStr(o.label, MAX_OPTION_LEN) }))
      : undefined

    out.push({
      competencyKey: ctx.competencyKey,
      level: ctx.level,
      type: q.type,
      prompt,
      options,
      answerKey: q.answerKey && typeof q.answerKey === 'object' && !Array.isArray(q.answerKey) ? (q.answerKey as Record<string, unknown>) : undefined,
      rubric: q.rubric && typeof q.rubric === 'object' && !Array.isArray(q.rubric) ? (q.rubric as Record<string, unknown>) : undefined,
      note: clampStr(q.note, MAX_OPTION_LEN) || undefined,
    })
  }

  return out
}

// ── Puntaje de respuesta ──

export interface ResponseScoreRawOutput {
  score?: unknown
  rationale?: unknown
  perCriterion?: unknown
}

/**
 * ESCALA DECLARADA de `perCriterion` (TASK-1734 delta 2026-08-17, prompt `...scoring.v2`).
 *
 * Cada criterio es un **APORTE PONDERADO** al score global, NO una nota independiente 0–100:
 * `weight` = puntos máximos que ese criterio puede aportar (los pesos suman 100) y `score` =
 * puntos efectivamente obtenidos (0..weight). Por construcción `Σ score ≈ score global`.
 *
 * Por qué explícito: el prompt v1 pedía "un `perCriterion` con el puntaje por criterio" y el
 * schema declaraba `score: 0–100` por criterio — dos lecturas válidas (aporte vs nota). El modelo
 * alternaba entre ambas según la calidad de la respuesta, y el consumidor downstream (risk router)
 * asumía la otra. Un contrato implícito no es un contrato: acá se declara, el prompt lo pide y el
 * sanitizer lo normaliza; nadie downstream vuelve a suponer.
 */
export const RESPONSE_SCORE_CRITERION_SCALE = 'weighted_contribution' as const

/** Total canónico de pesos de la rúbrica (escala 0–100 del score global). */
export const CRITERION_WEIGHT_TOTAL = 100

export const RESPONSE_SCORE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'rationale'],
  properties: {
    score: { type: 'number', minimum: 0, maximum: 100 },
    rationale: { type: 'string' },
    perCriterion: {
      type: 'array',
      maxItems: MAX_CRITERIA,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['criterion', 'weight', 'score'],
        properties: {
          criterion: { type: 'string' },
          weight: { type: 'number', minimum: 0, maximum: 100 },
          score: { type: 'number', minimum: 0, maximum: 100 },
          note: { type: 'string' },
        },
      },
    },
  },
} as const

const clampScore = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)

  if (!Number.isFinite(n)) return 0

  return Math.max(0, Math.min(100, n))
}

/**
 * Valida+clampa el puntaje propuesto. Devuelve null si no hay un score/rationale usable.
 *
 * `perCriterion` se normaliza a la escala DECLARADA (`RESPONSE_SCORE_CRITERION_SCALE`):
 * - `weight` ausente/inválido ⇒ reparto equitativo de `CRITERION_WEIGHT_TOTAL` entre los criterios
 *   (una rúbrica sin pesos explícitos pondera parejo — es la lectura que ya usan las rúbricas
 *   reales del banco: `"0-100 (25 puntos por criterio; parcial permitido)"`).
 * - `score` se clampa a `[0, weight]`: un APORTE no puede exceder su propio peso. Un modelo que
 *   devuelve una nota independiente 0–100 en un criterio de 25 puntos queda acotado acá, y la
 *   incoherencia resultante contra el score global la ve el risk router — no se cuela como sana.
 */
export const sanitizeResponseScore = (raw: unknown): ResponseScoreProposal | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as ResponseScoreRawOutput
  const rationale = clampStr(r.rationale, MAX_RATIONALE_LEN)

  if (typeof r.score !== 'number' && typeof r.score !== 'string') return null
  if (!rationale) return null

  const rawCriteria = Array.isArray(r.perCriterion)
    ? r.perCriterion
        .slice(0, MAX_CRITERIA)
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
        .filter((c) => clampStr(c.criterion, 200).length > 0)
    : null

  const defaultWeight = rawCriteria && rawCriteria.length > 0 ? CRITERION_WEIGHT_TOTAL / rawCriteria.length : 0

  const perCriterion = rawCriteria
    ? rawCriteria.map((c) => {
        const declaredWeight = typeof c.weight === 'number' && Number.isFinite(c.weight) && c.weight > 0
          ? Math.min(CRITERION_WEIGHT_TOTAL, c.weight)
          : defaultWeight

        return {
          criterion: clampStr(c.criterion, 200),
          weight: declaredWeight,
          score: Math.min(declaredWeight, clampScore(c.score)),
          note: clampStr(c.note, MAX_OPTION_LEN) || undefined,
        }
      })
    : undefined

  return { score: clampScore(r.score), rationale, perCriterion }
}

/** Agregado de la escala declarada — lo que el contrato GARANTIZA a los consumidores. */
export interface CriterionContributionSummary {
  /** Suma de aportes obtenidos. */
  contribution: number
  /** Suma de pesos declarados (normalmente `CRITERION_WEIGHT_TOTAL`). */
  weightTotal: number
  /**
   * Score global 0–100 que IMPLICAN los aportes, renormalizado por el total de pesos (una
   * rúbrica con pesos que no suman 100 sigue implicando un score comparable). `null` si no
   * hay criterios utilizables.
   */
  impliedScore: number | null
}

/**
 * Traduce `perCriterion` al score global que implica, según la escala declarada. Es la ÚNICA
 * forma soportada de comparar criterios contra el score global: ningún consumidor debe rederivar
 * la agregación (promedio, suma cruda, etc.) por su cuenta.
 */
export const summarizeCriterionContribution = (
  perCriterion: ResponseScoreProposal['perCriterion'],
): CriterionContributionSummary => {
  if (!perCriterion || perCriterion.length === 0) {
    return { contribution: 0, weightTotal: 0, impliedScore: null }
  }

  const contribution = perCriterion.reduce((acc, c) => acc + c.score, 0)

  const weightTotal = perCriterion.reduce(
    (acc, c) => acc + (typeof c.weight === 'number' && Number.isFinite(c.weight) && c.weight > 0 ? c.weight : 0),
    0,
  )

  // Sin pesos utilizables la suma YA está en escala 0–100 (reparto implícito de 100 puntos).
  const impliedScore = weightTotal > 0 ? (contribution / weightTotal) * CRITERION_WEIGHT_TOTAL : contribution

  return { contribution, weightTotal, impliedScore }
}
