import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  AssessmentAssignmentProposal,
  AssessmentAssignmentResult,
} from '@/types/hiring-assessment-policy'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { assignAssessmentFromPolicy, NEXT_ATTEMPT_AFTER_DEAD_END } from './assign'
import { buildAssignmentEffectMaterial } from './proposal-digest'
import {
  lockAssignmentProposalForUpdate,
  markAssignmentProposalConfirmed,
  markAssignmentProposalTerminal,
} from './proposal-store'

/**
 * TASK-1719 Slice 2 — Command `confirmAssessmentAssignment`: la confirmación HUMANA que
 * ejecuta el efecto propuesto. Recibe SÓLO `proposalId` (+ la application de la ruta): el
 * caller nunca elige plantilla, etapa ni tiempo — todo eso está congelado en el digest.
 *
 * **NO se gatea por ningún flag.** Drenar la cola humana siempre debe ser posible: un flag
 * apagado detiene la automatización, no la capacidad de una persona de terminar lo que empezó.
 */

/** Decisión interna de la tx; se traduce a excepción DESPUÉS del commit (ver `expired`). */
type ConfirmDecision =
  | { kind: 'confirmed'; proposal: AssessmentAssignmentProposal; result: AssessmentAssignmentResult }
  | { kind: 'already_confirmed'; proposal: AssessmentAssignmentProposal }
  | { kind: 'expired'; proposal: AssessmentAssignmentProposal }
  | { kind: 'stale'; proposal: AssessmentAssignmentProposal }
  | { kind: 'terminal'; proposal: AssessmentAssignmentProposal }

export interface ConfirmAssessmentAssignmentInput {
  proposalId: string
  /** La application de la ruta: guardia de pertenencia (anti cross-wiring). */
  applicationId: string
  actorUserId: string
}

export interface ConfirmAssessmentAssignmentResult {
  proposal: AssessmentAssignmentProposal
  /** Outcome tipado del command común; `null` cuando el confirm fue un no-op idempotente. */
  result: AssessmentAssignmentResult | null
  /** `true` = ya estaba confirmada; el efecto NO se re-ejecutó. */
  alreadyConfirmed: boolean
  assignmentId: string | null
}

export const confirmAssessmentAssignment = async (
  input: ConfirmAssessmentAssignmentInput,
): Promise<ConfirmAssessmentAssignmentResult> => {
  const proposalId = typeof input.proposalId === 'string' ? input.proposalId.trim() : ''
  const applicationId = typeof input.applicationId === 'string' ? input.applicationId.trim() : ''
  const actorUserId = typeof input.actorUserId === 'string' ? input.actorUserId.trim() : ''

  if (!actorUserId) {
    throw new HiringValidationError(
      'Falta el usuario que confirma la asignación.',
      'assessment_assignment_missing_actor',
      401,
    )
  }

  if (!proposalId || !applicationId) {
    throw new HiringValidationError(
      'proposalId y applicationId son obligatorios.',
      'assessment_assignment_field_required',
      400,
    )
  }

  const decision = await withGreenhousePostgresTransaction<ConfirmDecision>(async (client) => {
    const proposal = await lockAssignmentProposalForUpdate(client, proposalId)

    // Pertenencia: 404, NUNCA 403. Un 403 le confirma a quien sondea que ese proposalId existe;
    // "no existe para ti" es la única respuesta que no filtra el ledger de otra postulación.
    if (proposal.applicationId !== applicationId) {
      throw new HiringNotFoundError(
        'La propuesta de asignación no existe.',
        'assessment_assignment_proposal_not_found',
      )
    }

    // Confirm ONE-SHOT: el efecto ya se ejecutó. Devolver el estado tal cual y NO re-asignar
    // (el ledger de assignment absorbería el replay, pero acá ni siquiera se intenta).
    if (proposal.status === 'confirmed') {
      return { kind: 'already_confirmed', proposal }
    }

    if (proposal.status !== 'proposed') {
      return { kind: 'terminal', proposal }
    }

    // Expiry REAL: se marca `expired` y se deja COMMITEAR; el 409 se lanza fuera de la tx. Si
    // se lanzara acá, el rollback dejaría la fila `proposed` y el vencimiento sería cosmético.
    //
    // FAIL-CLOSED: una fecha imparseable cuenta como vencida. La guarda anterior exigía
    // `Number.isFinite(...)` ANTES de comparar, así que un `expires_at` roto (NaN) la saltaba
    // entera y confirmaba el envío de un correo a un candidato sin ninguna ventana que lo
    // acotara. Ante la duda no se manda: se pide una propuesta nueva.
    const expiresAt = Date.parse(proposal.expiresAt)

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return { kind: 'expired', proposal: await markAssignmentProposalTerminal(client, proposalId, 'expired') }
    }

    // Revalidación del efecto con la MISMA fórmula del propose (proposal-digest.ts). Si el
    // mundo cambió — policy reconfigurada, plantilla editada, etapa movida, decisión tomada,
    // instancia ya abierta — el digest no coincide y NO se ejecuta algo distinto de lo aprobado.
    // Sin policy activa: el efecto aprobado dejó de existir ⇒ mismo tratamiento.
    const context = await buildAssignmentEffectMaterial(applicationId, client)

    if (!context || context.digest !== proposal.effectDigest) {
      return { kind: 'stale', proposal: await markAssignmentProposalTerminal(client, proposalId, 'superseded') }
    }

    // TASK-1755 — El intento NO se fija en 1. Un resultado no-asignado (`blocked`/`held`/
    // `stale`) ocupa la clave `(application, policy, versión, 'manual', intento)` mientras siga
    // vigente, y corregir la causa —habilitar la policy, activar la plantilla, registrar el
    // correo— no la libera: sin esto, la confirmación siguiente colisionaba y repetía el mismo
    // resultado PARA SIEMPRE. `assign` resuelve el casillero contra el ledger bajo el lock de la
    // policy, dentro de ESTA transacción, que ya tiene bloqueada la fila de la propuesta.
    //
    // Que llegar acá sea una decisión humana lo garantiza el one-shot de arriba: reconfirmar la
    // misma propuesta sale por `already_confirmed` sin tocar el ledger, así que un reintento de
    // transporte no abre ningún intento. Y un `assigned` vigente sigue cerrando la puerta: el
    // resolver devuelve SU número, el `ON CONFLICT` colisiona y la respuesta es el replay.
    const result = await assignAssessmentFromPolicy(
      {
        applicationId,
        policyId: context.policy.policyId,
        origin: 'manual',
        actorUserId,
        triggerStage: 'manual',
        attemptSeq: NEXT_ATTEMPT_AFTER_DEAD_END,
      },
      client,
    )

    const confirmed = await markAssignmentProposalConfirmed(client, proposalId, {
      confirmedBy: actorUserId,
      assignmentId: result.assignmentId,
    })

    // IDs-only: nunca email, nombre, token ni link de la prueba.
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAssignmentProposal,
        aggregateId: confirmed.proposalId,
        eventType: EVENT_TYPES.hiringAssessmentAssignmentConfirmed,
        payload: {
          proposalId: confirmed.proposalId,
          applicationId: confirmed.applicationId,
          policyId: confirmed.policyId,
          policyVersion: confirmed.policyVersion,
          assignmentId: result.assignmentId,
          outcome: result.status,
          actorUserId,
        },
      },
      client,
    )

    return { kind: 'confirmed', proposal: confirmed, result }
  })

  if (decision.kind === 'expired') {
    throw new HiringValidationError(
      'La propuesta venció. Genera una nueva y revisa el detalle antes de confirmar.',
      'assessment_assignment_proposal_expired',
      409,
    )
  }

  if (decision.kind === 'stale') {
    throw new HiringValidationError(
      'Cambió algo desde que viste esta propuesta (la vacante, la prueba o la postulación). Genera una nueva.',
      'assessment_assignment_proposal_stale',
      409,
    )
  }

  if (decision.kind === 'terminal') {
    throw new HiringValidationError(
      'Esta propuesta ya no se puede confirmar. Genera una nueva.',
      'assessment_assignment_proposal_not_confirmable',
      409,
    )
  }

  if (decision.kind === 'already_confirmed') {
    return {
      proposal: decision.proposal,
      result: null,
      alreadyConfirmed: true,
      assignmentId: decision.proposal.assignmentId,
    }
  }

  return {
    proposal: decision.proposal,
    result: decision.result,
    alreadyConfirmed: false,
    assignmentId: decision.result.assignmentId,
  }
}
