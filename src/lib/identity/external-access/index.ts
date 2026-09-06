/**
 * TASK-1631 (EPIC-044 U04) — External identity binding foundation.
 *
 * Primitive canónico provider-neutral: Account 360 ↔ environment de identidad externa ↔ grants por
 * capability ↔ personas ligadas por invitación. Consumers: rutas admin (operador), lane ecosystem
 * (gateway MCP, TASK-1831), auth-server in-process (TASK-1830) y, por parity, Nexa/CLI.
 */

export * from './types'
export * from './errors'
export { readExternalInvitationConfig, type ExternalInvitationConfig } from './config'
export {
  buildInvitationDelivery,
  maskEmail,
  recordExternalInvitationDeliveryOutcome,
  resolveInvitationAcceptanceUrl,
  EXTERNAL_INVITATION_EMAIL_TYPE,
  EXTERNAL_INVITATION_SOURCE_ENTITY
} from './delivery'
export {
  buildExternalIdpSourceSystem,
  EXTERNAL_IDP_SOURCE_OBJECT_TYPE,
  EXTERNAL_IDP_SOURCE_SYSTEM_PREFIX,
  hashExternalSubject
} from './ids'
export {
  findActiveExternalIdpLinkByEmail,
  getActiveExternalIdpLinkBySubject,
  getExternalIdentityEnvironment,
  getExternalOrganizationBinding,
  listEligibleClientOrganizations,
  listExternalCapabilityGrants,
  listExternalIdentityEnvironments,
  listExternalMemberInvitations,
  listExternalOrganizationBindings,
  type ExternalIdpSourceLink
} from './store'
export {
  acceptExternalInvitation,
  bindExternalOrganization,
  grantExternalCapability,
  issueExternalInvitation,
  resendExternalInvitation,
  revealExternalInvitationToken,
  revokeExternalAccess,
  upsertExternalIdentityEnvironment,
  type AcceptExternalInvitationInput,
  type AcceptExternalInvitationResult,
  type BindExternalOrganizationInput,
  type GrantExternalCapabilityInput,
  type IssueExternalInvitationInput,
  type IssueExternalInvitationOptions,
  type IssueExternalInvitationResult,
  type ResendExternalInvitationInput,
  type RevealExternalInvitationTokenInput,
  type RevealExternalInvitationTokenResult,
  type RevokeExternalAccessInput,
  type RevokeExternalAccessResult,
  type UpsertExternalIdentityEnvironmentInput
} from './commands'
export { resolveExternalAccess, type ResolveExternalAccessInput } from './resolve-external-access'
