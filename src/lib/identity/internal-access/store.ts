/** TASK-1836. Canonical internal authority: no email, issuer-class or invitation inference. */
import type { PoolClient } from 'pg'

import { query } from '@/lib/db'

export const INTERNAL_ORGANIZATION_PUBLIC_ID = 'EO-ORG-0007'
export type InternalIdentity = {
  subject: string
  profileId: string
  nativeLinkId: string
  upstreamLinkId: string
  bindingId: string
  organizationId: string
  environmentId: string
  grantsVersion: number
}
type Row = Record<string, unknown> & {
  subject: string
  profile_id: string
  native_link_id: string
  upstream_link_id: string
  binding_id: string
  organization_id: string
  environment_id: string
  grants_version: number | string
  capabilities: string[]
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const validUpstream = (tenantId: string, objectId: string, issuer: string): boolean =>
  UUID.test(tenantId) &&
  UUID.test(objectId) &&
  issuer === `https://login.microsoftonline.com/${tenantId.toLowerCase()}/v2.0`

/** Kept in one query so every resolution observes one committed snapshot of all authorities. */
export const ELIGIBLE_IDENTITY_FROM = `
 FROM greenhouse_core.identity_profiles p
 JOIN greenhouse_core.client_users u ON u.identity_profile_id = p.profile_id
 JOIN greenhouse_core.members m ON m.member_id = u.member_id AND m.identity_profile_id = p.profile_id
 JOIN greenhouse_core.identity_profile_source_links upstream ON upstream.profile_id = p.profile_id
   AND upstream.source_system = 'azure_ad' AND upstream.source_object_type = 'user'
   AND lower(upstream.source_object_id) = lower(u.microsoft_oid)
 JOIN greenhouse_core.organizations o ON o.public_id = 'EO-ORG-0007'
 WHERE p.active = TRUE AND p.status = 'active' AND p.merged_into_profile_id IS NULL
   AND p.profile_type = 'efeonce_internal' AND u.active = TRUE AND u.status = 'active'
   AND u.tenant_type = 'efeonce_internal' AND m.active = TRUE
   AND lower(m.azure_oid) = lower(u.microsoft_oid) AND upstream.active = TRUE
   AND NOT EXISTS (SELECT 1 FROM greenhouse_core.identity_profile_source_links conflicting
     WHERE conflicting.source_system='azure_ad' AND conflicting.source_object_type='user'
       AND lower(conflicting.source_object_id)=lower(upstream.source_object_id)
       AND conflicting.active=TRUE AND conflicting.profile_id<>p.profile_id)
   AND NOT EXISTS (SELECT 1 FROM greenhouse_core.client_users conflicting_user
     WHERE lower(conflicting_user.microsoft_tenant_id)=lower(u.microsoft_tenant_id)
       AND lower(conflicting_user.microsoft_oid)=lower(u.microsoft_oid)
       AND conflicting_user.active=TRUE AND conflicting_user.identity_profile_id IS DISTINCT FROM p.profile_id)
   AND o.active = TRUE AND o.status='active' AND o.is_operating_entity = TRUE
   AND EXISTS (SELECT 1 FROM greenhouse_core.person_memberships pm
     WHERE pm.profile_id = p.profile_id AND pm.organization_id = o.organization_id
       AND pm.membership_type = 'team_member' AND pm.active = TRUE AND pm.status = 'active')
   AND EXISTS (SELECT 1 FROM greenhouse_core.person_legal_entity_relationships r
     WHERE r.profile_id = p.profile_id AND r.legal_entity_organization_id = o.organization_id
       AND r.relationship_type IN ('employee','contractor','executive') AND r.status = 'active'
       AND r.effective_from <= CURRENT_DATE AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE))`

const AUTHORITY = `WITH eligible AS (
 SELECT p.profile_id, upstream.link_id AS upstream_link_id, o.organization_id,
   u.microsoft_tenant_id, u.microsoft_oid ${ELIGIBLE_IDENTITY_FROM}
)
SELECT n.source_object_id AS subject, e.profile_id, e.native_link_id, e.upstream_link_id,
 e.binding_id, b.organization_id, e.environment_id, b.grants_version,
 ARRAY(SELECT DISTINCT g.capability FROM greenhouse_core.external_capability_grants g
   WHERE g.binding_id = b.binding_id AND g.status = 'active' AND g.expires_at > NOW()
     AND g.profile_id = e.profile_id ORDER BY g.capability) AS capabilities
FROM greenhouse_core.internal_native_enrollments e
JOIN eligible p ON p.profile_id = e.profile_id AND p.upstream_link_id = e.upstream_link_id
 AND p.organization_id = (SELECT organization_id FROM greenhouse_core.external_organization_bindings WHERE binding_id=e.binding_id)
 AND lower(p.microsoft_tenant_id) = e.tenant_id::text AND lower(p.microsoft_oid) = e.object_id::text
JOIN greenhouse_core.external_identity_environments env ON env.environment_id=e.environment_id AND env.status='active'
JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=e.binding_id AND b.environment_id=e.environment_id AND b.status='active' AND b.population='internal'
JOIN greenhouse_core.identity_profile_source_links n ON n.link_id=e.native_link_id AND n.profile_id=e.profile_id
 AND n.source_system='external_idp:' || e.environment_id AND n.source_object_type='subject'
 AND n.active=TRUE AND n.is_login_identity=TRUE
WHERE e.status='active'`

const map = (row: Row): InternalIdentity => ({
  subject: row.subject,
  profileId: row.profile_id,
  nativeLinkId: row.native_link_id,
  upstreamLinkId: row.upstream_link_id,
  bindingId: row.binding_id,
  organizationId: row.organization_id,
  environmentId: row.environment_id,
  grantsVersion: Number(row.grants_version)
})

export const resolveEnrolledInternalIdentity = async (input: {
  environmentId: string
  tenantId: string
  objectId: string
  issuer: string
}): Promise<InternalIdentity | null> => {
  if (!validUpstream(input.tenantId, input.objectId, input.issuer)) return null

  const rows = await query<Row>(
    `${AUTHORITY} AND e.environment_id=$1 AND e.tenant_id=$2::uuid AND e.object_id=$3::uuid`,
    [input.environmentId, input.tenantId, input.objectId]
  )

  return rows.length === 1 ? map(rows[0]) : null
}

export const resolveInternalAuthority = async (input: {
  environmentId: string
  subject: string
  profileId: string
  bindingId: string
}) => {
  const rows = await query<Row>(
    `${AUTHORITY} AND e.environment_id=$1 AND n.source_object_id=$2 AND e.profile_id=$3 AND e.binding_id=$4`,
    [input.environmentId, input.subject, input.profileId, input.bindingId]
  )

  if (rows.length !== 1) return null
  const row = rows[0]

  return {
    ...map(row),
    population: 'internal' as const,
    eligible: true,
    bindingActive: true,
    sourceLinkActive: true,
    capabilities: row.capabilities
  }
}

export const loadEnrollmentCandidate = async (
  client: PoolClient,
  input: {
    profileId: string
    tenantId: string
    objectId: string
  }
) => {
  const { rows } = await client.query<{ profile_id: string; upstream_link_id: string; organization_id: string }>(
    `SELECT p.profile_id, upstream.link_id AS upstream_link_id, o.organization_id ${ELIGIBLE_IDENTITY_FROM}
 AND p.profile_id=$1 AND lower(u.microsoft_tenant_id)=$2 AND lower(u.microsoft_oid)=$3
 FOR SHARE OF p,u,m,upstream,o`,
    [input.profileId, input.tenantId.toLowerCase(), input.objectId.toLowerCase()]
  )

  return rows.length === 1 ? rows[0] : null
}

/** Session provenance chooses its already-enrolled binding; request parameters cannot choose authority. */
export const resolveInternalSessionIdentity = async (input: {
  environmentId: string
  subject: string
  profileId: string
  upstreamLinkId: string
}): Promise<InternalIdentity | null> => {
  const rows = await query<Row>(
    `${AUTHORITY} AND e.environment_id=$1 AND n.source_object_id=$2 AND e.profile_id=$3 AND e.upstream_link_id=$4`,
    [input.environmentId, input.subject, input.profileId, input.upstreamLinkId]
  )

  return rows.length === 1 ? map(rows[0]) : null
}
