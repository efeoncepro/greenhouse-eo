import 'server-only'

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'
import { getTenantAccessRecordByUserId, type TenantAccessRecord } from '@/lib/tenant/access'

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
  expiresAt: string
}

export type ConsumedAuthorizationCode = {
  authorizationCodeId: string
  accessTokenId: string
  accessToken: string
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
  metadata?: Record<string, unknown> | null
  actorUserId?: string | null
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

const CORE_OIDC_SCOPES = new Set(['openid', 'profile', 'email'])
const KORTEX_OPERATOR_SCOPE = 'kortex.operator_console.access'
const CODE_PREFIX_LENGTH = 18
const TOKEN_PREFIX_LENGTH = 18
const DEFAULT_ALLOWED_SCOPES = ['openid', 'profile', 'email']

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

const mapOAuthClient = (row: OAuthClientRow): SisterPlatformOAuthClient => ({
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
  allowedScopes: normalizeStringArray(row.allowed_scopes, DEFAULT_ALLOWED_SCOPES),
  codeTtlSeconds: Number(row.code_ttl_seconds || 300),
  accessTokenTtlSeconds: Number(row.access_token_ttl_seconds || 300),
  requirePkce: Boolean(row.require_pkce),
  issueIdentityInline: Boolean(row.issue_identity_inline),
  metadata: row.metadata_json ?? {}
})

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

export const getOAuthRequestAuditMetadata = (request: Request): OAuthRequestAuditMetadata => ({
  ipHash: hashSensitiveValue(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')),
  userAgentHash: hashSensitiveValue(request.headers.get('user-agent')?.trim() || null)
})

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
            metadata_json = $11::jsonb,
            suspended_by_user_id = CASE WHEN $4 = 'suspended' THEN $12 ELSE NULL END,
            deprecated_by_user_id = CASE WHEN $4 = 'deprecated' THEN $12 ELSE NULL END,
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
          metadata_json,
          created_by_user_id,
          suspended_by_user_id,
          deprecated_by_user_id,
          suspended_at,
          deprecated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9, $10, $11, $12::jsonb,
          $13,
          CASE WHEN $5 = 'suspended' THEN $13 ELSE NULL END,
          CASE WHEN $5 = 'deprecated' THEN $13 ELSE NULL END,
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
  requestedScopes: string[]
) => {
  if (!tenant.active || tenant.status !== 'active') {
    throw new SisterPlatformOAuthError('User is not eligible for this sister platform.', {
      statusCode: 403,
      errorCode: 'user_not_eligible'
    })
  }

  if (tenant.tenantType !== 'efeonce_internal') {
    throw new SisterPlatformOAuthError('User is outside the approved Kortex operator audience.', {
      statusCode: 403,
      errorCode: 'user_scope_not_allowed'
    })
  }

  if (!requestedScopes.includes(KORTEX_OPERATOR_SCOPE)) {
    throw new SisterPlatformOAuthError('Kortex operator-console scope is required.', {
      statusCode: 403,
      errorCode: 'missing_kortex_scope'
    })
  }
}

export const buildSisterPlatformOAuthIdentityPayload = ({
  tenant,
  requestedScopes,
  expiresAt
}: {
  tenant: TenantAccessRecord
  requestedScopes: string[]
  expiresAt: string
}): SisterPlatformOAuthIdentityPayload => ({
  sub: `greenhouse:user:${tenant.userId}`,
  email: tenant.email,
  name: tenant.fullName,
  tenantId: getOAuthTenantId(tenant),
  identityProfileId: tenant.identityProfileId,
  roles: tenant.roleCodes,
  capabilities: requestedScopes.filter(scope => !CORE_OIDC_SCOPES.has(scope)),
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
  outcome: 'success' | 'rejected' | 'failure'
  errorCode?: string | null
  redirectUri?: string | null
  requestedScopes?: string[] | null
  responseStatus?: number | null
  durationMs?: number
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
        ip_hash,
        user_agent_hash,
        metadata_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13::text[], $14, $15, $16, $17, $18::jsonb
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
  assertTenantEligibleForSisterPlatformOAuth(tenant, authorizeRequest.requestedScopes)

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
        expires_at,
        ip_hash,
        user_agent_hash,
        metadata_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::text[],
        $10, $11, $12, 'S256', $13, $14, $15, $16::jsonb
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
      expiresAt,
      auditMetadata.ipHash,
      auditMetadata.userAgentHash,
      JSON.stringify({ codeChallengeMethod: 'S256' })
    ]
  )

  return {
    authorizationCodeId,
    code,
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

    assertTenantEligibleForSisterPlatformOAuth(tenant, requestedScopes)

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
          expires_at,
          metadata_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11::jsonb
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
        expiresAt,
        JSON.stringify({ source: 'TASK-948 token exchange' })
      ]
    )

    return {
      authorizationCodeId: codeRow.authorization_code_id,
      accessTokenId,
      tenant,
      requestedScopes,
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
    auditMetadata,
    metadata: {
      expiresAt: result.expiresAt
    }
  }).catch(() => undefined)

  return {
    authorizationCodeId: result.authorizationCodeId,
    accessTokenId: result.accessTokenId,
    accessToken,
    expiresIn: client.accessTokenTtlSeconds,
    scopes: result.requestedScopes,
    identity: buildSisterPlatformOAuthIdentityPayload({
      tenant: result.tenant,
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

  assertTenantEligibleForSisterPlatformOAuth(tenant, requestedScopes)

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
    auditMetadata
  })

  return {
    client,
    accessTokenId: row.access_token_id,
    identity: buildSisterPlatformOAuthIdentityPayload({
      tenant,
      requestedScopes,
      expiresAt: toIsoString(row.expires_at) || new Date().toISOString()
    })
  }
}
