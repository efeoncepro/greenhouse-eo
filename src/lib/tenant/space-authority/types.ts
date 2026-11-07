/**
 * TASK-2096 — contract of the operational-account (Space) authority.
 *
 * Serializable shapes only: no DB handles or secrets, so they can cross to adapters (App lane,
 * MCP, portal) unchanged. The resolver answers "may this principal act on this Space now, and
 * with which verb"; role and capability checks stay with each consumer.
 */

export const SPACE_ACCESS_VERBS = ['read', 'create'] as const

export type SpaceAccessVerb = (typeof SPACE_ACCESS_VERBS)[number]

export const isSpaceAccessVerb = (value: unknown): value is SpaceAccessVerb =>
  typeof value === 'string' && (SPACE_ACCESS_VERBS as readonly string[]).includes(value)

/** How the principal holds authority over the Space. */
export type SpaceAuthoritySource =
  /** A persisted row in `greenhouse_core.space_access_grants`. */
  | 'explicit_grant'
  /** Client with exactly one active Space and no explicit grant: today's single-account behaviour. */
  | 'single_space_client'

export type AuthorizedSpace = {
  organizationId: string
  organizationName: string | null
  spaceId: string
  spacePublicId: string | null
  verbs: SpaceAccessVerb[]
  grantId: string
  grantVersion: number
  source: SpaceAuthoritySource
}

export type SpaceContextRequest = {
  /** Server-derived authenticated user. Never taken from the request body or query. */
  userId: string
  need: SpaceAccessVerb
  /** Explicit target sent with the request; it can only narrow access, never widen it. */
  spaceId?: string | null
  organizationId?: string | null
  serviceId?: string | null
}

export type AuthorizedSpaceContext = {
  userId: string
  /** Null for a user without an identity profile: only the single-Space rule can authorize it. */
  identityProfileId: string | null
  organizationId: string
  spaceId: string
  serviceId: string | null
  need: SpaceAccessVerb
  grantId: string
  grantVersion: number
  source: SpaceAuthoritySource
}

export type SpaceContextDenialReason =
  | 'principal_not_found'
  | 'principal_inactive'
  | 'tenant_type_unsupported'
  | 'grant_required'
  | 'space_not_allowed'
  | 'organization_mismatch'
  | 'service_not_in_space'
  | 'context_stale'

export type SpaceContextResolution =
  | { status: 'authorized'; context: AuthorizedSpaceContext }
  | { status: 'selection_required'; candidates: AuthorizedSpace[] }
  | { status: 'denied'; reason: SpaceContextDenialReason }
