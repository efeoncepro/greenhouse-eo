import { query } from '@/lib/db'
import { ELIGIBLE_IDENTITY_FROM, validUpstream } from '@/lib/identity/internal-access/store'
import { sha256Hex } from '../oauth/primitives'
import { readCookie } from '../persons/sessions'
import type { FirstPartyIdentity, FirstPartyIdentityPort } from './types'

/** Existing canonical enrollment is still required; a delegated MCP binding/capability is not. */
export const resolveFirstPartyCorporateIdentity = async (input: {
  environmentId: string; tenantId: string; objectId: string; issuer: string
}, readQuery = query) => {
  if (!validUpstream(input.tenantId, input.objectId, input.issuer)) return null

  const rows = await readQuery<{
    subject: string; profileId: string; nativeLinkId: string; upstreamLinkId: string; environmentId: string
  }>(`WITH eligible AS (SELECT p.profile_id, upstream.link_id AS upstream_link_id,
      u.microsoft_tenant_id, u.microsoft_oid ${ELIGIBLE_IDENTITY_FROM})
    SELECT link.source_object_id AS subject, e.profile_id AS "profileId", e.native_link_id AS "nativeLinkId",
      e.upstream_link_id AS "upstreamLinkId", e.environment_id AS "environmentId"
    FROM greenhouse_core.internal_native_enrollments e
    JOIN eligible p ON p.profile_id=e.profile_id AND p.upstream_link_id=e.upstream_link_id
      AND lower(p.microsoft_tenant_id)=e.tenant_id::text AND lower(p.microsoft_oid)=e.object_id::text
    JOIN greenhouse_core.external_identity_environments env ON env.environment_id=e.environment_id AND env.status='active'
    JOIN greenhouse_core.identity_profile_source_links link ON link.link_id=e.native_link_id AND link.profile_id=e.profile_id
      AND link.active=TRUE AND link.is_login_identity=TRUE AND link.source_object_type='subject'
      AND link.source_system='external_idp:' || e.environment_id
    WHERE e.status='active' AND e.environment_id=$1 AND e.tenant_id=$2::uuid AND e.object_id=$3::uuid`,
  [input.environmentId,input.tenantId,input.objectId])

  return rows.length === 1 ? rows[0] : null
}

/** One committed snapshot; no delegated context, grant, email matching or product membership. */
export const createFirstPartyIdentityPort = (config: { environmentId: string; sessionCookieName: string }, readQuery = query): FirstPartyIdentityPort => {
  const resolveSession = async (sessionHash: string, now: Date): Promise<FirstPartyIdentity | null> => {
    const rows = await readQuery<FirstPartyIdentity & Record<string, unknown>>(
      `WITH eligible_corporate AS (SELECT p.profile_id, upstream.link_id AS upstream_link_id, u.microsoft_tenant_id, u.microsoft_oid ${ELIGIBLE_IDENTITY_FROM})
       SELECT s.session_hash AS "sessionHash", s.subject, s.profile_id AS "profileId", s.environment_id AS "environmentId",
         s.auth_time AS "authTime", LEAST(s.expires_at,s.absolute_expires_at) AS "expiresAt"
       FROM greenhouse_auth.sessions s
       JOIN greenhouse_core.identity_profile_source_links link ON link.link_id=s.link_id AND link.profile_id=s.profile_id
         AND link.active=TRUE AND link.is_login_identity=TRUE AND link.source_object_type='subject'
         AND link.source_system='external_idp:' || s.environment_id AND link.source_object_id=s.subject
       JOIN greenhouse_core.identity_profiles profile ON profile.profile_id=s.profile_id
         AND profile.active=TRUE AND profile.status='active' AND profile.merged_into_profile_id IS NULL
       JOIN greenhouse_core.external_identity_environments env ON env.environment_id=s.environment_id AND env.status='active'
       LEFT JOIN greenhouse_auth.corporate_session_evidence evidence ON evidence.session_hash=s.session_hash
       WHERE s.session_hash=$1 AND s.environment_id=$2 AND s.revoked_at IS NULL AND s.expires_at>$3 AND s.absolute_expires_at>$3
       AND (
         ('entra_oidc'=ANY(s.amr) AND evidence.session_hash IS NOT NULL
           AND evidence.authenticated_at=s.auth_time
           AND evidence.upstream_issuer='https://login.microsoftonline.com/' || evidence.tenant_id::text || '/v2.0' AND EXISTS (
           SELECT 1 FROM eligible_corporate eligible
           JOIN greenhouse_core.internal_native_enrollments e ON e.profile_id=eligible.profile_id AND e.upstream_link_id=eligible.upstream_link_id
           WHERE eligible.profile_id=s.profile_id AND eligible.upstream_link_id=evidence.upstream_link_id
             AND e.native_link_id=s.link_id AND e.environment_id=s.environment_id AND e.status='active'
             AND e.tenant_id=evidence.tenant_id AND e.object_id=evidence.object_id
             AND lower(eligible.microsoft_tenant_id)=e.tenant_id::text AND lower(eligible.microsoft_oid)=e.object_id::text))
         OR (NOT ('entra_oidc'=ANY(s.amr)) AND evidence.session_hash IS NULL)
       )`, [sessionHash,config.environmentId,now])

    return rows.length === 1 ? rows[0] : null
  }

  return {
    resolveSession,
    resolveRequest: async (request, now) => {
      const cookie = readCookie(request.headers.get('cookie'), config.sessionCookieName)

      return cookie ? resolveSession(sha256Hex(cookie), now) : null
    }
  }
}
