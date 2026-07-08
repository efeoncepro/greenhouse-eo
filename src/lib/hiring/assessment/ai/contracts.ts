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
        required: ['criterion', 'score'],
        properties: {
          criterion: { type: 'string' },
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

/** Valida+clampa el puntaje propuesto. Devuelve null si no hay un score/rationale usable. */
export const sanitizeResponseScore = (raw: unknown): ResponseScoreProposal | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as ResponseScoreRawOutput
  const rationale = clampStr(r.rationale, MAX_RATIONALE_LEN)

  if (typeof r.score !== 'number' && typeof r.score !== 'string') return null
  if (!rationale) return null

  const perCriterion = Array.isArray(r.perCriterion)
    ? r.perCriterion
        .slice(0, MAX_CRITERIA)
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
        .map((c) => ({ criterion: clampStr(c.criterion, 200), score: clampScore(c.score), note: clampStr(c.note, MAX_OPTION_LEN) || undefined }))
        .filter((c) => c.criterion.length > 0)
    : undefined

  return { score: clampScore(r.score), rationale, perCriterion }
}
