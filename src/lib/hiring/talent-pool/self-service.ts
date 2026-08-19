import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import type { PoolClient } from 'pg'

import { HiringNotFoundError } from '@/lib/hiring/errors'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type { TalentPoolLifecycle } from './contracts'
import { deriveTalentPoolAccess } from './policy'

const TOKEN_TTL_DAYS = 30
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

type MembershipTokenRow = {
  membership_id: string
  public_id: string
  lifecycle_status: TalentPoolLifecycle
  future_consent_expires_at: Date | string | null
  aggregate_version: number
  availability: string | null
  expires_at: Date | string
  revoked_at: Date | string | null
}

export const ensureTalentPoolMembership = async ({
  candidateFacetId,
  actorUserId = null
}: {
  candidateFacetId: string
  actorUserId?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_hiring.talent_pool_membership
      (candidate_facet_id,lifecycle_status,backfill_classification,created_by)
     VALUES ($1,'active_process','active_process',$2)
     ON CONFLICT (candidate_facet_id) DO NOTHING`,
      [candidateFacetId, actorUserId]
    )

    const result = await client.query<{ membership_id: string; public_id: string }>(
      `SELECT membership_id,public_id FROM greenhouse_hiring.talent_pool_membership WHERE candidate_facet_id=$1`,
      [candidateFacetId]
    )

    return result.rows[0]
  })

export const issueTalentPoolSelfServiceToken = async ({
  membershipId,
  issuedBy = null
}: {
  membershipId: string
  issuedBy?: string | null
}) => {
  return withGreenhousePostgresTransaction(client => issueTalentPoolSelfServiceTokenWithClient(client, {
    membershipId,
    issuedBy
  }))
}

export const issueTalentPoolSelfServiceTokenWithClient = async (
  client: PoolClient,
  {
    membershipId,
    consentEventId,
    issuedBy = null
  }: {
    membershipId: string
    consentEventId?: string
    issuedBy?: string | null
  }
) => {
  if (consentEventId) {
    const eligible = await client.query<{ consent_event_id: string }>(
      `SELECT ce.consent_event_id
         FROM greenhouse_hiring.talent_pool_membership m
         JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
         JOIN greenhouse_hiring.talent_pool_consent_event ce ON ce.membership_id=m.membership_id
        WHERE m.membership_id=$1 AND ce.consent_event_id=$2
          AND ce.purpose='future_opportunities' AND ce.action='requested'
          AND m.lifecycle_status<>'withdrawn' AND cf.consent_status<>'withdrawn'
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_hiring.talent_pool_consent_event later
             WHERE later.membership_id=ce.membership_id
               AND later.purpose='future_opportunities'
               AND later.consent_event_id<>ce.consent_event_id
               AND (later.effective_at,later.occurred_at,later.consent_event_id)
                   >(ce.effective_at,ce.occurred_at,ce.consent_event_id)
          )
        FOR UPDATE OF m,cf,ce`,
      [membershipId, consentEventId]
    )

    if (!eligible.rows[0]) return null
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000)

  await client.query(
    `UPDATE greenhouse_hiring.talent_pool_self_service_token SET revoked_at=NOW()
        WHERE membership_id=$1 AND revoked_at IS NULL`,
    [membershipId]
  )
  await client.query(
    `INSERT INTO greenhouse_hiring.talent_pool_self_service_token
        (membership_id,access_token_hash,expires_at,issued_by) VALUES ($1,$2,$3,$4)`,
    [membershipId, hashToken(token), expiresAt, issuedBy]
  )

  return { token, expiresAt: expiresAt.toISOString(), tokenTtlDays: TOKEN_TTL_DAYS }
}

export const resolveTalentPoolSelfServiceToken = async (token: string) => {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token))
    throw new HiringNotFoundError('Enlace no disponible.', 'talent_pool_link_unavailable')

  const rows = await runGreenhousePostgresQuery<MembershipTokenRow>(
    `UPDATE greenhouse_hiring.talent_pool_self_service_token t SET last_used_at=NOW()
      FROM greenhouse_hiring.talent_pool_membership m
      JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
     WHERE t.membership_id=m.membership_id AND t.access_token_hash=$1 AND t.revoked_at IS NULL AND t.expires_at>NOW()
     RETURNING m.membership_id,m.public_id,m.lifecycle_status,m.future_consent_expires_at,
       m.aggregate_version,cf.availability,t.expires_at,t.revoked_at`,
    [hashToken(token)]
  )

  const row = rows[0]

  if (!row) throw new HiringNotFoundError('Enlace no disponible.', 'talent_pool_link_unavailable')

  const receipts = await runGreenhousePostgresQuery<{
    receipt_public_id: string
    purpose: string
    action: string
    occurred_at: Date | string
    expires_at: Date | string | null
  }>(
    `SELECT receipt_public_id,purpose,action,occurred_at,expires_at
       FROM greenhouse_hiring.talent_pool_consent_event WHERE membership_id=$1
      ORDER BY occurred_at DESC LIMIT 10`,
    [row.membership_id]
  )

  const futureConsentExpiresAt = row.future_consent_expires_at
    ? new Date(row.future_consent_expires_at).toISOString()
    : null

  return {
    membershipId: row.membership_id,
    profile: {
      talentProfileId: row.public_id,
      lifecycleStatus: row.lifecycle_status,
      futureConsentExpiresAt,
      availability: row.availability,
      aggregateVersion: Number(row.aggregate_version),
      access: deriveTalentPoolAccess({ lifecycleStatus: row.lifecycle_status, futureConsentExpiresAt }),
      receipts: receipts.map(receipt => ({
        receiptId: receipt.receipt_public_id,
        purpose: receipt.purpose,
        action: receipt.action,
        occurredAt: new Date(receipt.occurred_at).toISOString(),
        expiresAt: receipt.expires_at ? new Date(receipt.expires_at).toISOString() : null
      }))
    }
  }
}

export const revokeTalentPoolSelfServiceTokens = async (membershipId: string) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_hiring.talent_pool_self_service_token SET revoked_at=NOW()
    WHERE membership_id=$1 AND revoked_at IS NULL`,
    [membershipId]
  )
}

export type TalentPoolPublicRateAction = 'read' | 'write'

const publicRateLimit = (action: TalentPoolPublicRateAction, env: NodeJS.ProcessEnv = process.env) => {
  const configured = Number(
    action === 'read'
      ? env.HIRING_TALENT_POOL_PUBLIC_READ_PER_IP_PER_MIN
      : env.HIRING_TALENT_POOL_PUBLIC_WRITE_PER_IP_PER_MIN
  )

  return Number.isFinite(configured) && configured > 0 ? configured : action === 'read' ? 60 : 20
}

export const checkTalentPoolPublicRequestAllowed = async (
  ip: string | null,
  action: TalentPoolPublicRateAction
): Promise<boolean> => {
  const salt = process.env.HIRING_TALENT_POOL_PUBLIC_RATE_SALT?.trim() || 'talent-pool-public-v1'
  const rateSubject = ip?.trim().toLowerCase() || 'unknown-proxy-subject'
  const ipHash = createHash('sha256').update(`${salt}:${rateSubject}`).digest('hex')

  try {
    const rows = await runGreenhousePostgresQuery<{ hit_count: number }>(
      `INSERT INTO greenhouse_hiring.talent_pool_public_rate_bucket
        (ip_hash,action,window_started_at,hit_count)
       VALUES ($1,$2,date_trunc('minute',NOW()),1)
       ON CONFLICT (ip_hash,action) DO UPDATE SET
         window_started_at=CASE
           WHEN talent_pool_public_rate_bucket.window_started_at < date_trunc('minute',NOW())
             THEN date_trunc('minute',NOW())
           ELSE talent_pool_public_rate_bucket.window_started_at
         END,
         hit_count=CASE
           WHEN talent_pool_public_rate_bucket.window_started_at < date_trunc('minute',NOW()) THEN 1
           ELSE talent_pool_public_rate_bucket.hit_count + 1
         END,
         updated_at=NOW()
       WHERE talent_pool_public_rate_bucket.window_started_at < date_trunc('minute',NOW())
          OR talent_pool_public_rate_bucket.hit_count < $3
       RETURNING hit_count`,
      [ipHash, action, publicRateLimit(action)]
    )

    return Boolean(rows[0])
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'talent_pool_public_rate_guard', action } })

    return false
  }
}
