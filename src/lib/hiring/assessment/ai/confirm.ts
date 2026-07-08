import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { AiProposal, ConfirmAiProposalInput, QuestionDraftProposal, ResponseScoreProposal } from '@/types/hiring-assessment-ai'
import type { CreateQuestionInput } from '@/types/hiring-assessment'

import { HiringValidationError } from '../../errors'
import { createQuestion } from '../store'
import { recordHumanScore } from '../scoring'
import { lockAiProposalForUpdate, markProposalDecided } from './proposal-store'
import { resolveProposalTransition } from './state'

/**
 * TASK-1361 — El ÚNICO write que aplica una propuesta IA. propose→confirm→execute:
 * la IA propuso evidencia; acá un humano (capability-gated en la ruta) confirma o rechaza, y el
 * efecto downstream se aplica ATÓMICAMENTE con la marca de la propuesta (misma tx).
 *
 * - `question_draft` + confirm → crea una `hiring_question` (nace `draft`, gate SME de TASK-1360).
 *   `questionOverride` permite que el humano edite el borrador antes de crearlo.
 * - `response_score` + confirm → aplica `recordHumanScore` con `finalScore` (default = el score
 *   propuesto por la IA). El humano fija el valor; el LLM NUNCA escribió `human_score`.
 * - `reject` → solo marca la propuesta `rejected`.
 *
 * El score NUNCA auto-rechaza ni toca payroll/ICO. El rollup a `hiring_application` sigue su curso
 * canónico (finalizeAssessment) — este confirm solo alimenta la cola humana de TASK-1360.
 */
export const confirmAiProposal = async (
  input: ConfirmAiProposalInput,
  actorUserId: string,
): Promise<AiProposal> => {
  if (!actorUserId) {
    throw new HiringValidationError('Falta el usuario que confirma.', 'assessment_ai_missing_actor', 401)
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const proposal = await lockAiProposalForUpdate(client, input.proposalId)
    const transition = resolveProposalTransition(proposal.status, input.decision)

    // Idempotente: misma decisión ya aplicada → devolver el estado actual sin re-ejecutar el efecto.
    if (!transition.apply) {
      return proposal
    }

    let confirmedRef: string | null = null

    if (input.decision === 'confirm') {
      if (proposal.kind === 'question_draft') {
        confirmedRef = await applyQuestionDraft(client, proposal, input.questionOverride, actorUserId)
      } else {
        confirmedRef = await applyResponseScore(client, proposal, input.finalScore, actorUserId)
      }
    }

    const decided = await markProposalDecided(client, {
      proposalId: proposal.proposalId,
      status: transition.next as 'confirmed' | 'rejected',
      confirmedRef,
      decisionNote: input.decisionNote ?? null,
      actorUserId,
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAiProposal,
        aggregateId: decided.proposalId,
        eventType: EVENT_TYPES.hiringAssessmentAiConfirmed,
        payload: {
          proposalId: decided.proposalId,
          kind: decided.kind,
          decision: input.decision,
          status: decided.status,
          confirmedRef,
          actorUserId,
        },
      },
      client,
    )

    return decided
  })
}

// ── Efectos downstream (atómicos con la marca de la propuesta) ──

const applyQuestionDraft = async (
  client: PoolClient,
  proposal: AiProposal,
  override: Partial<QuestionDraftProposal> | undefined,
  actorUserId: string,
): Promise<string> => {
  const draft = proposal.proposed as unknown as QuestionDraftProposal
  const merged: QuestionDraftProposal = { ...draft, ...(override ?? {}) }

  // level/type vienen como string del LLM; createQuestion los re-valida con assertEnum (throw si
  // no pertenecen al enum), así que el cast es seguro — la validación canónica es la de TASK-1360.
  const questionInput: CreateQuestionInput = {
    competencyKey: merged.competencyKey,
    level: merged.level as CreateQuestionInput['level'],
    type: merged.type as CreateQuestionInput['type'],
    prompt: merged.prompt,
    options: merged.options,
    answerKey: merged.answerKey,
    rubric: merged.rubric,
  }

  const question = await createQuestion(questionInput, actorUserId, client)

  return question.questionId
}

const applyResponseScore = async (
  client: PoolClient,
  proposal: AiProposal,
  finalScoreOverride: number | undefined,
  actorUserId: string,
): Promise<string> => {
  const proposed = proposal.proposed as unknown as ResponseScoreProposal
  const responseId = proposal.targetRef
  const finalScore = typeof finalScoreOverride === 'number' ? finalScoreOverride : proposed.score

  if (typeof finalScore !== 'number' || !Number.isFinite(finalScore)) {
    throw new HiringValidationError('La propuesta no tiene un puntaje válido para confirmar.', 'assessment_ai_invalid_score', 400)
  }

  await recordHumanScore(responseId, finalScore, actorUserId, client)

  return responseId
}
