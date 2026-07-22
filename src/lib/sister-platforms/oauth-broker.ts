import 'server-only'

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'
import { getTenantAccessRecordByUserId, type TenantAccessRecord } from '@/lib/tenant/access'

import {
  assertSisterPlatformOAuthPolicyScopes,
  evaluateSisterPlatformOAuthEligibility,
  parseSisterPlatformOAuthPolicy,
  resolveSisterPlatformOAuthCapabilities,
  SisterPlatformOAuthPolicyError,
  type SisterPlatformOAuthPolicyV1
} from './oauth-policy'

type OAuthClientRow = {
  oauth_client_id: string
  consumer_id: string
  sister_platform_key: string
  consumer_name: string
  consumer_status: string
  consumer_expires_at: string | Date | null
  client_id: string
  client_name: string
  client_status: string
  redirect_uris: string[] | null
  allowed_scopes: string[] | null
  code_ttl_seconds: number
  access_token_ttl_seconds: number
  require_pkce: boolean
  issue_identity_inline: boolean
  policy_json: unknown
  metadata_json: Record<string, unknown> | null
}

type OAuthCodeRow = {
  authorization_code_id: string
  oauth_client_id: string
  consumer_id: string
  user_id: string
  identity_profile_id: string | null
  code_hash: string
  redirect_uri: string
  requested_scopes: string[] | null
  state_hash: string
  nonce_hash: string
  code_challenge: string
  code_challenge_method: string
  correlation_id: string | null
  expires_at: string | Date
  consumed_at: string | Date | null
}

type OAuthAccessTokenRow = {
  access_token_id: string
  oauth_client_id: string
  consumer_id: string
  user_id: string
  identity_profile_id: string | null
  token_hash: string
  scopes: string[] | null
  correlation_id: string | null
  expires_at: string | Date
  revoked_at: string | Date | null
}

type ConsumerTokenRow = {
  consumer_id: string
  sister_platform_key: string
  credential_status: string
  token_hash: string
  expires_at: string | Date | null
}

export type SisterPlatformOAuthClient = {
  oauthClientId: string
  consumerId: string
  sisterPlatformKey: string
  consumerName: string
  consumerStatus: string
  consumerExpiresAt: string | null
  clientId: string
  clientName: string
  clientStatus: string
  redirectUris: string[]
  allowedScopes: string[]
  codeTtlSeconds: number
  accessTokenTtlSeconds: number
  requirePkce: boolean
  issueIdentityInline: boolean
  policy: SisterPlatformOAuthPolicyV1
  metadata: Record<string, unknown>
}

export type SisterPlatformOAuthIdentityPayload = {
  sub: string
  email: string
  name: string
  tenantId: string
  identityProfileId: string | null
  roles: string[]
  capabilities: string[]
  issuedAt: string
  expiresAt: string
  organization: {
    clientId: string
    clientName: string
    tenantType: 'client' | 'efeonce_internal'
  }
}

export type OAuthRequestAuditMetadata = {
  correlationId: string
  ipHash: string | null
  userAgentHash: string | null
}

export type ValidatedAuthorizeRequest = {
  client: SisterPlatformOAuthClient
  redirectUri: string
  state: string
  nonce: string
  requestedScopes: string[]
  codeChallenge: string
  codeChallengeMethod: 'S256'
}

export type IssuedAuthorizationCode = {
  authorizationCodeId: string
  code: string
  correlationId: string
  expiresAt: string
}

export type ConsumedAuthorizationCode = {
  authorizationCodeId: string
  accessTokenId: string
  accessToken: string
  correlationId: string
  expiresIn: number
  scopes: string[]
  identity: SisterPlatformOAuthIdentityPayload
}

export type UpsertSisterPlatformOAuthClientInput = {
  sisterPlatformConsumerId: string
  clientId: string
  clientName: string
  clientStatus?: 'draft' | 'active' | 'suspended' | 'deprecated'
  redirectUris: string[]
  allowedScopes?: string[]
  codeTtlSeconds?: number
  accessTokenTtlSeconds?: number
  requirePkce?: boolean
  issueIdentityInline?: boolean
  policy: SisterPlatformOAuthPolicyV1
  metadata?: Record<string, unknown> | null
  actorUserId?: string | null
}

export type UpdateSisterPlatformOAuthGrantPolicyInput = {
  clientId: string
  allowedScopes: string[]
  policy: SisterPlatformOAuthPolicyV1
}

export class SisterPlatformOAuthError extends Error {
  statusCode: number
  errorCode: string

  constructor(message: string, options?: { statusCode?: number; errorCode?: string }) {
    super(message)
    this.name = 'SisterPlatformOAuthError'
    this.statusCode = options?.statusCode ?? 400
    this.errorCode = options?.errorCode ?? 'invalid_request'
  }
}

const CODE_PREFIX_LENGTH = 18
const TOKEN_PREFIX_LENGTH = 18
const DEFAULT_ALLOWED_SCOPES = ['openid', 'profile', 'email']
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

const toIsoString = (value: string | Date | null) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const hashValue = (value: string) => createHash('sha256').update(value).digest('hex')

const hashSensitiveValue = (value: string | null) => (value ? hashValue(value).slice(0, 32) : null)

const safeEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false

  return timingSafeEqual(leftBuffer, rightBuffer)
}

const normalizeStringArray = (value: string[] | null | undefined, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback

  return value.map(item => item.trim()).filter(Boolean)
}

const normalizeScopeParam = (value: string | null) => {
  const scopes = (value || '')
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(Boolean)

  return Array.from(new Set(scopes.length > 0 ? scopes : DEFAULT_ALLOWED_SCOPES))
}

const normalizeRedirectUris = (value: string[]) => {
  const uris = Array.from(new Set(value.map(uri => uri.trim()).filter(Boolean)))

  if (uris.length === 0) {
    throw new SisterPlatformOAuthError('At least one redirect URI is required.', {
      errorCode: 'missing_redirect_uri'
    })
  }

  for (const uri of uris) {
    if (uri.includes('*')) {
      throw new SisterPlatformOAuthError('Redirect URI wildcards are not allowed.', {
        errorCode: 'invalid_redirect_uri'
      })
    }

    const parsed = new URL(uri)

    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new SisterPlatformOAuthError('Redirect URI must use HTTPS except localhost development.', {
        errorCode: 'invalid_redirect_uri'
      })
    }
  }

  return uris
}

const normalizeAllowedScopes = (value: string[] | undefined) => {
  const scopes = Array.from(new Set((value?.length ? value : DEFAULT_ALLOWED_SCOPES).map(scope => scope.trim()).filter(Boolean)))

  if (!scopes.includes('openid')) scopes.unshift('openid')

  return scopes
}

const normalizeTtl = (value: number | undefined, fallback: number, min: number, max: number) => {
  if (value === undefined || value === null) return fallback

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new SisterPlatformOAuthError('Invalid OAuth token TTL.', {
      errorCode: 'invalid_ttl'
    })
  }

  return Math.trunc(value)
}

const isPkceToken = (value: string) => /^[A-Za-z0-9._~-]{43,128}$/.test(value)

const generateAuthorizationCode = () => `ghspoac_${randomBytes(32).toString('base64url')}`

const generateAccessToken = () => `ghspoat_${randomBytes(48).toString('base64url')}`

const buildPkceChallenge = (codeVerifier: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url')

const mapOAuthClient = (row: OAuthClientRow): SisterPlatformOAuthClient => {
  const allowedScopes = normalizeStringArray(row.allowed_scopes, DEFAULT_ALLOWED_SCOPES)

  try {
    const policy = parseSisterPlatformOAuthPolicy(row.policy_json)

    assertSisterPlatformOAuthPolicyScopes(policy, allowedScopes)

    return {
      oauthClientId: row.oauth_client_id,
      consumerId: row.consumer_id,
      sisterPlatformKey: row.sister_platform_key,
      consumerName: row.consumer_name,
      consumerStatus: row.consumer_status,
      consumerExpiresAt: toIsoString(row.consumer_expires_at),
      clientId: row.client_id,
      clientName: row.client_name,
      clientStatus: row.client_status,
      redirectUris: normalizeStringArray(row.redirect_uris, []),
      allowedScopes,
      codeTtlSeconds: Number(row.code_ttl_seconds || 300),
      accessTokenTtlSeconds: Number(row.access_token_ttl_seconds || 300),
      requirePkce: Boolean(row.require_pkce),
      issueIdentityInline: Boolean(row.issue_identity_inline),
      policy,
      metadata: row.metadata_json ?? {}
    }
  } catch (error) {
    if (error instanceof SisterPlatformOAuthPolicyError) {
      throw new SisterPlatformOAuthError('OAuth client policy is unavailable.', {
        statusCode: 503,
        errorCode: error.errorCode
      })
    }

    throw error
  }
}

export const isSisterPlatformOAuthEnabled = () => {
  const raw = process.env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED?.trim().toLowerCase()

  return raw === 'true' || raw === '1' || raw === 'yes'
}

const assertBrokerEnabled = () => {
  if (!isSisterPlatformOAuthEnabled()) {
    throw new SisterPlatformOAuthError('Sister platform OAuth broker is disabled.', {
      statusCode: 404,
      errorCode: 'broker_disabled'
    })
  }
}

const assertClientAllowedByEnv = (clientId: string) => {
  const raw = process.env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS?.trim()

  if (!raw) return

  const allowed = raw
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

  if (allowed.length > 0 && !allowed.includes(clientId.toLowerCase())) {
    throw new SisterPlatformOAuthError('OAuth client is not enabled for this environment.', {
      statusCode: 403,
      errorCode: 'client_not_allowed'
    })
  }
}

export const getOAuthRequestAuditMetadata = (request: Request): OAuthRequestAuditMetadata => {
  const requestedCorrelationId = request.headers.get('x-correlation-id')?.trim() || ''

  return {
    correlationId: CORRELATION_ID_PATTERN.test(requestedCorrelationId) ? requestedCorrelationId : randomUUID(),
    ipHash: hashSensitiveValue(
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
    ),
    userAgentHash: hashSensitiveValue(request.headers.get('user-agent')?.trim() || null)
  }
}

export const loadSisterPlatformOAuthClient = async (clientId: string) => {
  const normalizedClientId = clientId.trim().toLowerCase()

  const rows = await query<OAuthClientRow>(
    `
      SELECT
        oauth.sister_platform_oauth_client_id AS oauth_client_id,
        oauth.sister_platform_consumer_id AS consumer_id,
        consumer.sister_platform_key,
        consumer.consumer_name,
        consumer.credential_status AS consumer_status,
        consumer.expires_at AS consumer_expires_at,
        oauth.client_id,
        oauth.client_name,
        oauth.client_status,
        oauth.redirect_uris,
        oauth.allowed_scopes,
        oauth.code_ttl_seconds,
        oauth.access_token_ttl_seconds,
        oauth.require_pkce,
        oauth.issue_identity_inline,
        oauth.policy_json,
        oauth.metadata_json
      FROM greenhouse_core.sister_platform_oauth_clients oauth
      JOIN greenhouse_core.sister_platform_consumers consumer
        ON consumer.sister_platform_consumer_id = oauth.sister_platform_consumer_id
      WHERE lower(oauth.client_id) = lower($1)
      LIMIT 1
    `,
    [normalizedClientId]
  )

  return rows[0] ? mapOAuthClient(rows[0]) : null
}

export const upsertSisterPlatformOAuthClient = async (input: UpsertSisterPlatformOAuthClientInput) => {
  const clientId = input.clientId.trim().toLowerCase()
  const clientName = input.clientName.trim()
  const clientStatus = input.clientStatus ?? 'active'
  const redirectUris = normalizeRedirectUris(input.redirectUris)
  const allowedScopes = normalizeAllowedScopes(input.allowedScopes)
  const codeTtlSeconds = normalizeTtl(input.codeTtlSeconds, 300, 60, 600)
  const accessTokenTtlSeconds = normalizeTtl(input.accessTokenTtlSeconds, 300, 60, 900)
  const policy = parseSisterPlatformOAuthPolicy(input.policy)

  assertSisterPlatformOAuthPolicyScopes(policy, allowedScopes)
  const oauthClientId = `spoauth-client-${randomUUID()}`

  if (!clientId || !clientName) {
    throw new SisterPlatformOAuthError('clientId and clientName are required.', {
      errorCode: 'invalid_client'
    })
  }

  await withTransaction(async pgClient => {
    const existing = await pgClient.query<{ oauth_client_id: string }>(
      `
        SELECT sister_platform_oauth_client_id AS oauth_client_id
        FROM greenhouse_core.sister_platform_oauth_clients
        WHERE lower(client_id) = lower($1)
        LIMIT 1
        FOR UPDATE
      `,
      [clientId]
    )

    if (existing.rows[0]) {
      await pgClient.query(
        `
          UPDATE greenhouse_core.sister_platform_oauth_clients
          SET
            sister_platform_consumer_id = $2,
            client_name = $3,
            client_status = $4,
            redirect_uris = $5::text[],
            allowed_scopes = $6::text[],
            code_ttl_seconds = $7,
            access_token_ttl_seconds = $8,
            require_pkce = $9,
            issue_identity_inline = $10,
            policy_json = $11::jsonb,
            metadata_json = $12::jsonb,
            suspended_by_user_id = CASE WHEN $4 = 'suspended' THEN $13 ELSE NULL END,
            deprecated_by_user_id = CASE WHEN $4 = 'deprecated' THEN $13 ELSE NULL END,
            suspended_at = CASE WHEN $4 = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END,
            deprecated_at = CASE WHEN $4 = 'deprecated' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
          WHERE sister_platform_oauth_client_id = $1
        `,
        [
          existing.rows[0].oauth_client_id,
          input.sisterPlatformConsumerId,
          clientName,
          clientStatus,
          redirectUris,
          allowedScopes,
          codeTtlSeconds,
          accessTokenTtlSeconds,
          input.requirePkce ?? true,
          input.issueIdentityInline ?? true,
          JSON.stringify(policy),
          JSON.stringify(input.metadata ?? {}),
          input.actorUserId ?? null
        ]
      )

      return
    }

    await pgClient.query(
      `
        INSERT INTO greenhouse_core.sister_platform_oauth_clients (
          sister_platform_oauth_client_id,
          sister_platform_consumer_id,
          client_id,
          client_name,
          client_status,
          redirect_uris,
          allowed_scopes,
          code_ttl_seconds,
          access_token_ttl_seconds,
          require_pkce,
          issue_identity_inline,
          policy_json,
          metadata_json,
          created_by_user_id,
          suspended_by_user_id,
          deprecated_by_user_id,
          suspended_at,
          deprecated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9, $10, $11, $12::jsonb, $13::jsonb,
          $14,
          CASE WHEN $5 = 'suspended' THEN $14 ELSE NULL END,
          CASE WHEN $5 = 'deprecated' THEN $14 ELSE NULL END,
          CASE WHEN $5 = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END,
          CASE WHEN $5 = 'deprecated' THEN CURRENT_TIMESTAMP ELSE NULL END
        )
      `,
      [
        oauthClientId,
        input.sisterPlatformConsumerId,
        clientId,
        clientName,
        clientStatus,
        redirectUris,
        allowedScopes,
        codeTtlSeconds,
        accessTokenTtlSeconds,
        input.requirePkce ?? true,
        input.issueIdentityInline ?? true,
        JSON.stringify(policy),
        JSON.stringify(input.metadata ?? {}),
        input.actorUserId ?? null
      ]
    )
  })

  const client = await loadSisterPlatformOAuthClient(clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('Unable to reload OAuth client after upsert.', {
      statusCode: 500,
      errorCode: 'client_reload_failed'
    })
  }

  return client
}

/**
 * Adjust ONLY the redirect-URI allowlist of an existing OAuth client (TASK-1507).
 *
 * A domain cutover has to add the new callback while the old one keeps working, then drop the old
 * one once the smoke is green. `upsertSisterPlatformOAuthClient` cannot express that: it replaces
 * the whole row, so the caller has to restate policy, scopes and TTLs, and any value that drifted
 * since it was last seeded would be silently rewritten. Seed scripts also rotate the consumer
 * token alongside the client, which would invalidate the live secret mid-cutover.
 *
 * So this touches exactly one column, inside one transaction, reusing `normalizeRedirectUris` as
 * the single validation authority (no wildcards, HTTPS outside localhost, never empty). Adding a
 * URI that is already allowed is a no-op, which makes re-running it safe.
 */
export const updateSisterPlatformOAuthRedirectUris = async (input: {
  clientId: string
  add?: string[]
  remove?: string[]
  actorUserId?: string | null
}) => {
  const clientId = input.clientId.trim().toLowerCase()

  if (!clientId) {
    throw new SisterPlatformOAuthError('clientId is required.', { errorCode: 'invalid_client' })
  }

  const add = (input.add ?? []).map(uri => uri.trim()).filter(Boolean)
  const remove = (input.remove ?? []).map(uri => uri.trim()).filter(Boolean)

  if (add.length === 0 && remove.length === 0) {
    throw new SisterPlatformOAuthError('At least one redirect URI to add or remove is required.', {
      errorCode: 'invalid_request'
    })
  }

  // Removing a URI that is not currently allowed means the caller is working from a stale picture
  // of the allowlist — during a cutover that is exactly when a silent no-op is dangerous.
  const overlap = add.filter(uri => remove.includes(uri))

  if (overlap.length > 0) {
    throw new SisterPlatformOAuthError('A redirect URI cannot be added and removed in the same call.', {
      errorCode: 'invalid_redirect_uri'
    })
  }

  let previousRedirectUris: string[] = []
  let nextRedirectUris: string[] = []

  await withTransaction(async pgClient => {
    const existing = await pgClient.query<{ oauth_client_id: string; redirect_uris: string[] | null }>(
      `
        SELECT sister_platform_oauth_client_id AS oauth_client_id, redirect_uris
        FROM greenhouse_core.sister_platform_oauth_clients
        WHERE lower(client_id) = lower($1)
        LIMIT 1
        FOR UPDATE
      `,
      [clientId]
    )

    const row = existing.rows[0]

    if (!row) {
      throw new SisterPlatformOAuthError('OAuth client not found.', {
        statusCode: 404,
        errorCode: 'invalid_client'
      })
    }

    previousRedirectUris = normalizeStringArray(row.redirect_uris, [])

    const missing = remove.filter(uri => !previousRedirectUris.includes(uri))

    if (missing.length > 0) {
      throw new SisterPlatformOAuthError('Redirect URI to remove is not in the allowlist.', {
        errorCode: 'invalid_redirect_uri'
      })
    }

    const merged = [...previousRedirectUris.filter(uri => !remove.includes(uri)), ...add]

    // Throws when the result would be empty, contains a wildcard, or is not HTTPS outside
    // localhost — the same authority `upsertSisterPlatformOAuthClient` applies.
    nextRedirectUris = normalizeRedirectUris(merged)

    await pgClient.query(
      `
        UPDATE greenhouse_core.sister_platform_oauth_clients
        SET redirect_uris = $2::text[], updated_at = CURRENT_TIMESTAMP
        WHERE sister_platform_oauth_client_id = $1
      `,
      [row.oauth_client_id, nextRedirectUris]
    )
  })

  const client = await loadSisterPlatformOAuthClient(clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('Unable to reload OAuth client after redirect URI update.', {
      statusCode: 500,
      errorCode: 'client_reload_failed'
    })
  }

  return {
    client,
    previousRedirectUris,
    redirectUris: nextRedirectUris,
    changed:
      previousRedirectUris.length !== nextRedirectUris.length ||
      previousRedirectUris.some((uri, index) => uri !== nextRedirectUris[index])
  }
}

/**
 * Replace ONLY the scopes + capability policy of an existing OAuth client.
 *
 * This is the grant-policy counterpart to `updateSisterPlatformOAuthRedirectUris`: an active
 * sister-platform client cannot be safely promoted with the full upsert because doing so would
 * restate and potentially overwrite its redirect allowlist, TTLs, status and metadata. The pilot
 * seed also rotates the consumer credential, which is explicitly forbidden for a grant rollout.
 *
 * Calling this function again with the returned previous values is the rollback. No authorization
 * code, access token, consumer credential or redirect URI is read or changed here.
 */
export const updateSisterPlatformOAuthGrantPolicy = async (
  input: UpdateSisterPlatformOAuthGrantPolicyInput
) => {
  const clientId = input.clientId.trim().toLowerCase()

  if (!clientId) {
    throw new SisterPlatformOAuthError('clientId is required.', { errorCode: 'invalid_client' })
  }

  const allowedScopes = normalizeAllowedScopes(input.allowedScopes)
  const policy = parseSisterPlatformOAuthPolicy(input.policy)

  assertSisterPlatformOAuthPolicyScopes(policy, allowedScopes)

  let previousAllowedScopes: string[] = []
  let previousPolicy: SisterPlatformOAuthPolicyV1 | undefined
  let changed = false

  await withTransaction(async pgClient => {
    const existing = await pgClient.query<{
      oauth_client_id: string
      allowed_scopes: string[] | null
      policy_json: unknown
    }>(
      `
        SELECT sister_platform_oauth_client_id AS oauth_client_id, allowed_scopes, policy_json
        FROM greenhouse_core.sister_platform_oauth_clients
        WHERE lower(client_id) = lower($1)
        LIMIT 1
        FOR UPDATE
      `,
      [clientId]
    )

    const row = existing.rows[0]

    if (!row) {
      throw new SisterPlatformOAuthError('OAuth client not found.', {
        statusCode: 404,
        errorCode: 'invalid_client'
      })
    }

    previousAllowedScopes = normalizeStringArray(row.allowed_scopes, DEFAULT_ALLOWED_SCOPES)

    try {
      previousPolicy = parseSisterPlatformOAuthPolicy(row.policy_json)
      assertSisterPlatformOAuthPolicyScopes(previousPolicy, previousAllowedScopes)
    } catch (error) {
      if (error instanceof SisterPlatformOAuthPolicyError) {
        throw new SisterPlatformOAuthError('OAuth client policy is unavailable.', {
          statusCode: 503,
          errorCode: error.errorCode
        })
      }

      throw error
    }

    changed =
      !sameStringArray(previousAllowedScopes, allowedScopes) ||
      JSON.stringify(previousPolicy) !== JSON.stringify(policy)

    if (!changed) return

    await pgClient.query(
      `
        UPDATE greenhouse_core.sister_platform_oauth_clients
        SET
          allowed_scopes = $2::text[],
          policy_json = $3::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE sister_platform_oauth_client_id = $1
      `,
      [row.oauth_client_id, allowedScopes, JSON.stringify(policy)]
    )
  })

  const client = await loadSisterPlatformOAuthClient(clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('Unable to reload OAuth client after grant policy update.', {
      statusCode: 500,
      errorCode: 'client_reload_failed'
    })
  }

  return {
    client,
    previousAllowedScopes,
    previousPolicy: previousPolicy as SisterPlatformOAuthPolicyV1,
    allowedScopes,
    policy,
    changed
  }
}

const sameStringArray = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const assertClientActive = (client: SisterPlatformOAuthClient) => {
  if (client.clientStatus !== 'active') {
    throw new SisterPlatformOAuthError('OAuth client is not active.', {
      statusCode: 403,
      errorCode: 'client_not_active'
    })
  }

  if (client.consumerStatus !== 'active') {
    throw new SisterPlatformOAuthError('Sister platform consumer is not active.', {
      statusCode: 403,
      errorCode: 'consumer_not_active'
    })
  }

  if (client.consumerExpiresAt && new Date(client.consumerExpiresAt).getTime() <= Date.now()) {
    throw new SisterPlatformOAuthError('Sister platform consumer has expired.', {
      statusCode: 403,
      errorCode: 'consumer_expired'
    })
  }
}

export const validateSisterPlatformAuthorizeRequest = async (url: URL): Promise<ValidatedAuthorizeRequest> => {
  assertBrokerEnabled()

  const clientId = url.searchParams.get('client_id')?.trim().toLowerCase() || ''
  const redirectUri = url.searchParams.get('redirect_uri')?.trim() || ''
  const responseType = url.searchParams.get('response_type')?.trim() || ''
  const state = url.searchParams.get('state')?.trim() || ''
  const nonce = url.searchParams.get('nonce')?.trim() || ''
  const codeChallenge = url.searchParams.get('code_challenge')?.trim() || ''
  const codeChallengeMethod = url.searchParams.get('code_challenge_method')?.trim() || ''
  const requestedScopes = normalizeScopeParam(url.searchParams.get('scope'))

  if (!clientId) {
    throw new SisterPlatformOAuthError('Missing client_id.', { errorCode: 'missing_client_id' })
  }

  assertClientAllowedByEnv(clientId)

  const client = await loadSisterPlatformOAuthClient(clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('Unknown OAuth client.', {
      statusCode: 401,
      errorCode: 'invalid_client'
    })
  }

  assertClientActive(client)

  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    throw new SisterPlatformOAuthError('Redirect URI is not registered for this OAuth client.', {
      statusCode: 400,
      errorCode: 'invalid_redirect_uri'
    })
  }

  if (responseType !== 'code') {
    throw new SisterPlatformOAuthError('Unsupported response_type.', {
      errorCode: 'unsupported_response_type'
    })
  }

  if (!state) {
    throw new SisterPlatformOAuthError('Missing state.', { errorCode: 'missing_state' })
  }

  if (!nonce) {
    throw new SisterPlatformOAuthError('Missing nonce.', { errorCode: 'missing_nonce' })
  }

  if (!codeChallenge || !isPkceToken(codeChallenge) || codeChallengeMethod !== 'S256') {
    throw new SisterPlatformOAuthError('Invalid PKCE challenge.', {
      errorCode: 'invalid_pkce_challenge'
    })
  }

  const disallowedScope = requestedScopes.find(scope => !client.allowedScopes.includes(scope))

  if (disallowedScope) {
    throw new SisterPlatformOAuthError('Requested scope is not allowed for this OAuth client.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  return {
    client,
    redirectUri,
    state,
    nonce,
    requestedScopes,
    codeChallenge,
    codeChallengeMethod: 'S256'
  }
}

const getOAuthTenantId = (tenant: TenantAccessRecord) =>
  tenant.tenantType === 'efeonce_internal' ? 'efeonce' : tenant.clientId

export const assertTenantEligibleForSisterPlatformOAuth = (
  tenant: TenantAccessRecord,
  client: SisterPlatformOAuthClient,
  requestedScopes: string[]
) => {
  const decision = evaluateSisterPlatformOAuthEligibility(client.policy, {
    active: tenant.active,
    status: tenant.status,
    tenantType: tenant.tenantType,
    requestedScopes
  })

  if (!decision.allowed) {
    throw new SisterPlatformOAuthError('User is not eligible for this OAuth client.', {
      statusCode: 403,
      errorCode: decision.errorCode
    })
  }
}

export const buildSisterPlatformOAuthIdentityPayload = ({
  tenant,
  client,
  requestedScopes,
  expiresAt
}: {
  tenant: TenantAccessRecord
  client: SisterPlatformOAuthClient
  requestedScopes: string[]
  expiresAt: string
}): SisterPlatformOAuthIdentityPayload => ({
  sub: `greenhouse:user:${tenant.userId}`,
  email: tenant.email,
  name: tenant.fullName,
  tenantId: getOAuthTenantId(tenant),
  identityProfileId: tenant.identityProfileId,
  roles: client.policy.claims.includeGreenhouseRoles ? tenant.roleCodes : [],
  capabilities: resolveSisterPlatformOAuthCapabilities(client.policy, requestedScopes),
  issuedAt: new Date().toISOString(),
  expiresAt,
  organization: {
    clientId: tenant.clientId,
    clientName: tenant.clientName,
    tenantType: tenant.tenantType
  }
})

export const recordSisterPlatformOAuthAuditEvent = async ({
  client,
  authorizationCodeId,
  accessTokenId,
  userId,
  identityProfileId,
  eventType,
  outcome,
  errorCode,
  redirectUri,
  requestedScopes,
  responseStatus,
  durationMs,
  correlationId,
  auditMetadata,
  metadata
}: {
  client?: SisterPlatformOAuthClient | null
  authorizationCodeId?: string | null
  accessTokenId?: string | null
  userId?: string | null
  identityProfileId?: string | null
  eventType:
    | 'authorize_success'
    | 'authorize_reject'
    | 'token_success'
    | 'token_reject'
    | 'userinfo_success'
    | 'userinfo_reject'
    | 'code_replay'
    | 'redirect_rejected'
    | 'token_revoked'
    | 'client_status_changed'
  outcome: 'success' | 'rejected' | 'failure'
  errorCode?: string | null
  redirectUri?: string | null
  requestedScopes?: string[] | null
  responseStatus?: number | null
  durationMs?: number
  correlationId?: string | null
  auditMetadata?: OAuthRequestAuditMetadata | null
  metadata?: Record<string, unknown> | null
}) => {
  await query(
    `
      INSERT INTO greenhouse_core.sister_platform_oauth_audit_log (
        sister_platform_oauth_audit_log_id,
        sister_platform_oauth_client_id,
        sister_platform_consumer_id,
        sister_platform_authorization_code_id,
        sister_platform_oauth_access_token_id,
        client_id,
        user_id,
        identity_profile_id,
        event_type,
        outcome,
        error_code,
        redirect_uri,
        requested_scopes,
        response_status,
        duration_ms,
        correlation_id,
        ip_hash,
        user_agent_hash,
        metadata_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13::text[], $14, $15, $16, $17, $18, $19::jsonb
      )
    `,
    [
      `spoauth-audit-${randomUUID()}`,
      client?.oauthClientId ?? null,
      client?.consumerId ?? null,
      authorizationCodeId ?? null,
      accessTokenId ?? null,
      client?.clientId ?? null,
      userId ?? null,
      identityProfileId ?? null,
      eventType,
      outcome,
      errorCode ?? null,
      redirectUri ?? null,
      requestedScopes ?? null,
      responseStatus ?? null,
      Math.max(0, Math.trunc(durationMs ?? 0)),
      correlationId ?? auditMetadata?.correlationId ?? null,
      auditMetadata?.ipHash ?? null,
      auditMetadata?.userAgentHash ?? null,
      JSON.stringify(metadata ?? {})
    ]
  )
}

export const issueSisterPlatformAuthorizationCode = async ({
  authorizeRequest,
  tenant,
  auditMetadata
}: {
  authorizeRequest: ValidatedAuthorizeRequest
  tenant: TenantAccessRecord
  auditMetadata: OAuthRequestAuditMetadata
}): Promise<IssuedAuthorizationCode> => {
  assertTenantEligibleForSisterPlatformOAuth(tenant, authorizeRequest.client, authorizeRequest.requestedScopes)

  const code = generateAuthorizationCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + authorizeRequest.client.codeTtlSeconds * 1000).toISOString()
  const authorizationCodeId = `spoauth-code-${randomUUID()}`

  await query(
    `
      INSERT INTO greenhouse_core.sister_platform_authorization_codes (
        sister_platform_authorization_code_id,
        sister_platform_oauth_client_id,
        sister_platform_consumer_id,
        user_id,
        identity_profile_id,
        code_prefix,
        code_hash,
        redirect_uri,
        requested_scopes,
        state_hash,
        nonce_hash,
        code_challenge,
        code_challenge_method,
        correlation_id,
        expires_at,
        ip_hash,
        user_agent_hash,
        metadata_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::text[],
        $10, $11, $12, 'S256', $13, $14, $15, $16, $17::jsonb
      )
    `,
    [
      authorizationCodeId,
      authorizeRequest.client.oauthClientId,
      authorizeRequest.client.consumerId,
      tenant.userId,
      tenant.identityProfileId,
      hashValue(code).slice(0, CODE_PREFIX_LENGTH),
      hashValue(code),
      authorizeRequest.redirectUri,
      authorizeRequest.requestedScopes,
      hashValue(authorizeRequest.state),
      hashValue(authorizeRequest.nonce),
      authorizeRequest.codeChallenge,
      auditMetadata.correlationId,
      expiresAt,
      auditMetadata.ipHash,
      auditMetadata.userAgentHash,
      JSON.stringify({ codeChallengeMethod: 'S256' })
    ]
  )

  return {
    authorizationCodeId,
    code,
    correlationId: auditMetadata.correlationId,
    expiresAt
  }
}

const loadConsumerByClientSecret = async (clientSecret: string) => {
  const tokenHash = hashValue(clientSecret)
  const tokenPrefix = tokenHash.slice(0, 16)

  const rows = await query<ConsumerTokenRow>(
    `
      SELECT
        sister_platform_consumer_id AS consumer_id,
        sister_platform_key,
        credential_status,
        token_hash,
        expires_at
      FROM greenhouse_core.sister_platform_consumers
      WHERE token_prefix = $1
    `,
    [tokenPrefix]
  )

  return rows.find(row => safeEquals(row.token_hash, tokenHash)) ?? null
}

export const authenticateSisterPlatformOAuthClient = async ({
  client,
  clientSecret
}: {
  client: SisterPlatformOAuthClient
  clientSecret: string
}) => {
  if (!clientSecret) {
    throw new SisterPlatformOAuthError('Missing client secret.', {
      statusCode: 401,
      errorCode: 'invalid_client'
    })
  }

  const consumer = await loadConsumerByClientSecret(clientSecret)

  if (!consumer || consumer.consumer_id !== client.consumerId) {
    throw new SisterPlatformOAuthError('Invalid OAuth client authentication.', {
      statusCode: 401,
      errorCode: 'invalid_client'
    })
  }

  if (consumer.credential_status !== 'active') {
    throw new SisterPlatformOAuthError('Sister platform consumer credential is not active.', {
      statusCode: 403,
      errorCode: 'consumer_not_active'
    })
  }

  if (consumer.expires_at && new Date(consumer.expires_at).getTime() <= Date.now()) {
    throw new SisterPlatformOAuthError('Sister platform consumer credential has expired.', {
      statusCode: 403,
      errorCode: 'consumer_expired'
    })
  }

  return consumer
}

const markAuthorizationCodeFailure = async ({
  client,
  codeHash,
  failureCode
}: {
  client: SisterPlatformOAuthClient
  codeHash: string
  failureCode: string
}) => {
  await query(
    `
      UPDATE greenhouse_core.sister_platform_authorization_codes
      SET
        consume_failure_count = consume_failure_count + 1,
        last_failure_at = CURRENT_TIMESTAMP,
        last_failure_code = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE sister_platform_oauth_client_id = $1
        AND code_hash = $2
    `,
    [client.oauthClientId, codeHash, failureCode]
  )
}

export const consumeSisterPlatformAuthorizationCode = async ({
  clientId,
  clientSecret,
  code,
  redirectUri,
  codeVerifier,
  auditMetadata
}: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  codeVerifier: string
  auditMetadata: OAuthRequestAuditMetadata
}): Promise<ConsumedAuthorizationCode> => {
  assertBrokerEnabled()
  assertClientAllowedByEnv(clientId)

  const client = await loadSisterPlatformOAuthClient(clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('Invalid OAuth client.', {
      statusCode: 401,
      errorCode: 'invalid_client'
    })
  }

  assertClientActive(client)
  await authenticateSisterPlatformOAuthClient({ client, clientSecret })

  if (!code || !redirectUri || !codeVerifier || !isPkceToken(codeVerifier)) {
    throw new SisterPlatformOAuthError('Invalid token exchange request.', {
      errorCode: 'invalid_request'
    })
  }

  const codeHash = hashValue(code)
  const accessToken = generateAccessToken()
  const accessTokenHash = hashValue(accessToken)
  const accessTokenPrefix = accessTokenHash.slice(0, TOKEN_PREFIX_LENGTH)

  const result = await withTransaction(async pgClient => {
    const codeRows = await pgClient.query<OAuthCodeRow>(
      `
        SELECT
          sister_platform_authorization_code_id AS authorization_code_id,
          sister_platform_oauth_client_id AS oauth_client_id,
          sister_platform_consumer_id AS consumer_id,
          user_id,
          identity_profile_id,
          code_hash,
          redirect_uri,
          requested_scopes,
          state_hash,
          nonce_hash,
          code_challenge,
          code_challenge_method,
          correlation_id,
          expires_at,
          consumed_at
        FROM greenhouse_core.sister_platform_authorization_codes
        WHERE code_hash = $1
        FOR UPDATE
      `,
      [codeHash]
    )

    const codeRow = codeRows.rows[0]

    if (!codeRow || codeRow.oauth_client_id !== client.oauthClientId) {
      throw new SisterPlatformOAuthError('Invalid authorization code.', {
        statusCode: 400,
        errorCode: 'invalid_grant'
      })
    }

    if (codeRow.consumed_at) {
      await pgClient.query(
        `
          UPDATE greenhouse_core.sister_platform_authorization_codes
          SET
            consume_failure_count = consume_failure_count + 1,
            last_failure_at = CURRENT_TIMESTAMP,
            last_failure_code = 'code_replay',
            updated_at = CURRENT_TIMESTAMP
          WHERE sister_platform_authorization_code_id = $1
        `,
        [codeRow.authorization_code_id]
      )

      throw new SisterPlatformOAuthError('Authorization code has already been consumed.', {
        statusCode: 400,
        errorCode: 'code_replay'
      })
    }

    if (new Date(codeRow.expires_at).getTime() <= Date.now()) {
      await pgClient.query(
        `
          UPDATE greenhouse_core.sister_platform_authorization_codes
          SET
            consume_failure_count = consume_failure_count + 1,
            last_failure_at = CURRENT_TIMESTAMP,
            last_failure_code = 'code_expired',
            updated_at = CURRENT_TIMESTAMP
          WHERE sister_platform_authorization_code_id = $1
        `,
        [codeRow.authorization_code_id]
      )

      throw new SisterPlatformOAuthError('Authorization code has expired.', {
        statusCode: 400,
        errorCode: 'invalid_grant'
      })
    }

    if (codeRow.redirect_uri !== redirectUri) {
      await pgClient.query(
        `
          UPDATE greenhouse_core.sister_platform_authorization_codes
          SET
            consume_failure_count = consume_failure_count + 1,
            last_failure_at = CURRENT_TIMESTAMP,
            last_failure_code = 'redirect_uri_mismatch',
            updated_at = CURRENT_TIMESTAMP
          WHERE sister_platform_authorization_code_id = $1
        `,
        [codeRow.authorization_code_id]
      )

      throw new SisterPlatformOAuthError('Redirect URI mismatch.', {
        statusCode: 400,
        errorCode: 'invalid_grant'
      })
    }

    if (!safeEquals(buildPkceChallenge(codeVerifier), codeRow.code_challenge)) {
      await pgClient.query(
        `
          UPDATE greenhouse_core.sister_platform_authorization_codes
          SET
            consume_failure_count = consume_failure_count + 1,
            last_failure_at = CURRENT_TIMESTAMP,
            last_failure_code = 'pkce_mismatch',
            updated_at = CURRENT_TIMESTAMP
          WHERE sister_platform_authorization_code_id = $1
        `,
        [codeRow.authorization_code_id]
      )

      throw new SisterPlatformOAuthError('PKCE verification failed.', {
        statusCode: 400,
        errorCode: 'invalid_grant'
      })
    }

    const tenant = await getTenantAccessRecordByUserId(codeRow.user_id)

    if (!tenant) {
      throw new SisterPlatformOAuthError('User is no longer available.', {
        statusCode: 403,
        errorCode: 'user_not_found'
      })
    }

    const requestedScopes = normalizeStringArray(codeRow.requested_scopes, DEFAULT_ALLOWED_SCOPES)

    assertTenantEligibleForSisterPlatformOAuth(tenant, client, requestedScopes)

    const accessTokenId = `spoauth-token-${randomUUID()}`
    const expiresAt = new Date(Date.now() + client.accessTokenTtlSeconds * 1000).toISOString()

    await pgClient.query(
      `
        UPDATE greenhouse_core.sister_platform_authorization_codes
        SET
          consumed_at = CURRENT_TIMESTAMP,
          consumed_by_consumer_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE sister_platform_authorization_code_id = $1
          AND consumed_at IS NULL
      `,
      [codeRow.authorization_code_id, client.consumerId]
    )

    await pgClient.query(
      `
        INSERT INTO greenhouse_core.sister_platform_oauth_access_tokens (
          sister_platform_oauth_access_token_id,
          sister_platform_oauth_client_id,
          sister_platform_consumer_id,
          sister_platform_authorization_code_id,
          user_id,
          identity_profile_id,
          token_prefix,
          token_hash,
          scopes,
          correlation_id,
          expires_at,
          metadata_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12::jsonb
        )
      `,
      [
        accessTokenId,
        client.oauthClientId,
        client.consumerId,
        codeRow.authorization_code_id,
        tenant.userId,
        tenant.identityProfileId,
        accessTokenPrefix,
        accessTokenHash,
        requestedScopes,
        codeRow.correlation_id ?? auditMetadata.correlationId,
        expiresAt,
        JSON.stringify({ source: 'TASK-948 token exchange' })
      ]
    )

    return {
      authorizationCodeId: codeRow.authorization_code_id,
      accessTokenId,
      tenant,
      requestedScopes,
      correlationId: codeRow.correlation_id ?? auditMetadata.correlationId,
      expiresAt
    }
  }).catch(async error => {
    if (error instanceof SisterPlatformOAuthError && error.errorCode !== 'invalid_client') {
      await markAuthorizationCodeFailure({ client, codeHash, failureCode: error.errorCode }).catch(() => undefined)
    }

    throw error
  })

  await recordSisterPlatformOAuthAuditEvent({
    client,
    authorizationCodeId: result.authorizationCodeId,
    accessTokenId: result.accessTokenId,
    userId: result.tenant.userId,
    identityProfileId: result.tenant.identityProfileId,
    eventType: 'token_success',
    outcome: 'success',
    requestedScopes: result.requestedScopes,
    responseStatus: 200,
    correlationId: result.correlationId,
    auditMetadata,
    metadata: {
      expiresAt: result.expiresAt
    }
  }).catch(() => undefined)

  return {
    authorizationCodeId: result.authorizationCodeId,
    accessTokenId: result.accessTokenId,
    accessToken,
    correlationId: result.correlationId,
    expiresIn: client.accessTokenTtlSeconds,
    scopes: result.requestedScopes,
    identity: buildSisterPlatformOAuthIdentityPayload({
      tenant: result.tenant,
      client,
      requestedScopes: result.requestedScopes,
      expiresAt: result.expiresAt
    })
  }
}

export const resolveSisterPlatformOAuthUserinfo = async ({
  accessToken,
  auditMetadata
}: {
  accessToken: string
  auditMetadata: OAuthRequestAuditMetadata
}) => {
  assertBrokerEnabled()

  const tokenHash = hashValue(accessToken)
  const tokenPrefix = tokenHash.slice(0, TOKEN_PREFIX_LENGTH)

  const rows = await query<OAuthAccessTokenRow & OAuthClientRow>(
    `
      SELECT
        token.sister_platform_oauth_access_token_id AS access_token_id,
        token.sister_platform_oauth_client_id AS oauth_client_id,
        token.sister_platform_consumer_id AS consumer_id,
        token.user_id,
        token.identity_profile_id,
        token.token_hash,
        token.scopes,
        token.correlation_id,
        token.expires_at,
        token.revoked_at,
        oauth.sister_platform_oauth_client_id AS oauth_client_id,
        oauth.sister_platform_consumer_id AS consumer_id,
        consumer.sister_platform_key,
        consumer.consumer_name,
        consumer.credential_status AS consumer_status,
        consumer.expires_at AS consumer_expires_at,
        oauth.client_id,
        oauth.client_name,
        oauth.client_status,
        oauth.redirect_uris,
        oauth.allowed_scopes,
        oauth.code_ttl_seconds,
        oauth.access_token_ttl_seconds,
        oauth.require_pkce,
        oauth.issue_identity_inline,
        oauth.policy_json,
        oauth.metadata_json
      FROM greenhouse_core.sister_platform_oauth_access_tokens token
      JOIN greenhouse_core.sister_platform_oauth_clients oauth
        ON oauth.sister_platform_oauth_client_id = token.sister_platform_oauth_client_id
      JOIN greenhouse_core.sister_platform_consumers consumer
        ON consumer.sister_platform_consumer_id = token.sister_platform_consumer_id
      WHERE token.token_prefix = $1
    `,
    [tokenPrefix]
  )

  const row = rows.find(candidate => safeEquals(candidate.token_hash, tokenHash))

  if (!row) {
    throw new SisterPlatformOAuthError('Invalid access token.', {
      statusCode: 401,
      errorCode: 'invalid_token'
    })
  }

  const client = mapOAuthClient(row)

  assertClientActive(client)

  if (row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw new SisterPlatformOAuthError('Access token has expired.', {
      statusCode: 401,
      errorCode: 'invalid_token'
    })
  }

  const tenant = await getTenantAccessRecordByUserId(row.user_id)
  const requestedScopes = normalizeStringArray(row.scopes, DEFAULT_ALLOWED_SCOPES)

  if (!tenant) {
    throw new SisterPlatformOAuthError('User is no longer available.', {
      statusCode: 403,
      errorCode: 'user_not_found'
    })
  }

  assertTenantEligibleForSisterPlatformOAuth(tenant, client, requestedScopes)

  await query(
    `
      UPDATE greenhouse_core.sister_platform_oauth_access_tokens
      SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE sister_platform_oauth_access_token_id = $1
    `,
    [row.access_token_id]
  )

  await recordSisterPlatformOAuthAuditEvent({
    client,
    accessTokenId: row.access_token_id,
    userId: tenant.userId,
    identityProfileId: tenant.identityProfileId,
    eventType: 'userinfo_success',
    outcome: 'success',
    requestedScopes,
    responseStatus: 200,
    correlationId: row.correlation_id ?? auditMetadata.correlationId,
    auditMetadata
  })

  return {
    client,
    accessTokenId: row.access_token_id,
    correlationId: row.correlation_id ?? auditMetadata.correlationId,
    identity: buildSisterPlatformOAuthIdentityPayload({
      tenant,
      client,
      requestedScopes,
      expiresAt: toIsoString(row.expires_at) || new Date().toISOString()
    })
  }
}

export type RevokeSisterPlatformOAuthTokensInput = Readonly<{
  clientId: string
  userId?: string | null
  actorUserId?: string | null
  reason: string
  correlationId?: string | null
}>

export type SetSisterPlatformOAuthClientStatusInput = Readonly<{
  clientId: string
  status: 'draft' | 'active' | 'suspended' | 'deprecated'
  actorUserId?: string | null
  reason: string
  correlationId?: string | null
}>

const normalizeCorrelationId = (value?: string | null) => {
  const normalized = value?.trim() || ''

  return CORRELATION_ID_PATTERN.test(normalized) ? normalized : randomUUID()
}

const normalizeRevocationReason = (value: string) => {
  const normalized = value.trim()

  if (!/^[A-Za-z0-9][A-Za-z0-9 ._:-]{2,127}$/.test(normalized)) {
    throw new SisterPlatformOAuthError('Invalid revocation reason.', {
      errorCode: 'invalid_revocation_reason'
    })
  }

  return normalized
}

export const revokeSisterPlatformOAuthAccessTokens = async (
  input: RevokeSisterPlatformOAuthTokensInput
) => {
  const client = await loadSisterPlatformOAuthClient(input.clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('Unknown OAuth client.', {
      statusCode: 404,
      errorCode: 'invalid_client'
    })
  }

  const correlationId = normalizeCorrelationId(input.correlationId)
  const reason = normalizeRevocationReason(input.reason)

  const revoked = await query<{
    access_token_id: string
    user_id: string
    identity_profile_id: string | null
    scopes: string[] | null
  }>(
    `
      UPDATE greenhouse_core.sister_platform_oauth_access_tokens
      SET
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by_user_id = $3,
        revocation_reason = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE sister_platform_oauth_client_id = $1
        AND revoked_at IS NULL
        AND ($2::text IS NULL OR user_id = $2)
      RETURNING
        sister_platform_oauth_access_token_id AS access_token_id,
        user_id,
        identity_profile_id,
        scopes
    `,
    [client.oauthClientId, input.userId ?? null, input.actorUserId ?? null, reason]
  )

  if (revoked.length === 0) {
    await recordSisterPlatformOAuthAuditEvent({
      client,
      userId: input.userId ?? null,
      eventType: 'token_revoked',
      outcome: 'success',
      responseStatus: 200,
      correlationId,
      metadata: { reason, revokedCount: 0 }
    })
  } else {
    for (const token of revoked) {
      await recordSisterPlatformOAuthAuditEvent({
        client,
        accessTokenId: token.access_token_id,
        userId: token.user_id,
        identityProfileId: token.identity_profile_id,
        eventType: 'token_revoked',
        outcome: 'success',
        requestedScopes: token.scopes,
        responseStatus: 200,
        correlationId,
        metadata: { reason }
      })
    }
  }

  return { clientId: client.clientId, correlationId, revokedCount: revoked.length }
}

export const setSisterPlatformOAuthClientStatus = async (
  input: SetSisterPlatformOAuthClientStatusInput
) => {
  const current = await loadSisterPlatformOAuthClient(input.clientId)

  if (!current) {
    throw new SisterPlatformOAuthError('Unknown OAuth client.', {
      statusCode: 404,
      errorCode: 'invalid_client'
    })
  }

  const correlationId = normalizeCorrelationId(input.correlationId)
  const reason = normalizeRevocationReason(input.reason)

  await withTransaction(async pgClient => {
    await pgClient.query(
      `
        UPDATE greenhouse_core.sister_platform_oauth_clients
        SET
          client_status = $2,
          suspended_by_user_id = CASE WHEN $2 = 'suspended' THEN $3 ELSE NULL END,
          deprecated_by_user_id = CASE WHEN $2 = 'deprecated' THEN $3 ELSE NULL END,
          suspended_at = CASE WHEN $2 = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END,
          deprecated_at = CASE WHEN $2 = 'deprecated' THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
        WHERE sister_platform_oauth_client_id = $1
      `,
      [current.oauthClientId, input.status, input.actorUserId ?? null]
    )

    if (input.status === 'suspended' || input.status === 'deprecated') {
      await pgClient.query(
        `
          UPDATE greenhouse_core.sister_platform_oauth_access_tokens
          SET
            revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
            revoked_by_user_id = COALESCE(revoked_by_user_id, $2),
            revocation_reason = COALESCE(revocation_reason, $3),
            updated_at = CURRENT_TIMESTAMP
          WHERE sister_platform_oauth_client_id = $1
            AND revoked_at IS NULL
        `,
        [current.oauthClientId, input.actorUserId ?? null, reason]
      )
    }
  })

  await recordSisterPlatformOAuthAuditEvent({
    client: current,
    eventType: 'client_status_changed',
    outcome: 'success',
    responseStatus: 200,
    correlationId,
    metadata: {
      from: current.clientStatus,
      to: input.status,
      reason
    }
  })

  const client = await loadSisterPlatformOAuthClient(input.clientId)

  if (!client) {
    throw new SisterPlatformOAuthError('OAuth client could not be reloaded.', {
      statusCode: 500,
      errorCode: 'client_reload_failed'
    })
  }

  return { client, correlationId }
}
