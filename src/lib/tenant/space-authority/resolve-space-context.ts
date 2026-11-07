import 'server-only'

import { query } from '@/lib/db'

import type {
  AuthorizedSpace,
  AuthorizedSpaceContext,
  SpaceAccessVerb,
  SpaceContextRequest,
  SpaceContextResolution
} from './types'

/**
 * TASK-2096 — canonical resolver of the operational-account (Space) context.
 *
 * Principal: read strictly from `client_users` on every call (never from session_360's first row,
 * never from a cookie claim, never from the BigQuery fallback). A disabled person or a revoked
 * grant is denied on the next request, not after a session refresh.
 *
 * Authority, per Organization of the principal's client:
 *   1. If the person has any active grant row in that Organization, ONLY grants count there
 *      (explicit governance; a grant outside its window or for an inactive Space confers nothing).
 *   2. Otherwise, a client with exactly ONE active Space keeps today's behaviour: implicit
 *      authority over that Space, every verb.
 *   3. A client with several active Spaces and no grant confers nothing: there is no default
 *      department, and nothing is chosen by row order or by Space metadata.
 * Requested ids only narrow; a forged or foreign id is denied, never widened to the Organization.
 */

type ReadQuery = typeof query

type PrincipalRow = {
  user_id: string
  active: boolean | null
  status: string | null
  tenant_type: string | null
  identity_profile_id: string | null
  client_id: string | null
}

type SpaceRow = {
  space_id: string
  space_public_id: string | null
  organization_id: string
  organization_name: string | null
}

type GrantRow = SpaceRow & { grant_id: string; version: number; verbs: string[] }

const ALL_VERBS: SpaceAccessVerb[] = ['read', 'create']

type ResolvedPrincipal =
  | { ok: true; userId: string; identityProfileId: string | null; clientId: string }
  | { ok: false; reason: 'principal_not_found' | 'principal_inactive' | 'tenant_type_unsupported' }

const readPrincipal = async (userId: string, readQuery: ReadQuery): Promise<ResolvedPrincipal> => {
  const rows = await readQuery<PrincipalRow>(
    `SELECT user_id, active, status, tenant_type, identity_profile_id, client_id
       FROM greenhouse_core.client_users
      WHERE user_id = $1`,
    [userId]
  )

  if (rows.length !== 1) return { ok: false, reason: 'principal_not_found' }
  const row = rows[0]

  if (row.active !== true || row.status !== 'active') return { ok: false, reason: 'principal_inactive' }
  if (row.tenant_type !== 'client' || !row.client_id) return { ok: false, reason: 'tenant_type_unsupported' }

  // A user without an identity profile can hold no grant (grants are per person), but still keeps the
  // single-Space behaviour, which derives from being a user of the client. Measured 2026-11-06: 2 of 7
  // active client users have no profile.
  return { ok: true, userId: row.user_id, identityProfileId: row.identity_profile_id, clientId: row.client_id }
}

const listAuthorizedSpacesForPrincipal = async (
  principal: { identityProfileId: string | null; clientId: string },
  need: SpaceAccessVerb,
  readQuery: ReadQuery
): Promise<AuthorizedSpace[]> => {
  const profileId = principal.identityProfileId

  const [grants, governedOrganizations, clientSpaces] = await Promise.all([
    profileId === null ? Promise.resolve([] as GrantRow[]) : readQuery<GrantRow>(
      `SELECT g.grant_id, g.version, g.verbs, s.space_id, s.public_id AS space_public_id,
              s.organization_id, o.organization_name
         FROM greenhouse_core.space_access_grants g
         JOIN greenhouse_core.spaces s
           ON s.space_id = g.space_id AND s.organization_id = g.organization_id AND s.active = true
         JOIN greenhouse_core.organizations o
           ON o.organization_id = s.organization_id AND o.active = true
        WHERE g.identity_profile_id = $1
          AND s.client_id = $2
          AND g.active = true
          AND g.valid_from <= now()
          AND (g.valid_to IS NULL OR g.valid_to > now())
          AND $3 = ANY (g.verbs)`,
      [profileId, principal.clientId, need]
    ),
    profileId === null ? Promise.resolve([] as { organization_id: string }[]) : readQuery<{ organization_id: string }>(
      `SELECT DISTINCT organization_id
         FROM greenhouse_core.space_access_grants
        WHERE identity_profile_id = $1 AND active = true`,
      [profileId]
    ),
    readQuery<SpaceRow>(
      `SELECT s.space_id, s.public_id AS space_public_id, s.organization_id, o.organization_name
         FROM greenhouse_core.spaces s
         JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id AND o.active = true
        WHERE s.client_id = $1 AND s.active = true`,
      [principal.clientId]
    )
  ])

  const authorized: AuthorizedSpace[] = grants.map(row => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    spaceId: row.space_id,
    spacePublicId: row.space_public_id,
    verbs: ALL_VERBS.filter(verb => row.verbs.includes(verb)),
    grantId: row.grant_id,
    grantVersion: Number(row.version),
    source: 'explicit_grant' as const
  }))

  const governed = new Set(governedOrganizations.map(row => row.organization_id))

  if (clientSpaces.length === 1 && !governed.has(clientSpaces[0].organization_id)) {
    const space = clientSpaces[0]

    authorized.push({
      organizationId: space.organization_id,
      organizationName: space.organization_name,
      spaceId: space.space_id,
      spacePublicId: space.space_public_id,
      verbs: [...ALL_VERBS],
      grantId: `implicit:single-space:${space.space_id}`,
      grantVersion: 0,
      source: 'single_space_client'
    })
  }

  // Byte order, so the enumeration is stable regardless of collation or row order.
  return authorized.sort((a, b) => (a.spaceId < b.spaceId ? -1 : a.spaceId > b.spaceId ? 1 : 0))
}

/** Spaces the user may act on with `need`. Empty when the principal is not eligible. */
export const listAuthorizedSpaces = async (
  userId: string,
  need: SpaceAccessVerb,
  { readQuery = query }: { readQuery?: ReadQuery } = {}
): Promise<AuthorizedSpace[]> => {
  const principal = await readPrincipal(userId, readQuery)

  if (!principal.ok) return []

  return listAuthorizedSpacesForPrincipal(principal, need, readQuery)
}

const toContext = (
  principal: { userId: string; identityProfileId: string | null },
  space: AuthorizedSpace,
  need: SpaceAccessVerb,
  serviceId: string | null
): AuthorizedSpaceContext => ({
  userId: principal.userId,
  identityProfileId: principal.identityProfileId,
  organizationId: space.organizationId,
  spaceId: space.spaceId,
  serviceId,
  need,
  grantId: space.grantId,
  grantVersion: space.grantVersion,
  source: space.source
})

export const resolveSpaceContext = async (
  request: SpaceContextRequest,
  { readQuery = query }: { readQuery?: ReadQuery } = {}
): Promise<SpaceContextResolution> => {
  const principal = await readPrincipal(request.userId, readQuery)

  if (!principal.ok) return { status: 'denied', reason: principal.reason }

  const everyAllowed = await listAuthorizedSpacesForPrincipal(principal, request.need, readQuery)

  const allowed = everyAllowed.filter(
    space => !request.organizationId || space.organizationId === request.organizationId
  )

  let selected: AuthorizedSpace | undefined

  if (request.spaceId) {
    selected = allowed.find(space => space.spaceId === request.spaceId)

    if (!selected) {
      const elsewhere = everyAllowed.some(space => space.spaceId === request.spaceId)

      return { status: 'denied', reason: elsewhere ? 'organization_mismatch' : 'space_not_allowed' }
    }
  } else if (allowed.length === 1) {
    selected = allowed[0]
  } else if (allowed.length > 1) {
    return { status: 'selection_required', candidates: allowed }
  } else {
    return { status: 'denied', reason: 'grant_required' }
  }

  if (request.serviceId) {
    const services = await readQuery<{ service_id: string }>(
      `SELECT service_id
         FROM greenhouse_core.services
        WHERE service_id = $1 AND space_id = $2 AND active = true
          AND (organization_id IS NULL OR organization_id = $3)`,
      [request.serviceId, selected.spaceId, selected.organizationId]
    )

    if (services.length !== 1) return { status: 'denied', reason: 'service_not_in_space' }
  }

  return { status: 'authorized', context: toContext(principal, selected, request.need, request.serviceId ?? null) }
}

/**
 * Re-check a context selected earlier (another tab, a long-running write) before using it.
 * The grant id and version must still match: a revoke/regrant in between makes it stale.
 */
export const revalidateSpaceContext = async (
  authenticatedUserId: string,
  context: AuthorizedSpaceContext,
  { readQuery = query }: { readQuery?: ReadQuery } = {}
): Promise<SpaceContextResolution> => {
  if (context.userId !== authenticatedUserId) return { status: 'denied', reason: 'space_not_allowed' }

  const current = await resolveSpaceContext(
    {
      userId: authenticatedUserId,
      need: context.need,
      spaceId: context.spaceId,
      organizationId: context.organizationId,
      serviceId: context.serviceId
    },
    { readQuery }
  )

  if (current.status !== 'authorized') return current

  if (current.context.grantId !== context.grantId || current.context.grantVersion !== context.grantVersion) {
    return { status: 'denied', reason: 'context_stale' }
  }

  return current
}
