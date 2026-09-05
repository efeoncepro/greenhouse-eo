/**
 * TASK-1631 (EPIC-044 U04) — External identity binding foundation: tipos del dominio.
 *
 * Grafo provider-neutral:
 *   organización canónica (Account 360)
 *     → binding a un environment de identidad externa (registry que absorbe la rotación de issuer)
 *       → grants por capability namespaceada (profile_id NULL = todos los miembros del binding)
 *       → personas ligadas por invitación aceptada; el subject vive en
 *         `identity_profile_source_links` con `source_system = 'external_idp:<environment_id>'`.
 *
 * Nada acá conoce Globe, Wave ni Kortex: un provider nuevo registra capabilities, no columnas.
 */

export const EXTERNAL_ISSUER_CLASSES = ['internal', 'external'] as const
export type ExternalIssuerClass = (typeof EXTERNAL_ISSUER_CLASSES)[number]

export const EXTERNAL_ENVIRONMENT_STATUSES = ['draft', 'active', 'suspended', 'retired'] as const
export type ExternalEnvironmentStatus = (typeof EXTERNAL_ENVIRONMENT_STATUSES)[number]

export const EXTERNAL_SUBJECT_TYPES = ['public', 'pairwise'] as const
export type ExternalSubjectType = (typeof EXTERNAL_SUBJECT_TYPES)[number]

export const EXTERNAL_BINDING_STATUSES = ['active', 'revoked'] as const
export type ExternalBindingStatus = (typeof EXTERNAL_BINDING_STATUSES)[number]

export const EXTERNAL_GRANT_STATUSES = ['active', 'revoked'] as const
export type ExternalGrantStatus = (typeof EXTERNAL_GRANT_STATUSES)[number]

export const EXTERNAL_INVITATION_STATUSES = ['issued', 'accepted', 'linked', 'revoked', 'expired'] as const
export type ExternalInvitationStatus = (typeof EXTERNAL_INVITATION_STATUSES)[number]

export const EXTERNAL_ACCESS_RESOLUTION_OUTCOMES = [
  'bound',
  'unbound',
  'internal_population',
  'revoked',
  'environment_inactive',
  'profile_inactive'
] as const
export type ExternalAccessResolutionOutcome = (typeof EXTERNAL_ACCESS_RESOLUTION_OUTCOMES)[number]

export const EXTERNAL_REVOCATION_SCOPES = ['binding', 'grant', 'member', 'invitation'] as const
export type ExternalRevocationScope = (typeof EXTERNAL_REVOCATION_SCOPES)[number]

export type ExternalIdentityEnvironment = {
  environmentId: string
  displayName: string
  provider: string
  providerEnvironmentRef: string | null
  issuerUrl: string
  jwksUri: string
  audience: string
  issuerClass: ExternalIssuerClass
  subjectType: ExternalSubjectType
  status: ExternalEnvironmentStatus
  notes: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type ExternalOrganizationBinding = {
  population: 'external' | 'internal'
  bindingId: string
  organizationId: string
  organizationName: string | null
  environmentId: string
  externalOrganizationRef: string
  status: ExternalBindingStatus
  grantsVersion: number
  designatedAdminProfileId: string | null
  reason: string | null
  boundBy: string
  boundAt: string
  revokedBy: string | null
  revokedAt: string | null
  revokeReason: string | null
}

export type ExternalCapabilityGrant = {
  grantId: string
  bindingId: string
  capability: string
  /** `null` = todos los miembros ligados del binding; set = sólo esa persona. */
  profileId: string | null
  status: ExternalGrantStatus
  reason: string | null
  grantedBy: string
  grantedAt: string
  revokedBy: string | null
  revokedAt: string | null
  revokeReason: string | null
}

/** Nunca expone `token_hash`: el token viaja una sola vez en el resultado del command que lo emite. */
export type ExternalMemberInvitation = {
  invitationId: string
  bindingId: string
  profileId: string | null
  email: string
  designatedAdmin: boolean
  status: ExternalInvitationStatus
  reason: string | null
  issuedBy: string
  issuedAt: string
  expiresAt: string
  acceptedAt: string | null
  linkedAt: string | null
  linkId: string | null
  revokedBy: string | null
  revokedAt: string | null
  revokeReason: string | null
}

export type EligibleClientOrganization = {
  organizationId: string
  organizationName: string | null
  legalName: string | null
  organizationType: string
  lifecycleStage: string
  /** `true` sólo para `active_client`: la cohorte entra únicamente desde clientes vigentes. */
  eligible: boolean
  activeBindings: number
}

export type ExternalAccessMembership = {
  bindingId: string
  organizationId: string
  externalOrganizationRef: string
  grantsVersion: number
  /** Capabilities namespaceadas resueltas para ESTA persona (grants del binding ∪ grants per-persona). */
  grants: string[]
  designatedAdmin: boolean
}

/**
 * Resultado del reader que consume el gateway (TASK-1831) por `(environment, subject)`.
 * `bound` ⇔ `memberships.length > 0`; cualquier otro outcome deniega y queda registrado.
 */
export type ExternalAccessResolution = {
  outcome: ExternalAccessResolutionOutcome
  environmentId: string
  issuerClass: ExternalIssuerClass | null
  profileId: string | null
  memberships: ExternalAccessMembership[]
  resolvedAt: string
}

export type ExternalAccessActor = {
  /** `user_id` del operador o identificador estable del runtime (`auth-server`). */
  actorId: string
}
