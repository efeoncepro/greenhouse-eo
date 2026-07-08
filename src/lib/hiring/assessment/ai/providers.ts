import 'server-only'

import { generateStructuredAnthropic, isAnthropicConfigured } from '@/lib/ai/anthropic'
import { generateStructuredGemini, isGeminiConfigured } from '@/lib/ai/google-genai'
import { captureWithDomain } from '@/lib/observability/capture'
import type { QuestionDraftProposal, ResponseScoreProposal } from '@/types/hiring-assessment-ai'

import {
  HIRING_ASSESSMENT_GENERATION_DEFAULT_MODEL,
  HIRING_ASSESSMENT_GENERATION_PROVIDER,
  HIRING_ASSESSMENT_SCORING_PROVIDER,
  getHiringAssessmentGenerationModel,
  getHiringAssessmentScoringModel,
} from './config'
import {
  QUESTION_GENERATION_JSON_SCHEMA,
  RESPONSE_SCORE_JSON_SCHEMA,
  sanitizeQuestionDrafts,
  sanitizeResponseScore,
} from './contracts'
import {
  RESPONSE_SCORE_SYSTEM_PROMPT,
  buildQuestionGenPrompt,
  buildResponseScorePrompt,
  type QuestionGenPromptInput,
  type ScorePromptInput,
} from './prompt'
import { QUESTION_GEN_SYSTEM_PROMPT } from './prompt'

// El adapter es honest-degrading: NUNCA throwea al caller. Devuelve status + datos o vacío/null.
// Espeja el router del AEO grader (fields=null en fallo → el caller degrada honesto).

export interface GenerationResult {
  drafts: QuestionDraftProposal[]
  provider: string
  model: string
  usage: Record<string, unknown>
  status: 'ok' | 'not_configured' | 'provider_error' | 'schema_invalid'
}

export interface ScoringResult {
  score: ResponseScoreProposal | null
  provider: string
  model: string
  usage: Record<string, unknown>
  status: 'ok' | 'not_configured' | 'provider_error' | 'schema_invalid'
}

export interface GenerationDeps {
  isConfigured: () => boolean
  generate: typeof generateStructuredGemini
}

export interface ScoringDeps {
  isConfigured: () => Promise<boolean>
  generate: typeof generateStructuredAnthropic
}

const defaultGenerationDeps: GenerationDeps = {
  isConfigured: isGeminiConfigured,
  generate: generateStructuredGemini,
}

const defaultScoringDeps: ScoringDeps = {
  isConfigured: isAnthropicConfigured,
  generate: generateStructuredAnthropic,
}

/** Genera borradores de preguntas (tier barato Gemini). El SME los gatea después. */
export const runQuestionGeneration = async (
  input: QuestionGenPromptInput,
  deps: GenerationDeps = defaultGenerationDeps,
): Promise<GenerationResult> => {
  const model = getHiringAssessmentGenerationModel() ?? HIRING_ASSESSMENT_GENERATION_DEFAULT_MODEL
  const base = { provider: HIRING_ASSESSMENT_GENERATION_PROVIDER, model, usage: {} as Record<string, unknown> }

  if (!deps.isConfigured()) {
    return { ...base, drafts: [], status: 'not_configured' }
  }

  try {
    const result = await deps.generate<unknown>({
      model: getHiringAssessmentGenerationModel(),
      system: QUESTION_GEN_SYSTEM_PROMPT,
      prompt: buildQuestionGenPrompt(input),
      jsonSchema: QUESTION_GENERATION_JSON_SCHEMA as Record<string, unknown>,
      temperature: 0.2,
    })

    const drafts = sanitizeQuestionDrafts(result.data, { competencyKey: input.competencyKey, level: input.level })

    if (drafts.length === 0) {
      return { ...base, model: result.model, usage: { ...result.usage }, drafts: [], status: 'schema_invalid' }
    }

    return { provider: base.provider, model: result.model, usage: { ...result.usage }, drafts, status: 'ok' }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'assessment_ai_question_generation', provider: base.provider } })

    return { ...base, drafts: [], status: 'provider_error' }
  }
}

/** Sugiere un puntaje 0–100 para una respuesta abierta (tier calidad Anthropic). Evidencia, no verdad. */
export const runResponseScoring = async (
  input: ScorePromptInput,
  deps: ScoringDeps = defaultScoringDeps,
): Promise<ScoringResult> => {
  const model = getHiringAssessmentScoringModel()
  const base = { provider: HIRING_ASSESSMENT_SCORING_PROVIDER, model, usage: {} as Record<string, unknown> }

  if (!(await deps.isConfigured())) {
    return { ...base, score: null, status: 'not_configured' }
  }

  try {
    const result = await deps.generate<unknown>({
      model,
      system: RESPONSE_SCORE_SYSTEM_PROMPT,
      prompt: buildResponseScorePrompt(input),
      toolName: 'propose_response_score',
      toolDescription: 'Sugiere un puntaje 0–100 con rationale y perCriterion para la respuesta del candidato.',
      inputSchema: RESPONSE_SCORE_JSON_SCHEMA as never,
      temperature: 0,
    })

    const score = sanitizeResponseScore(result.data)

    if (!score) {
      return { ...base, model: result.model, usage: { ...result.usage }, score: null, status: 'schema_invalid' }
    }

    return { provider: base.provider, model: result.model, usage: { ...result.usage }, score, status: 'ok' }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'assessment_ai_response_scoring', provider: base.provider } })

    return { ...base, score: null, status: 'provider_error' }
  }
}
