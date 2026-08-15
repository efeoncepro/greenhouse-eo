import 'server-only'

import { listIdentityDocumentsForProfileMasked, revealPersonIdentityDocument } from '@/lib/person-legal-profile'
import type { PersonIdentityDocumentSensitive } from '@/lib/person-legal-profile/types'

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { getCandidateFacetById } from '../store'

export type RevealCandidateIdentityDocumentInput = {
  candidateFacetId: string
  documentId: string
  actorUserId: string
  actorEmail?: string | null
  /** Motivo humano, >=5 caracteres. Va al audit log; NUNCA a un log de aplicación. */
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

export type RevealCandidateIdentityDocumentResult = {
  document: PersonIdentityDocumentSensitive
  auditId: string
  eventId: string
}

/**
 * TASK-1714 — Reveal auditado del documento de identidad de un CANDIDATO.
 *
 * El reveal de TASK-784 existe, pero su ruta se ancla a `memberId` y un candidato
 * no tiene member hasta el handoff (TASK-356). Sin este command, el dominio puede
 * ESCRIBIR la identidad de un candidato (`captureCandidateIdentityDocument`) y
 * MOSTRARLA enmascarada (`resolveCandidateDocuments`), pero nadie puede leerla
 * legítimamente — y el dato termina saliendo por un canal sin capability, sin
 * motivo y sin trail, que es justo lo que el reveal auditado existe para evitar.
 *
 * NO autoriza: el caller aplica `canAccessHiringCandidateDocument` +
 * `hiring.candidate.reveal_identity` antes de llamar (defensa en la ruta, mismo
 * contrato que `revealPersonIdentityDocument`).
 *
 * Lo que SÍ hace, y es la razón de existir de esta capa: verificar que el
 * documento PERTENECE al candidato del path. Sin ese predicado, la ruta sería un
 * IDOR directo sobre la PII de cualquier persona del sistema — basta con adivinar
 * un `documentId`. El audit + el outbox los escribe el helper de TASK-784; acá no
 * se duplican.
 */
export const revealCandidateIdentityDocument = async (
  input: RevealCandidateIdentityDocumentInput,
): Promise<RevealCandidateIdentityDocumentResult> => {
  if (!input.actorUserId) {
    throw new HiringValidationError(
      'El reveal del documento de identidad requiere un operador autenticado.',
      'hiring_identity_reveal_requires_actor',
      401,
    )
  }

  // Se valida ANTES de tocar la fila: un motivo inválido no debe siquiera provocar
  // una lectura del documento.
  if (!input.reason || input.reason.trim().length < 5) {
    throw new HiringValidationError(
      'El motivo del reveal debe tener al menos 5 caracteres.',
      'hiring_identity_reveal_reason_required',
      400,
    )
  }

  const facet = await getCandidateFacetById(input.candidateFacetId)

  if (!facet) {
    throw new HiringNotFoundError('No existe una ficha de candidato para el identificador entregado.')
  }

  // Pertenencia: el documento tiene que estar entre los del perfil de ESTE candidato.
  // Se resuelve por la lista enmascarada del perfil (nunca por un SELECT ad-hoc con
  // `value_full`), así que el valor completo sigue saliendo por un solo camino.
  //
  // `includeArchived: true` a propósito: un documento archivado o expirado de este
  // mismo candidato SÍ le pertenece, y debe recibir el `409 reveal_disabled_for_status`
  // de TASK-784 —que explica la causa— en vez de un `404` que afirmaría que no existe.
  // Colapsar "archivado" en "inexistente" es exactamente el tipo de degradación
  // deshonesta que este trabajo corrige en la UI.
  const documents = await listIdentityDocumentsForProfileMasked(facet.identityProfileId, {
    includeArchived: true,
  })

  const belongsToCandidate = documents.some(document => document.documentId === input.documentId)

  if (!belongsToCandidate) {
    // `404`, NO `403`: un `403` confirmaría que el documento existe y pertenece a
    // otra persona. Un documento inexistente y un documento ajeno son
    // indistinguibles desde afuera, por diseño.
    throw new HiringNotFoundError(
      'No existe un documento de identidad con ese identificador para este candidato.',
      'hiring_identity_document_not_found',
    )
  }

  return revealPersonIdentityDocument({
    documentId: input.documentId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail ?? null,
    reason: input.reason,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  })
}
