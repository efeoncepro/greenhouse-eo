import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type CanonicalPersonPortalAccessState =
  | 'active'
  | 'missing_principal'
  | 'degraded_link'
  | 'inactive'

export type CanonicalPersonResolutionSource =
  | 'person_360'
  | 'direct_user'
  | 'direct_member'
  | 'fallback'

export interface CanonicalPersonRecord {
  identityProfileId: string | null
  memberId: string | null
  userId: string | null
  eoId: string | null
  displayName: string
  canonicalEmail: string | null
  portalEmail: string | null
  portalDisplayName: string | null
  memberEmail: string | null
  tenantType: 'client' | 'efeonce_internal' | null
  portalAccessState: CanonicalPersonPortalAccessState
  resolutionSource: CanonicalPersonResolutionSource
  roleCodes: string[]
  routeGroups: string[]
  hasIdentityFacet: boolean
  hasMemberFacet: boolean
  hasUserFacet: boolean
}

type Person360Row = Record<string, unknown> & {
  identity_profile_id: string
  member_id: string | null
  user_id: string | null
  eo_id: string | null
  resolved_display_name: string | null
  canonical_email: string | null
  resolved_email: string | null
  user_email: string | null
  user_full_name: string | null
  member_email: string | null
  tenant_type: string | null
  user_status: string | null
  user_active: boolean | null
  has_member_facet: boolean | null
  has_user_facet: boolean | null
  active_role_codes: string[] | null
  route_groups: string[] | null
}

type DirectMemberRow = Record<string, unknown> & {
  identity_profile_id: string | null
  member_id: string
  user_id: string | null
  eo_id: string | null
  resolved_display_name: string | null
  canonical_email: string | null
  user_email: string | null
  user_full_name: string | null
  member_email: string | null
  tenant_type: string | null
  user_status: string | null
  user_active: boolean | null
  has_member_facet: boolean | null
  has_user_facet: boolean | null
  active_role_codes: string[] | null
  route_groups: string[] | null
}

type DirectUserRow = Record<string, unknown> & {
  identity_profile_id: string | null
  member_id: string | null
  user_id: string
  eo_id: string | null
  resolved_display_name: string | null
  canonical_email: string | null
  user_email: string | null
  user_full_name: string | null
  member_email: string | null
  tenant_type: string | null
  user_status: string | null
  user_active: boolean | null
  has_member_facet: boolean | null
  has_user_facet: boolean | null
  active_role_codes: string[] | null
  route_groups: string[] | null
}

const normalizeString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : []

const isActivePortalPrincipal = (userId: string | null, userActive: boolean | null, userStatus: string | null) =>
  Boolean(userId && userActive === true && userStatus === 'active')

const derivePortalAccessState = ({
  identityProfileId,
  memberId,
  userId,
  userActive,
  userStatus
}: {
  identityProfileId: string | null
  memberId: string | null
  userId: string | null
  userActive: boolean | null
  userStatus: string | null
}): CanonicalPersonPortalAccessState => {
  if (isActivePortalPrincipal(userId, userActive, userStatus)) {
    return identityProfileId ? 'active' : 'degraded_link'
  }

  if (userId) {
    return 'inactive'
  }

  if (identityProfileId || memberId) {
    return 'missing_principal'
  }

  return 'degraded_link'
}

const toCanonicalPersonRecord = (
  row: Person360Row | DirectMemberRow | DirectUserRow,
  resolutionSource: CanonicalPersonResolutionSource
): CanonicalPersonRecord => {
  const identityProfileId = normalizeString(row.identity_profile_id)
  const memberId = normalizeString(row.member_id)
  const userId = normalizeString(row.user_id)
  const eoId = normalizeString(row.eo_id)

  const displayName =
    normalizeString(row.resolved_display_name) ??
    normalizeString(row.user_full_name) ??
    'Sin nombre'

  const canonicalEmail =
    normalizeString(row.canonical_email) ??
    normalizeString(row.user_email) ??
    normalizeString(row.member_email)

  const portalEmail = normalizeString(row.user_email)
  const portalDisplayName = normalizeString(row.user_full_name)
  const memberEmail = normalizeString(row.member_email)
  const tenantTypeValue = normalizeString(row.tenant_type)

  const tenantType =
    tenantTypeValue === 'client' || tenantTypeValue === 'efeonce_internal'
      ? tenantTypeValue
      : null

  const userStatus = normalizeString(row.user_status)
  const userActive = typeof row.user_active === 'boolean' ? row.user_active : null

  return {
    identityProfileId,
    memberId,
    userId,
    eoId,
    displayName,
    canonicalEmail,
    portalEmail,
    portalDisplayName,
    memberEmail,
    tenantType,
    portalAccessState: derivePortalAccessState({
      identityProfileId,
      memberId,
      userId,
      userActive,
      userStatus
    }),
    resolutionSource,
    roleCodes: normalizeStringArray(row.active_role_codes),
    routeGroups: normalizeStringArray(row.route_groups),
    hasIdentityFacet: Boolean(identityProfileId),
    hasMemberFacet: row.has_member_facet === true || Boolean(memberId),
    hasUserFacet: row.has_user_facet === true || Boolean(userId)
  }
}

const uniqueIdentifiers = (values: string[]) =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))

const getPeopleFromPerson360 = async ({
  ids,
  whereColumn
}: {
  ids: string[]
  whereColumn: 'identity_profile_id' | 'member_id' | 'user_id'
}) => {
  if (ids.length === 0) {
    return []
  }

  return runGreenhousePostgresQuery<Person360Row>(
    `SELECT
       p.identity_profile_id,
       p.member_id,
       p.user_id,
       p.eo_id,
       p.resolved_display_name,
       p.canonical_email,
       p.resolved_email,
       p.user_email,
       p.user_full_name,
       p.member_email,
       p.tenant_type,
       p.user_status,
       p.user_active,
       p.has_member_facet,
       p.has_user_facet,
       p.active_role_codes,
       COALESCE(s.route_groups, ARRAY[]::text[]) AS route_groups
     FROM greenhouse_serving.person_360 AS p
     LEFT JOIN greenhouse_serving.session_360 AS s
       ON s.user_id = p.user_id
     WHERE p.${whereColumn} = ANY($1::text[])`,
    [ids]
  )
}

const getDirectMembers = async (memberIds: string[]) => {
  if (memberIds.length === 0) {
    return []
  }

  return runGreenhousePostgresQuery<DirectMemberRow>(
    `SELECT
       m.identity_profile_id,
       m.member_id,
       cu.user_id,
       ip.public_id AS eo_id,
       COALESCE(m.display_name, ip.full_name, cu.full_name, 'Sin nombre') AS resolved_display_name,
       ip.canonical_email,
       cu.email AS user_email,
       cu.full_name AS user_full_name,
       m.primary_email AS member_email,
       cu.tenant_type,
       cu.status AS user_status,
       cu.active AS user_active,
       TRUE AS has_member_facet,
       (cu.user_id IS NOT NULL) AS has_user_facet,
       COALESCE(role_agg.active_role_codes, ARRAY[]::text[]) AS active_role_codes,
       COALESCE(s.route_groups, ARRAY[]::text[]) AS route_groups
     FROM greenhouse_core.members AS m
     LEFT JOIN greenhouse_core.identity_profiles AS ip
       ON ip.profile_id = m.identity_profile_id
     LEFT JOIN LATERAL (
       SELECT cu.user_id, cu.email, cu.full_name, cu.tenant_type, cu.status, cu.active
       FROM greenhouse_core.client_users AS cu
       WHERE cu.member_id = m.member_id
          OR (m.identity_profile_id IS NOT NULL AND cu.identity_profile_id = m.identity_profile_id)
       ORDER BY
         CASE WHEN cu.member_id = m.member_id THEN 0 ELSE 1 END,
         cu.active DESC,
         cu.created_at ASC
       LIMIT 1
     ) AS cu ON TRUE
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(DISTINCT ura.role_code) FILTER (
         WHERE ura.active
           AND ura.role_code IS NOT NULL
       ) AS active_role_codes
       FROM greenhouse_core.user_role_assignments AS ura
       WHERE ura.user_id = cu.user_id
     ) AS role_agg ON TRUE
     LEFT JOIN greenhouse_serving.session_360 AS s
       ON s.user_id = cu.user_id
     WHERE m.member_id = ANY($1::text[])`,
    [memberIds]
  )
}

const getDirectUsers = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return []
  }

  return runGreenhousePostgresQuery<DirectUserRow>(
    `SELECT
       cu.identity_profile_id,
       COALESCE(cu.member_id, m.member_id) AS member_id,
       cu.user_id,
       ip.public_id AS eo_id,
       COALESCE(m.display_name, ip.full_name, cu.full_name, 'Sin nombre') AS resolved_display_name,
       ip.canonical_email,
       cu.email AS user_email,
       cu.full_name AS user_full_name,
       m.primary_email AS member_email,
       cu.tenant_type,
       cu.status AS user_status,
       cu.active AS user_active,
       (COALESCE(cu.member_id, m.member_id) IS NOT NULL) AS has_member_facet,
       TRUE AS has_user_facet,
       COALESCE(role_agg.active_role_codes, ARRAY[]::text[]) AS active_role_codes,
       COALESCE(s.route_groups, ARRAY[]::text[]) AS route_groups
     FROM greenhouse_core.client_users AS cu
     LEFT JOIN greenhouse_core.identity_profiles AS ip
       ON ip.profile_id = cu.identity_profile_id
     LEFT JOIN greenhouse_core.members AS m
       ON (
         (cu.member_id IS NOT NULL AND m.member_id = cu.member_id)
         OR (
           cu.identity_profile_id IS NOT NULL
           AND m.identity_profile_id = cu.identity_profile_id
         )
       )
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(DISTINCT ura.role_code) FILTER (
         WHERE ura.active
           AND ura.role_code IS NOT NULL
       ) AS active_role_codes
       FROM greenhouse_core.user_role_assignments AS ura
       WHERE ura.user_id = cu.user_id
     ) AS role_agg ON TRUE
     LEFT JOIN greenhouse_serving.session_360 AS s
       ON s.user_id = cu.user_id
     WHERE cu.user_id = ANY($1::text[])`,
    [userIds]
  )
}

const getDirectProfiles = async (profileIds: string[]) => {
  if (profileIds.length === 0) {
    return []
  }

  return runGreenhousePostgresQuery<DirectMemberRow>(
    `SELECT
       ip.profile_id AS identity_profile_id,
       m.member_id,
       cu.user_id,
       ip.public_id AS eo_id,
       COALESCE(m.display_name, ip.full_name, cu.full_name, 'Sin nombre') AS resolved_display_name,
       ip.canonical_email,
       cu.email AS user_email,
       cu.full_name AS user_full_name,
       m.primary_email AS member_email,
       cu.tenant_type,
       cu.status AS user_status,
       cu.active AS user_active,
       (m.member_id IS NOT NULL) AS has_member_facet,
       (cu.user_id IS NOT NULL) AS has_user_facet,
       COALESCE(role_agg.active_role_codes, ARRAY[]::text[]) AS active_role_codes,
       COALESCE(s.route_groups, ARRAY[]::text[]) AS route_groups
     FROM greenhouse_core.identity_profiles AS ip
     LEFT JOIN greenhouse_core.members AS m
       ON m.identity_profile_id = ip.profile_id
     LEFT JOIN LATERAL (
       SELECT cu.user_id, cu.email, cu.full_name, cu.tenant_type, cu.status, cu.active
       FROM greenhouse_core.client_users AS cu
       WHERE cu.identity_profile_id = ip.profile_id
       ORDER BY cu.active DESC, cu.created_at ASC
       LIMIT 1
     ) AS cu ON TRUE
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(DISTINCT ura.role_code) FILTER (
         WHERE ura.active
           AND ura.role_code IS NOT NULL
       ) AS active_role_codes
       FROM greenhouse_core.user_role_assignments AS ura
       WHERE ura.user_id = cu.user_id
     ) AS role_agg ON TRUE
     LEFT JOIN greenhouse_serving.session_360 AS s
       ON s.user_id = cu.user_id
     WHERE ip.profile_id = ANY($1::text[])`,
    [profileIds]
  )
}

export const getCanonicalPersonsByMemberIds = async (memberIds: string[]) => {
  const uniqueMemberIds = uniqueIdentifiers(memberIds)
  const rows = await getPeopleFromPerson360({ ids: uniqueMemberIds, whereColumn: 'member_id' })
  const recordsByMemberId = new Map<string, CanonicalPersonRecord>()

  for (const row of rows) {
    const record = toCanonicalPersonRecord(row, 'person_360')

    if (record.memberId && !recordsByMemberId.has(record.memberId)) {
      recordsByMemberId.set(record.memberId, record)
    }
  }

  const missingMemberIds = uniqueMemberIds.filter(memberId => !recordsByMemberId.has(memberId))

  if (missingMemberIds.length > 0) {
    const fallbackRows = await getDirectMembers(missingMemberIds)

    for (const row of fallbackRows) {
      const record = toCanonicalPersonRecord(row, 'direct_member')

      if (record.memberId && !recordsByMemberId.has(record.memberId)) {
        recordsByMemberId.set(record.memberId, record)
      }
    }
  }

  return recordsByMemberId
}

export const getCanonicalPersonsByIdentityProfileIds = async (identityProfileIds: string[]) => {
  const uniqueProfileIds = uniqueIdentifiers(identityProfileIds)
  const rows = await getPeopleFromPerson360({ ids: uniqueProfileIds, whereColumn: 'identity_profile_id' })
  const recordsByProfileId = new Map<string, CanonicalPersonRecord>()

  for (const row of rows) {
    const record = toCanonicalPersonRecord(row, 'person_360')

    if (record.identityProfileId && !recordsByProfileId.has(record.identityProfileId)) {
      recordsByProfileId.set(record.identityProfileId, record)
    }
  }

  const missingProfileIds = uniqueProfileIds.filter(profileId => !recordsByProfileId.has(profileId))

  if (missingProfileIds.length > 0) {
    const fallbackRows = await getDirectProfiles(missingProfileIds)

    for (const row of fallbackRows) {
      const record = toCanonicalPersonRecord(row, 'fallback')

      if (record.identityProfileId && !recordsByProfileId.has(record.identityProfileId)) {
        recordsByProfileId.set(record.identityProfileId, record)
      }
    }
  }

  return recordsByProfileId
}

export const getCanonicalPersonsByUserIds = async (userIds: string[]) => {
  const uniqueUserIds = uniqueIdentifiers(userIds)
  const rows = await getPeopleFromPerson360({ ids: uniqueUserIds, whereColumn: 'user_id' })
  const recordsByUserId = new Map<string, CanonicalPersonRecord>()

  for (const row of rows) {
    const record = toCanonicalPersonRecord(row, 'person_360')

    if (record.userId && !recordsByUserId.has(record.userId)) {
      recordsByUserId.set(record.userId, record)
    }
  }

  const missingUserIds = uniqueUserIds.filter(userId => !recordsByUserId.has(userId))

  if (missingUserIds.length > 0) {
    const fallbackRows = await getDirectUsers(missingUserIds)

    for (const row of fallbackRows) {
      const record = toCanonicalPersonRecord(row, 'direct_user')

      if (record.userId && !recordsByUserId.has(record.userId)) {
        recordsByUserId.set(record.userId, record)
      }
    }
  }

  return recordsByUserId
}

export const getCanonicalPersonByMemberId = async (memberId: string) =>
  (await getCanonicalPersonsByMemberIds([memberId])).get(memberId.trim()) ?? null

export const getCanonicalPersonByIdentityProfileId = async (identityProfileId: string) =>
  (await getCanonicalPersonsByIdentityProfileIds([identityProfileId])).get(identityProfileId.trim()) ?? null

export const getCanonicalPersonByUserId = async (userId: string) =>
  (await getCanonicalPersonsByUserIds([userId])).get(userId.trim()) ?? null
