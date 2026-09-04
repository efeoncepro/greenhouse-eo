/**
 * Implementación PostgreSQL del `OAuthStorePort` sobre `greenhouse_auth.*` (TASK-1829).
 *
 * Las operaciones atómicas usan `withTransaction` + `SELECT … FOR UPDATE`. Ningún token, code ni
 * secret llega acá en claro: el caller hashea antes. Columnas verificadas contra la migration
 * `20260904130826694_task-1829-auth-oauth-tables.sql` y ejercitadas contra PG real
 * (`scripts/auth-server/oauth-store-smoke.ts`).
 */

import { query, withTransaction } from '@/lib/db'

import type {
  AccessTokenRecord,
  AuthorizationCodeRecord,
  CimdCacheRecord,
  ClientConsentRecord,
  ConsumeAuthorizationCodeResult,
  CountAuditEventsInput,
  OAuthAuditEvent,
  OAuthClientRecord,
  OAuthStorePort,
  RefreshTokenRecord,
  RevokeGrantResult,
  RotateRefreshTokenResult
} from './port'

type Queryable = { query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }> }

const asDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)))
const asDateOrNull = (value: unknown): Date | null => (value === null || value === undefined ? null : asDate(value))
const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])

const CLIENT_COLUMNS = `client_id, registration_kind, client_type, client_name, redirect_uris, grant_types, response_types,
  token_endpoint_auth_method, client_secret_hash, allowed_scopes, status, metadata_json, created_by, created_at, updated_at`

type ClientRow = {
  client_id: string
  registration_kind: OAuthClientRecord['registrationKind']
  client_type: OAuthClientRecord['clientType']
  client_name: string
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  token_endpoint_auth_method: OAuthClientRecord['tokenEndpointAuthMethod']
  client_secret_hash: string | null
  allowed_scopes: string[] | null
  status: OAuthClientRecord['status']
  metadata_json: Record<string, unknown>
  created_by: string
  created_at: Date
  updated_at: Date
}

const mapClient = (row: ClientRow): OAuthClientRecord => ({
  clientId: row.client_id,
  registrationKind: row.registration_kind,
  clientType: row.client_type,
  clientName: row.client_name,
  redirectUris: asStringArray(row.redirect_uris),
  grantTypes: asStringArray(row.grant_types),
  responseTypes: asStringArray(row.response_types),
  tokenEndpointAuthMethod: row.token_endpoint_auth_method,
  clientSecretHash: row.client_secret_hash,
  allowedScopes: row.allowed_scopes === null ? null : asStringArray(row.allowed_scopes),
  status: row.status,
  metadata: row.metadata_json ?? {},
  createdBy: row.created_by,
  createdAt: asDate(row.created_at),
  updatedAt: asDate(row.updated_at)
})

const CODE_COLUMNS = `code_hash, client_id, subject, environment_id, grant_id, redirect_uri, scopes, code_challenge,
  code_challenge_method, nonce, auth_time, grants_version, expires_at, consumed_at, created_at, ip_hash, correlation_id`

type CodeRow = {
  code_hash: string
  client_id: string
  subject: string
  environment_id: string
  grant_id: string
  redirect_uri: string
  scopes: string[]
  code_challenge: string
  code_challenge_method: 'S256'
  nonce: string | null
  auth_time: Date
  grants_version: number
  expires_at: Date
  consumed_at: Date | null
  created_at: Date
  ip_hash: string | null
  correlation_id: string | null
}

const mapCode = (row: CodeRow): AuthorizationCodeRecord => ({
  codeHash: row.code_hash,
  clientId: row.client_id,
  subject: row.subject,
  environmentId: row.environment_id,
  grantId: row.grant_id,
  redirectUri: row.redirect_uri,
  scopes: asStringArray(row.scopes),
  codeChallenge: row.code_challenge,
  codeChallengeMethod: 'S256',
  nonce: row.nonce,
  authTime: asDate(row.auth_time),
  grantsVersion: Number(row.grants_version),
  expiresAt: asDate(row.expires_at),
  consumedAt: asDateOrNull(row.consumed_at),
  createdAt: asDate(row.created_at),
  ipHash: row.ip_hash,
  correlationId: row.correlation_id
})

const REFRESH_COLUMNS = `token_hash, grant_id, client_id, subject, environment_id, scopes, status, rotated_to_hash,
  expires_at, absolute_expires_at, created_at, used_at, revoked_at, revoke_reason`

type RefreshRow = {
  token_hash: string
  grant_id: string
  client_id: string
  subject: string
  environment_id: string
  scopes: string[]
  status: RefreshTokenRecord['status']
  rotated_to_hash: string | null
  expires_at: Date
  absolute_expires_at: Date
  created_at: Date
  used_at: Date | null
  revoked_at: Date | null
  revoke_reason: string | null
}

const mapRefresh = (row: RefreshRow): RefreshTokenRecord => ({
  tokenHash: row.token_hash,
  grantId: row.grant_id,
  clientId: row.client_id,
  subject: row.subject,
  environmentId: row.environment_id,
  scopes: asStringArray(row.scopes),
  status: row.status,
  rotatedToHash: row.rotated_to_hash,
  expiresAt: asDate(row.expires_at),
  absoluteExpiresAt: asDate(row.absolute_expires_at),
  createdAt: asDate(row.created_at),
  usedAt: asDateOrNull(row.used_at),
  revokedAt: asDateOrNull(row.revoked_at),
  revokeReason: row.revoke_reason
})

const ACCESS_COLUMNS = `jti, grant_id, client_id, subject, environment_id, scopes, issued_at, expires_at, revoked_at, revoke_reason`

type AccessRow = {
  jti: string
  grant_id: string
  client_id: string
  subject: string
  environment_id: string
  scopes: string[]
  issued_at: Date
  expires_at: Date
  revoked_at: Date | null
  revoke_reason: string | null
}

const mapAccess = (row: AccessRow): AccessTokenRecord => ({
  jti: row.jti,
  grantId: row.grant_id,
  clientId: row.client_id,
  subject: row.subject,
  environmentId: row.environment_id,
  scopes: asStringArray(row.scopes),
  issuedAt: asDate(row.issued_at),
  expiresAt: asDate(row.expires_at),
  revokedAt: asDateOrNull(row.revoked_at),
  revokeReason: row.revoke_reason
})

const CONSENT_COLUMNS = `consent_id, subject, environment_id, client_id, scope, status, granted_via, granted_by, granted_at,
  revoked_at, revoked_by, revoke_reason`

type ConsentRow = {
  consent_id: string
  subject: string
  environment_id: string
  client_id: string
  scope: string
  status: ClientConsentRecord['status']
  granted_via: string
  granted_by: string
  granted_at: Date
  revoked_at: Date | null
  revoked_by: string | null
  revoke_reason: string | null
}

const mapConsent = (row: ConsentRow): ClientConsentRecord => ({
  consentId: row.consent_id,
  subject: row.subject,
  environmentId: row.environment_id,
  clientId: row.client_id,
  scope: row.scope,
  status: row.status,
  grantedVia: row.granted_via,
  grantedBy: row.granted_by,
  grantedAt: asDate(row.granted_at),
  revokedAt: asDateOrNull(row.revoked_at),
  revokedBy: row.revoked_by,
  revokeReason: row.revoke_reason
})

const insertRefresh = async (db: Queryable, r: RefreshTokenRecord) => {
  await db.query(
    `INSERT INTO greenhouse_auth.refresh_tokens (${REFRESH_COLUMNS})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      r.tokenHash,
      r.grantId,
      r.clientId,
      r.subject,
      r.environmentId,
      r.scopes,
      r.status,
      r.rotatedToHash,
      r.expiresAt,
      r.absoluteExpiresAt,
      r.createdAt,
      r.usedAt,
      r.revokedAt,
      r.revokeReason
    ]
  )
}

const insertAccess = async (db: Queryable, r: AccessTokenRecord) => {
  await db.query(
    `INSERT INTO greenhouse_auth.access_tokens (${ACCESS_COLUMNS})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [r.jti, r.grantId, r.clientId, r.subject, r.environmentId, r.scopes, r.issuedAt, r.expiresAt, r.revokedAt, r.revokeReason]
  )
}

const revokeWhere = async (
  db: Queryable,
  whereRefresh: string,
  whereAccess: string,
  params: unknown[],
  now: Date,
  reason: string
): Promise<RevokeGrantResult> => {
  const nowIndex = params.length + 1
  const reasonIndex = params.length + 2

  const refresh = await db.query(
    `UPDATE greenhouse_auth.refresh_tokens
     SET status = 'revoked', revoked_at = $${nowIndex}, revoke_reason = $${reasonIndex}
     WHERE ${whereRefresh} AND status <> 'revoked'
     RETURNING token_hash`,
    [...params, now, reason]
  )

  const access = await db.query(
    `UPDATE greenhouse_auth.access_tokens
     SET revoked_at = $${nowIndex}, revoke_reason = $${reasonIndex}
     WHERE ${whereAccess} AND revoked_at IS NULL AND expires_at > $${nowIndex}
     RETURNING jti`,
    [...params, now, reason]
  )

  return { refreshRevoked: refresh.rows.length, accessRevoked: access.rows.length }
}

const plain: Queryable = { query: async (text, values) => ({ rows: (await query(text, values)) as unknown[] }) }

export class PostgresOAuthStore implements OAuthStorePort {
  async getClient(clientId: string) {
    const rows = (await query(`SELECT ${CLIENT_COLUMNS} FROM greenhouse_auth.oauth_clients WHERE client_id = $1`, [
      clientId
    ])) as ClientRow[]

    return rows[0] ? mapClient(rows[0]) : null
  }

  async upsertClient(r: OAuthClientRecord) {
    await query(
      `INSERT INTO greenhouse_auth.oauth_clients (${CLIENT_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15)
       ON CONFLICT (client_id) DO UPDATE SET
         registration_kind = EXCLUDED.registration_kind,
         client_type = EXCLUDED.client_type,
         client_name = EXCLUDED.client_name,
         redirect_uris = EXCLUDED.redirect_uris,
         grant_types = EXCLUDED.grant_types,
         response_types = EXCLUDED.response_types,
         token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
         client_secret_hash = EXCLUDED.client_secret_hash,
         allowed_scopes = EXCLUDED.allowed_scopes,
         status = EXCLUDED.status,
         metadata_json = EXCLUDED.metadata_json`,
      [
        r.clientId,
        r.registrationKind,
        r.clientType,
        r.clientName,
        r.redirectUris,
        r.grantTypes,
        r.responseTypes,
        r.tokenEndpointAuthMethod,
        r.clientSecretHash,
        r.allowedScopes,
        r.status,
        JSON.stringify(r.metadata ?? {}),
        r.createdBy,
        r.createdAt,
        r.updatedAt
      ]
    )
  }

  async getCimdCache(clientIdUrl: string) {
    const rows = (await query(
      `SELECT client_id_url, document, etag, status, reject_reason, fetched_at, expires_at
       FROM greenhouse_auth.cimd_cache WHERE client_id_url = $1`,
      [clientIdUrl]
    )) as Array<{
      client_id_url: string
      document: Record<string, unknown> | null
      etag: string | null
      status: 'valid' | 'rejected'
      reject_reason: string | null
      fetched_at: Date
      expires_at: Date
    }>

    const row = rows[0]

    if (!row) return null

    return {
      clientIdUrl: row.client_id_url,
      document: row.document,
      etag: row.etag,
      status: row.status,
      rejectReason: row.reject_reason,
      fetchedAt: asDate(row.fetched_at),
      expiresAt: asDate(row.expires_at)
    } satisfies CimdCacheRecord
  }

  async putCimdCache(r: CimdCacheRecord) {
    await query(
      `INSERT INTO greenhouse_auth.cimd_cache (client_id_url, document, etag, status, reject_reason, fetched_at, expires_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id_url) DO UPDATE SET
         document = EXCLUDED.document, etag = EXCLUDED.etag, status = EXCLUDED.status,
         reject_reason = EXCLUDED.reject_reason, fetched_at = EXCLUDED.fetched_at, expires_at = EXCLUDED.expires_at`,
      [r.clientIdUrl, r.document === null ? null : JSON.stringify(r.document), r.etag, r.status, r.rejectReason, r.fetchedAt, r.expiresAt]
    )
  }

  async insertAuthorizationCode(r: AuthorizationCodeRecord) {
    await query(
      `INSERT INTO greenhouse_auth.authorization_codes (${CODE_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        r.codeHash,
        r.clientId,
        r.subject,
        r.environmentId,
        r.grantId,
        r.redirectUri,
        r.scopes,
        r.codeChallenge,
        r.codeChallengeMethod,
        r.nonce,
        r.authTime,
        r.grantsVersion,
        r.expiresAt,
        r.consumedAt,
        r.createdAt,
        r.ipHash,
        r.correlationId
      ]
    )
  }

  async consumeAuthorizationCode({ codeHash, now }: { codeHash: string; now: Date }): Promise<ConsumeAuthorizationCodeResult> {
    return withTransaction(async client => {
      const locked = await client.query(
        `SELECT ${CODE_COLUMNS} FROM greenhouse_auth.authorization_codes WHERE code_hash = $1 FOR UPDATE`,
        [codeHash]
      )

      const row = locked.rows[0] as CodeRow | undefined

      if (!row) return { status: 'not_found' }

      const code = mapCode(row)

      if (code.consumedAt) return { status: 'already_consumed', code }
      if (code.expiresAt.getTime() <= now.getTime()) return { status: 'expired', code }

      await client.query(`UPDATE greenhouse_auth.authorization_codes SET consumed_at = $2 WHERE code_hash = $1`, [
        codeHash,
        now
      ])

      return { status: 'consumed', code: { ...code, consumedAt: now } }
    })
  }

  async insertRefreshToken(r: RefreshTokenRecord) {
    await insertRefresh(plain, r)
  }

  async getRefreshToken(tokenHash: string) {
    const rows = (await query(`SELECT ${REFRESH_COLUMNS} FROM greenhouse_auth.refresh_tokens WHERE token_hash = $1`, [
      tokenHash
    ])) as RefreshRow[]

    return rows[0] ? mapRefresh(rows[0]) : null
  }

  async rotateRefreshToken({
    tokenHash,
    now,
    next,
    accessToken
  }: {
    tokenHash: string
    now: Date
    next: RefreshTokenRecord
    accessToken: AccessTokenRecord
  }): Promise<RotateRefreshTokenResult> {
    return withTransaction(async client => {
      const locked = await client.query(
        `SELECT ${REFRESH_COLUMNS} FROM greenhouse_auth.refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
        [tokenHash]
      )

      const row = locked.rows[0] as RefreshRow | undefined

      if (!row) return { status: 'not_found' }

      const previous = mapRefresh(row)

      if (previous.status === 'rotated') return { status: 'reused', previous }
      if (previous.status === 'revoked') return { status: 'revoked', previous }

      if (previous.expiresAt.getTime() <= now.getTime() || previous.absoluteExpiresAt.getTime() <= now.getTime()) {
        return { status: 'expired', previous }
      }

      await client.query(
        `UPDATE greenhouse_auth.refresh_tokens SET status = 'rotated', rotated_to_hash = $2, used_at = $3 WHERE token_hash = $1`,
        [tokenHash, next.tokenHash, now]
      )
      await insertRefresh(client, next)
      await insertAccess(client, accessToken)

      return { status: 'rotated', previous: { ...previous, status: 'rotated', rotatedToHash: next.tokenHash, usedAt: now } }
    })
  }

  async insertAccessToken(r: AccessTokenRecord) {
    await insertAccess(plain, r)
  }

  async getAccessToken(jti: string) {
    const rows = (await query(`SELECT ${ACCESS_COLUMNS} FROM greenhouse_auth.access_tokens WHERE jti = $1`, [jti])) as AccessRow[]

    return rows[0] ? mapAccess(rows[0]) : null
  }

  async revokeGrant({ grantId, now, reason }: { grantId: string; now: Date; reason: string }) {
    return withTransaction(client => revokeWhere(client, 'grant_id = $1', 'grant_id = $1', [grantId], now, reason))
  }

  async revokeGrantsForSubjectClient({
    subject,
    environmentId,
    clientId,
    now,
    reason
  }: {
    subject: string
    environmentId: string
    clientId: string
    now: Date
    reason: string
  }) {
    const where = 'subject = $1 AND environment_id = $2 AND client_id = $3'

    return withTransaction(client => revokeWhere(client, where, where, [subject, environmentId, clientId], now, reason))
  }

  async listActiveConsents({ subject, environmentId, clientId }: { subject: string; environmentId: string; clientId: string }) {
    const rows = (await query(
      `SELECT ${CONSENT_COLUMNS} FROM greenhouse_auth.client_consents
       WHERE subject = $1 AND environment_id = $2 AND client_id = $3 AND status = 'active'
       ORDER BY granted_at ASC`,
      [subject, environmentId, clientId]
    )) as ConsentRow[]

    return rows.map(mapConsent)
  }

  async grantConsents({
    subject,
    environmentId,
    clientId,
    scopes,
    grantedVia,
    grantedBy,
    now
  }: {
    subject: string
    environmentId: string
    clientId: string
    scopes: readonly string[]
    grantedVia: string
    grantedBy: string
    now: Date
  }) {
    // Idempotente por el índice único parcial `client_consents_active_uidx`.
    for (const scope of new Set(scopes)) {
      await query(
        `INSERT INTO greenhouse_auth.client_consents (subject, environment_id, client_id, scope, status, granted_via, granted_by, granted_at)
         SELECT $1, $2, $3, $4, 'active', $5, $6, $7
         WHERE NOT EXISTS (
           SELECT 1 FROM greenhouse_auth.client_consents
           WHERE subject = $1 AND environment_id = $2 AND client_id = $3 AND scope = $4 AND status = 'active'
         )`,
        [subject, environmentId, clientId, scope, grantedVia, grantedBy, now]
      )
    }

    return this.listActiveConsents({ subject, environmentId, clientId })
  }

  async revokeConsents({
    subject,
    environmentId,
    clientId,
    scopes,
    revokedBy,
    reason,
    now
  }: {
    subject: string
    environmentId: string
    clientId: string
    scopes: readonly string[] | null
    revokedBy: string
    reason: string
    now: Date
  }) {
    const rows = (await query(
      `UPDATE greenhouse_auth.client_consents
       SET status = 'revoked', revoked_at = $4, revoked_by = $5, revoke_reason = $6
       WHERE subject = $1 AND environment_id = $2 AND client_id = $3 AND status = 'active'
         AND ($7::text[] IS NULL OR scope = ANY($7::text[]))
       RETURNING consent_id`,
      [subject, environmentId, clientId, now, revokedBy, reason, scopes ? [...scopes] : null]
    )) as unknown[]

    return rows.length
  }

  async recordAuditEvent(e: OAuthAuditEvent) {
    await query(
      `INSERT INTO greenhouse_auth.oauth_audit_events
         (event_type, outcome, client_id, subject_hash, grant_id, error_code, ip_hash, user_agent_hash, correlation_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        e.eventType,
        e.outcome,
        e.clientId,
        e.subjectHash,
        e.grantId,
        e.errorCode,
        e.ipHash,
        e.userAgentHash,
        e.correlationId,
        JSON.stringify(e.details ?? {})
      ]
    )
  }

  async countAuditEvents({ eventTypes, since, ipHash, clientId, outcome }: CountAuditEventsInput) {
    const rows = (await query(
      `SELECT COUNT(*)::int AS count FROM greenhouse_auth.oauth_audit_events
       WHERE event_type = ANY($1::text[]) AND occurred_at >= $2
         AND ($3::text IS NULL OR ip_hash = $3)
         AND ($4::text IS NULL OR client_id = $4)
         AND ($5::text IS NULL OR outcome = $5)`,
      [[...eventTypes], since, ipHash ?? null, clientId ?? null, outcome ?? null]
    )) as Array<{ count: number }>

    return Number(rows[0]?.count ?? 0)
  }
}
