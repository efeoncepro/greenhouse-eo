import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { DossierProposal } from '@/types/hiring-dossier-ai'

import { HiringValidationError } from '../errors'
import { HIRING_DOSSIER_PROMPT_VERSION, getHiringDossierModel, isHiringDossierAiEnabled } from './config'
import { runDossierGeneration, type DossierGenerationDeps } from './generate'
import { assembleEvaluationDossierPacket, computeDossierInputDigest } from './packet'
import { createDossierProposal, findActiveDossierProposal } from './store'

/**
 * TASK-1735 — Command `proposeEvaluationDossier`: ensambla el packet minimizado
 * (CV redactado TASK-1718 + assessment + journey), genera el borrador con el cliente
 * LLM canónico y lo persiste como propuesta `proposed` + outbox IDs-only.
 *
 * - Flag OFF → 409 `hiring_dossier_ai_disabled` (las notas manuales y el confirm de
 *   propuestas existentes siguen operables — el flag gatea SOLO el costo LLM).
 * - Idempotente por (applicationId, input_digest): mismo estado de fuentes → misma
 *   propuesta activa, SIN segunda llamada al provider.
 * - El LLM nunca escribe una nota: la materialización vive en confirmEvaluationDossier.
 */
export const proposeEvaluationDossier = async (
  applicationId: string,
  actorUserId: string,
  deps?: DossierGenerationDeps
): Promise<DossierProposal> => {
  if (!actorUserId) {
    throw new HiringValidationError('Falta el usuario que propone.', 'hiring_dossier_missing_actor', 401)
  }

  if (!isHiringDossierAiEnabled()) {
    throw new HiringValidationError(
      'La generación agéntica del expediente está deshabilitada.',
      'hiring_dossier_ai_disabled',
      409
    )
  }

  const packet = await assembleEvaluationDossierPacket(applicationId)
  const effectiveModel = getHiringDossierModel()
  const inputDigest = computeDossierInputDigest(packet, effectiveModel, HIRING_DOSSIER_PROMPT_VERSION)

  // Idempotencia ANTES del provider: propuesta activa con el mismo digest → retornarla.
  const existing = await findActiveDossierProposal(applicationId, inputDigest)

  if (existing) return existing

  const result = await runDossierGeneration(packet, deps)

  if (result.status === 'not_configured') {
    throw new HiringValidationError(
      'El proveedor de IA no está configurado en este entorno.',
      'hiring_dossier_provider_not_configured',
      503
    )
  }

  if (result.status === 'provider_error') {
    throw new HiringValidationError(
      'El proveedor de IA no pudo generar el borrador. Intenta nuevamente.',
      'hiring_dossier_provider_error',
      502
    )
  }

  if (result.status === 'schema_invalid' || !result.dossier) {
    throw new HiringValidationError(
      'La salida del proveedor de IA no cumplió el contrato estructurado y fue descartada.',
      'hiring_dossier_output_invalid',
      502
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    const { proposal, created } = await createDossierProposal(client, {
      applicationId,
      proposed: {
        dossier: result.dossier,
        sources: {
          cvContentHash: packet.cv.contentHash,
          responseCount: packet.assessment.responses.length,
          competencyCount: packet.assessment.competencyResults.length,
          usage: result.usage
        }
      },
      provider: result.provider,
      model: result.model,
      promptVersion: HIRING_DOSSIER_PROMPT_VERSION,
      inputDigest,
      createdBy: actorUserId
    })

    if (created) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.hiringApplication,
          aggregateId: proposal.applicationId,
          eventType: EVENT_TYPES.hiringApplicationDossierProposed,
          payload: {
            proposalId: proposal.proposalId,
            applicationId: proposal.applicationId,
            provider: proposal.provider,
            model: proposal.model,
            actorUserId
          }
        },
        client
      )
    }

    return proposal
  })
}
