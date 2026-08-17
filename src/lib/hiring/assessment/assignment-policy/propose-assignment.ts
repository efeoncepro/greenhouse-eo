import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { AssessmentAssignmentPreview, AssessmentAssignmentProposal } from '@/types/hiring-assessment-policy'

import { HiringValidationError } from '../../errors'
import { buildAssignmentEffectMaterial, deriveAssignmentPreviewBlocker } from './proposal-digest'
import { createAssignmentProposal, findActiveAssignmentProposal } from './proposal-store'

/**
 * TASK-1719 Slice 2 — Command `proposeAssessmentAssignment`: preview DURABLE de la asignación
 * que un humano va a confirmar. El caller NUNCA entrega `templateId` — Greenhouse la resuelve
 * server-side desde la policy de la vacante (ADR D2).
 *
 * Read-only sobre el dominio: no crea instancia, no manda correo, no toca el ledger de
 * assignment. Lo único que escribe es la propuesta.
 */

/**
 * Ventana de la propuesta. Existe porque cubre lo que el digest NO cubre: que el mundo no haya
 * cambiado pero hayan pasado horas. Un operador que abre el diálogo, se va y vuelve a confirmar
 * el envío de un correo a un candidato debería volver a mirar. Se ENFORCEA en el confirm.
 */
export const ASSESSMENT_ASSIGNMENT_PROPOSAL_TTL_MINUTES = 30

export interface ProposeAssessmentAssignmentInput {
  applicationId: string
  actorUserId: string
}

export interface ProposeAssessmentAssignmentResult {
  proposal: AssessmentAssignmentProposal
  /** `false` = ya existía una propuesta activa para el MISMO efecto (idempotencia por digest). */
  created: boolean
}

export const proposeAssessmentAssignment = async (
  input: ProposeAssessmentAssignmentInput,
): Promise<ProposeAssessmentAssignmentResult> => {
  const applicationId = typeof input.applicationId === 'string' ? input.applicationId.trim() : ''
  const actorUserId = typeof input.actorUserId === 'string' ? input.actorUserId.trim() : ''

  if (!actorUserId) {
    throw new HiringValidationError(
      'Falta el usuario que propone la asignación.',
      'assessment_assignment_missing_actor',
      401,
    )
  }

  if (!applicationId) {
    throw new HiringValidationError(
      'applicationId es obligatorio.',
      'assessment_assignment_field_required',
      400,
    )
  }

  const context = await buildAssignmentEffectMaterial(applicationId)

  if (!context) {
    throw new HiringValidationError(
      'La vacante de esta postulación todavía no declara una evaluación. Configura su policy antes de asignar.',
      'assessment_assignment_policy_missing',
      409,
    )
  }

  // Idempotencia ANTES de escribir: mismo estado del mundo ⇒ misma propuesta, en vez de
  // acumular filas cada vez que alguien reabre el diálogo.
  const existing = await findActiveAssignmentProposal(applicationId, context.digest)

  if (existing) return { proposal: existing, created: false }

  // PII-FREE por contrato: labels, versiones, banderas y reason codes. NUNCA el nombre del
  // candidato, su correo, el token ni el link de la prueba.
  const preview: AssessmentAssignmentPreview = {
    openingTitle: context.openingTitle || null,
    templateName: context.templateName || null,
    templateVersion: context.templateVersion,
    policyVersion: context.policy.policyVersion,
    mode: context.policy.mode,
    triggerStage: context.material.triggerStage,
    timeLimitMinutes: context.policy.timeLimitMinutes,
    recipientReady: context.material.recipientReady,
    existingOpenAssessment: context.material.existingOpenAssessment,
    existingScoredAssessment: context.material.existingScoredAssessment,
    blockingReasonCode: deriveAssignmentPreviewBlocker(context),
  }

  const expiresAt = new Date(Date.now() + ASSESSMENT_ASSIGNMENT_PROPOSAL_TTL_MINUTES * 60_000)

  return withGreenhousePostgresTransaction(async (client) => {
    const { proposal, created } = await createAssignmentProposal(client, {
      applicationId,
      policyId: context.policy.policyId,
      policyVersion: context.policy.policyVersion,
      effectDigest: context.digest,
      preview,
      proposedBy: actorUserId,
      expiresAt,
    })

    // Sólo la creación real emite evento: una carrera perdida no es un hecho nuevo.
    if (created) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.hiringAssessmentAssignmentProposal,
          aggregateId: proposal.proposalId,
          eventType: EVENT_TYPES.hiringAssessmentAssignmentProposed,
          payload: {
            proposalId: proposal.proposalId,
            applicationId: proposal.applicationId,
            policyId: proposal.policyId,
            policyVersion: proposal.policyVersion,
            effectDigest: proposal.effectDigest,
            blockingReasonCode: preview.blockingReasonCode,
            actorUserId,
          },
        },
        client,
      )
    }

    return { proposal, created }
  })
}
