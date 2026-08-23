import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { findRunItemByProposalId, transitionRunItem } from './scoring-run/store'
import type { AiProposal, ConfirmAiProposalInput, QuestionDraftProposal, ResponseScoreProposal } from '@/types/hiring-assessment-ai'
import type { CreateQuestionInput } from '@/types/hiring-assessment'

import { HiringValidationError } from '../../errors'
import { applyOpeningPublicCopy } from '../../vacancy-ai/apply'
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
 * - `opening_public_copy` + confirm (TASK-1385) → aplica el copy público editado por el humano
 *   (`publicCopyOverride`) vía `updateHiringOpening` (writer canónico). El publish sigue siendo
 *   una acción humana aparte con su gate.
 * - `reject` → solo marca la propuesta `rejected`.
 *
 * El score NUNCA auto-rechaza ni toca payroll/ICO. El rollup a `hiring_application` sigue su curso
 * canónico (finalizeAssessment) — este confirm solo alimenta la cola humana de TASK-1360.
 *
 * `client` opcional (TASK-1734 Slice 4): el confirm de run por lote aplica cada proposal
 * cubierta A TRAVÉS de este mismo command dentro de SU tx (cero bypass, cero segundo
 * writer); sin client, el command abre su propia tx como siempre.
 */
export const confirmAiProposal = async (
  input: ConfirmAiProposalInput,
  actorUserId: string,
  client?: PoolClient,
): Promise<AiProposal> => {
  if (!actorUserId) {
    throw new HiringValidationError('Falta el usuario que confirma.', 'assessment_ai_missing_actor', 401)
  }

  if (client) return confirmAiProposalInTransaction(client, input, actorUserId)

  return withGreenhousePostgresTransaction((tx) => confirmAiProposalInTransaction(tx, input, actorUserId))
}

const confirmAiProposalInTransaction = async (
  client: PoolClient,
  input: ConfirmAiProposalInput,
  actorUserId: string,
): Promise<AiProposal> => {
  const proposal = await lockAiProposalForUpdate(client, input.proposalId)
  const transition = resolveProposalTransition(proposal.status, input.decision)

  // Idempotente: misma decisión ya aplicada → devolver el estado actual sin re-ejecutar el efecto.
  if (!transition.apply) {
    // ...pero SÍ reconciliar el item del run. Este es el camino que SANA los items que quedaron
    // desalineados antes de que existiera la reconciliación de abajo: la respuesta ya tiene su
    // `human_score` y el item se quedó en `proposed`. Re-confirmar es idempotente sobre la
    // proposal y converge el run, sin tocar el puntaje.
    if (proposal.kind === 'response_score' && proposal.status === 'confirmed') {
      await reconcileRunItemForScoredProposal(client, proposal.proposalId, actorUserId)
    }

    return proposal
  }

  let confirmedRef: string | null = null

  if (input.decision === 'confirm') {
    if (proposal.kind === 'question_draft') {
      confirmedRef = await applyQuestionDraft(client, proposal, input.questionOverride, actorUserId)
    } else if (proposal.kind === 'opening_public_copy') {
      confirmedRef = await applyOpeningPublicCopy(client, proposal, input.publicCopyOverride, actorUserId)
    } else {
      confirmedRef = await applyResponseScore(client, proposal, input.finalScore, actorUserId)

      // El item del run SIGUE al puntaje, por construcción y en la MISMA transacción.
      //
      // Causa raíz cerrada acá (caso real 2026-08-19): este command es el único punto donde una
      // proposal se vuelve `human_score`, pero se llega por DOS puertas — la cola del run
      // (`resolveScoringRunItem`) y el confirm individual por respuesta. Sólo la primera movía el
      // item. La segunda dejaba la respuesta puntuada y el item en `proposed`, así que la cobertura
      // decía "faltan 5" sobre trabajo YA hecho y el run quedaba incerrable para siempre.
      //
      // Ponerlo en cada puerta es lo que ya se intentó y volvió a romperse: la puerta siguiente
      // vuelve a olvidarlo. Acá no hay puerta que se lo salte.
      //
      // Idempotente: si el caller ya lo movió (la cola del run transiciona después de llamarnos),
      // `resolveItemTransition` resuelve `confirmed → confirmed` como no-op sin escribir nada.
      await reconcileRunItemForScoredProposal(client, proposal.proposalId, actorUserId)
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


/**
 * Lleva a `confirmed` el item del run cuya proposal acaba de aplicarse como puntaje humano.
 *
 * No-op cuando la proposal no pertenece a ningún run, o cuando el item ya es terminal.
 */
const reconcileRunItemForScoredProposal = async (
  client: PoolClient,
  proposalId: string,
  actorUserId: string,
): Promise<void> => {
  const item = await findRunItemByProposalId(client, proposalId)

  if (!item || item.status === 'confirmed') return

  await transitionRunItem(client, item, 'confirmed', {
    actorUserId,
    reasonCode: 'scored_via_proposal_confirm',
  })
}
