import 'server-only'

import { createHash } from 'node:crypto'

import type { AiProposal } from '@/types/hiring-assessment-ai'
import { QUESTION_LEVELS, type QuestionLevel } from '@/types/hiring-assessment'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { getCompetencyByKey } from '../store'
import { HIRING_ASSESSMENT_GENERATION_PROMPT_VERSION, isHiringAssessmentAiEnabled } from './config'
import { createAiProposal } from './proposal-store'
import { runQuestionGeneration } from './providers'

export interface ProposeQuestionsInput {
  competencyKey: string
  level: QuestionLevel
  count?: number
}

export interface ProposeQuestionsResult {
  proposals: AiProposal[]
  status: 'ok' | 'not_configured' | 'provider_error' | 'schema_invalid'
  provider: string
  model: string
  generated: number
}

const MAX_COUNT = 8

/**
 * TASK-1361 — PROPONE (no aplica) borradores de preguntas por competencia+nivel. Persiste cada
 * borrador como `question_draft` en el ledger; NINGUNO entra al banco sin confirmAiProposal (humano).
 * Flag-gated (los propose paths se apagan con el feature; el confirm de propuestas ya existentes no).
 * Honest-degrade: si el provider falla o no está configurado, no persiste y devuelve el status.
 */
export const proposeQuestionsForCompetency = async (
  input: ProposeQuestionsInput,
  actorUserId: string | null,
): Promise<ProposeQuestionsResult> => {
  if (!isHiringAssessmentAiEnabled()) {
    throw new HiringValidationError('La asistencia de IA de evaluación está deshabilitada.', 'assessment_ai_disabled', 409)
  }

  const level = input.level

  if (!(QUESTION_LEVELS as readonly string[]).includes(level)) {
    throw new HiringValidationError('El nivel no es válido.', 'assessment_ai_invalid_level', 400, { level })
  }

  const count = Math.min(Math.max(input.count ?? 3, 1), MAX_COUNT)
  const competency = await getCompetencyByKey(input.competencyKey)

  if (!competency) {
    throw new HiringNotFoundError('La competencia no existe en el catálogo.', 'assessment_competency_not_found')
  }

  const generation = await runQuestionGeneration({
    competencyKey: competency.key,
    competencyName: competency.name,
    competencyCategory: competency.category,
    level,
    count,
  })

  if (generation.status !== 'ok') {
    return { proposals: [], status: generation.status, provider: generation.provider, model: generation.model, generated: 0 }
  }

  const targetRef = `${competency.key}@${level}`

  const inputDigest = createHash('sha256')
    .update(`${targetRef}|${count}|${HIRING_ASSESSMENT_GENERATION_PROMPT_VERSION}`)
    .digest('hex')

  const proposals: AiProposal[] = []

  for (const draft of generation.drafts) {
    const proposal = await createAiProposal(
      {
        kind: 'question_draft',
        targetRef,
        proposed: draft as unknown as Record<string, unknown>,
        provider: generation.provider,
        model: generation.model,
        promptVersion: HIRING_ASSESSMENT_GENERATION_PROMPT_VERSION,
        inputDigest,
        usage: generation.usage,
      },
      actorUserId,
    )

    proposals.push(proposal)
  }

  return { proposals, status: 'ok', provider: generation.provider, model: generation.model, generated: proposals.length }
}
