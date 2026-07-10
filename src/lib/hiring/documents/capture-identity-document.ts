import 'server-only'

import { declareIdentityDocument } from '@/lib/person-legal-profile'
import type { PersonDocumentType } from '@/lib/person-legal-profile/types'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { getCandidateFacetById, listHiringApplications } from '../store'
import type { CandidateIdentityDocument } from './types'

/** Sólo un candidato con decisión favorable entra a la captura de identidad. */
const DECISIONS_THAT_UNLOCK_IDENTITY_CAPTURE = new Set(['selected', 'backup_selected'])

export type CaptureCandidateIdentityDocumentInput = {
  candidateFacetId: string
  documentType: PersonDocumentType
  /** Valor crudo del documento. NUNCA se loggea, NUNCA vuelve en la respuesta. */
  rawValue: string
  countryCode: string
  actorUserId: string
  issuingCountry?: string | null
  validFrom?: string | null
  validUntil?: string | null
  /** Escaneo del documento, ya subido como asset privado. */
  evidenceAssetId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * TASK-1362 — Captura del documento de identidad de un candidato, POST-decisión.
 *
 * No hay tabla nueva: escribe en `person_identity_documents` (TASK-784), anclado
 * al `identity_profile_id` del candidato — NUNCA a un `member_id`, porque un
 * candidato no tiene member hasta que el handoff (TASK-356) lo convierte.
 *
 * El guardrail de "post-decisión" no es un comentario: es este predicado. Pedir
 * el documento de identidad a alguien que todavía está siendo evaluado —o peor,
 * en el formulario público— es recolección de PII sin base de licitud (Ley
 * 21.719). El apply público no puede llegar acá: este módulo es `server-only`,
 * exige `actorUserId` (el apply corre con actor `null`) y verifica la decisión.
 *
 * Devuelve el documento ENMASCARADO. El `value_full` sólo sale por el reveal
 * auditado con capability + reason.
 */
export const captureCandidateIdentityDocument = async (
  input: CaptureCandidateIdentityDocumentInput,
): Promise<CandidateIdentityDocument> => {
  if (!input.actorUserId) {
    throw new HiringValidationError(
      'La captura del documento de identidad requiere un operador autenticado.',
      'hiring_identity_capture_requires_actor',
      401,
    )
  }

  const facet = await getCandidateFacetById(input.candidateFacetId)

  if (!facet) {
    throw new HiringNotFoundError('No existe una ficha de candidato para el identificador entregado.')
  }

  const applications = await listHiringApplications({ identityProfileId: facet.identityProfileId })

  const hasFavourableDecision = applications.some(
    application => application.decision && DECISIONS_THAT_UNLOCK_IDENTITY_CAPTURE.has(application.decision),
  )

  if (!hasFavourableDecision) {
    throw new HiringValidationError(
      'El documento de identidad solo se captura después de una decisión favorable sobre la postulación.',
      'hiring_identity_capture_requires_decision',
      409,
    )
  }

  const { document } = await declareIdentityDocument({
    profileId: facet.identityProfileId,
    documentType: input.documentType,
    rawValue: input.rawValue,
    countryCode: input.countryCode,
    issuingCountry: input.issuingCountry ?? null,
    validFrom: input.validFrom ?? null,
    validUntil: input.validUntil ?? null,
    evidenceAssetId: input.evidenceAssetId ?? null,
    // Lo declara HR sobre el candidato, no el candidato sobre sí mismo.
    source: 'hr_declared',
    declaredByUserId: input.actorUserId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  })

  return {
    documentId: document.documentId,
    documentType: document.documentType,
    countryCode: document.countryCode,
    displayMask: document.displayMask,
    verificationStatus: document.verificationStatus,
    evidenceAssetId: document.evidenceAssetId,
  }
}
