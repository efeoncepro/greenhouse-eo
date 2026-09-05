/** Corporate provenance and session are committed together; no usable cookie precedes this transaction. */
import { withTransaction, query } from '@/lib/db'
import type { PersonSessionRecord } from '../persons/types'
import type { CorporateSessionEvidence } from './context'
import type { UpstreamIdentity } from './oidc'

export const insertCorporateSession = async (
  record: PersonSessionRecord,
  upstreamLinkId: string,
  identity: UpstreamIdentity
): Promise<void> => {
  await withTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_auth.sessions
       (session_hash,subject,environment_id,profile_id,link_id,amr,auth_time,step_up_at,created_at,last_seen_at,
        expires_at,absolute_expires_at,revoked_at,revoke_reason,ip_hash,user_agent_hash,correlation_id)
       VALUES ($1,$2,$3,$4,$5,$6::text[],$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        record.sessionHash,
        record.subject,
        record.environmentId,
        record.profileId,
        record.linkId,
        record.amr,
        record.authTime,
        record.stepUpAt,
        record.createdAt,
        record.lastSeenAt,
        record.expiresAt,
        record.absoluteExpiresAt,
        record.revokedAt,
        record.revokeReason,
        record.ipHash,
        record.userAgentHash,
        record.correlationId
      ]
    )
    await client.query(
      `INSERT INTO greenhouse_auth.corporate_session_evidence
       (session_hash,upstream_link_id,tenant_id,object_id,upstream_issuer,authenticated_at)
       VALUES ($1,$2,$3::uuid,$4::uuid,$5,$6)`,
      [record.sessionHash, upstreamLinkId, identity.tenantId, identity.objectId, identity.issuer, identity.authTime]
    )
  })
}

export const getCorporateSessionEvidence = async (sessionHash: string): Promise<CorporateSessionEvidence | null> => {
  const rows = await query<{
    session_hash: string
    environment_id: string
    subject: string
    profile_id: string
    upstream_link_id: string
    authenticated_at: Date
    expires_at: Date
    revoked_at: Date | null
  }>(
    `SELECT s.session_hash,s.environment_id,s.subject,s.profile_id,e.upstream_link_id,e.authenticated_at,
            LEAST(s.expires_at,s.absolute_expires_at) AS expires_at,s.revoked_at
       FROM greenhouse_auth.sessions s
       JOIN greenhouse_auth.corporate_session_evidence e USING (session_hash)
      WHERE s.session_hash=$1`,
    [sessionHash]
  )

  const row = rows[0]

  return row
    ? {
        sessionHash: row.session_hash,
        environmentId: row.environment_id,
        subject: row.subject,
        profileId: row.profile_id,
        upstreamLinkId: row.upstream_link_id,
        provenance: 'entra_oidc',
        authTime: new Date(row.authenticated_at),
        expiresAt: new Date(row.expires_at),
        revokedAt: row.revoked_at ? new Date(row.revoked_at) : null
      }
    : null
}
