import 'server-only'

import { createHash } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { AiProposal, ResponseScoreProposal } from '@/types/hiring-assessment-ai'
import { HUMAN_RATED_QUESTION_TYPES } from '@/types/hiring-assessment'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { HIRING_ASSESSMENT_SCORING_PROMPT_VERSION, isHiringAssessmentAiEnabled } from './config'
import { createAiProposal } from './proposal-store'
import { runResponseScoring } from './providers'

export interface ProposeScoreResult {
  proposal: AiProposal | null
  suggested: ResponseScoreProposal | null
  status: 'ok' | 'not_configured' | 'provider_error' | 'schema_invalid'
  provider: string
  model: string
}

const MAX_ANSWER_CHARS = 6000

/**
 * Extrae SOLO el texto de la respuesta para mandar al LLM (allowlist anti-PII: nunca identity docs
 * ni el objeto crudo entero). Toma `answer.text` si es string; si no, serializa el objeto acotado.
 */
const extractAnswerText = (answer: Record<string, unknown>): string => {
  if (typeof answer.text === 'string') return answer.text.slice(0, MAX_ANSWER_CHARS)
  if (typeof answer.value === 'string') return answer.value.slice(0, MAX_ANSWER_CHARS)

  return JSON.stringify(answer).slice(0, MAX_ANSWER_CHARS)
}

type ScoreContextRow = {
  answer_json: unknown
  question_prompt: unknown
  rubric_json: unknown
  question_type: unknown
  competency_key: unknown
  competency_name: unknown
  level: unknown
}

/**
 * TASK-1361 — SUGIERE (no aplica) un puntaje para una respuesta abierta/situacional. Persiste un
 * `response_score` en el ledger; el score canónico solo se aplica vía confirmAiProposal → recordHumanScore
 * (el humano fija el valor). El LLM NUNCA escribe `human_score`. Solo aplica a tipos human-rated
 * (los objetivos ya se auto-scorean). Flag-gated + honest-degrade.
 */
export const proposeScoreForResponse = async (
  responseId: string,
  actorUserId: string | null,
): Promise<ProposeScoreResult> => {
  if (!isHiringAssessmentAiEnabled()) {
    throw new HiringValidationError('La asistencia de IA de evaluación está deshabilitada.', 'assessment_ai_disabled', 409)
  }

  const rows = await runGreenhousePostgresQuery<ScoreContextRow>(
    `SELECT r.answer_json, q.prompt AS question_prompt, q.rubric_json, q.type AS question_type,
            c.key AS competency_key, c.name AS competency_name, q.level
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
      WHERE r.response_id = $1`,
    [responseId],
  )

  const ctx = rows[0]

  if (!ctx) {
    throw new HiringNotFoundError('La respuesta no existe o no tiene pregunta asociada.', 'assessment_response_not_found')
  }

  const questionType = String(ctx.question_type)

  if (!(HUMAN_RATED_QUESTION_TYPES as readonly string[]).includes(questionType)) {
    throw new HiringValidationError(
      'Solo se puede sugerir puntaje para respuestas abiertas o situacionales (las objetivas se auto-corrigen).',
      'assessment_ai_not_scorable',
      422,
      { questionType },
    )
  }

  const answer = (ctx.answer_json ?? {}) as Record<string, unknown>
  const rubric = (ctx.rubric_json ?? {}) as Record<string, unknown>

  const scoring = await runResponseScoring({
    competencyKey: String(ctx.competency_key),
    competencyName: String(ctx.competency_name),
    level: String(ctx.level),
    questionPrompt: String(ctx.question_prompt),
    rubric,
    candidateAnswer: extractAnswerText(answer),
  })

  if (scoring.status !== 'ok' || !scoring.score) {
    return { proposal: null, suggested: null, status: scoring.status, provider: scoring.provider, model: scoring.model }
  }

  // input_digest sobre pregunta+respuesta (hash, NUNCA la PII cruda) para trazabilidad/idempotencia.
  const inputDigest = createHash('sha256')
    .update(`${responseId}|${String(ctx.question_prompt)}|${extractAnswerText(answer)}`)
    .digest('hex')

  const proposal = await createAiProposal(
    {
      kind: 'response_score',
      targetRef: responseId,
      proposed: scoring.score as unknown as Record<string, unknown>,
      provider: scoring.provider,
      model: scoring.model,
      promptVersion: HIRING_ASSESSMENT_SCORING_PROMPT_VERSION,
      inputDigest,
      usage: scoring.usage,
    },
    actorUserId,
  )

  return { proposal, suggested: scoring.score, status: 'ok', provider: scoring.provider, model: scoring.model }
}
