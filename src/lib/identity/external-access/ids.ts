import { createHash, randomBytes, randomUUID } from 'node:crypto'

/**
 * TASK-1631 — Identificadores y hashes del dominio external-access.
 *
 * Los IDs son texto con prefijo (mismo estilo que el resto de greenhouse_core). El subject
 * externo sólo se persiste en claro dentro de `identity_profile_source_links` (es la llave de
 * binding); en el resolution log va hasheado. El token de invitación nunca se persiste en claro.
 */

export const EXTERNAL_IDP_SOURCE_SYSTEM_PREFIX = 'external_idp:'
export const EXTERNAL_IDP_SOURCE_OBJECT_TYPE = 'subject'

export const buildExternalIdpSourceSystem = (environmentId: string) =>
  `${EXTERNAL_IDP_SOURCE_SYSTEM_PREFIX}${environmentId}`

export const buildExternalBindingId = () => `xob-${randomUUID()}`
export const buildExternalGrantId = () => `xcg-${randomUUID()}`
export const buildExternalInvitationId = () => `xmi-${randomUUID()}`
export const buildExternalAuditId = () => `xal-${randomUUID()}`
export const buildExternalResolutionId = () => `xrl-${randomUUID()}`

export const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex')

export const hashExternalSubject = (subject: string) => sha256Hex(subject)

export const hashInvitationToken = (token: string) => sha256Hex(token)

/** 32 bytes aleatorios en base64url: se entrega UNA vez al command que lo emite. */
export const generateInvitationToken = () => randomBytes(32).toString('base64url')
