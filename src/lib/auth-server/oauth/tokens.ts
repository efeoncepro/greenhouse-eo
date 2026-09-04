/**
 * Emisión de tokens del emisor (TASK-1829).
 *
 * Access token: JWT ES256 firmado por KMS (`signWithActiveKey`), 15 min, claims
 * `iss sub aud azp scope gv iat exp jti` (+ `auth_time`, `client_id`). Refresh: opaco, 32 bytes, se
 * persiste sólo su sha256, familia por `grant_id`, TTL deslizante 30 d con tope absoluto 90 d, rotación en
 * cada uso. El `jti` se registra para revocación e introspección.
 */

import type { AuthServerOAuthConfig } from './config'
import { generateOpaqueId, generateOpaqueToken, secondsFromNow, sha256Hex } from './primitives'
import { serializeScopes } from './scopes'
import type { AccessTokenRecord, OAuthClientRecord, OAuthStorePort, RefreshTokenRecord } from './store/port'

export const REFRESH_TOKEN_PREFIX = 'efr'
export const AUTHORIZATION_CODE_PREFIX = 'efc'

/** Firma un payload como JWS compacto ES256 con la llave `active` (adapter sobre `signWithActiveKey`). */
export type AccessTokenSigner = (payload: Record<string, unknown>) => Promise<string>

export type AccessTokenClaims = {
  iss: string
  sub: string
  aud: string
  azp: string
  client_id: string
  scope: string
  gv: number
  iat: number
  exp: number
  jti: string
  auth_time: number
}

export type IssuedTokenSet = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope: string
  /** Sólo para audit/tests; nunca al wire. */
  jti: string
  grantId: string
}

export type IssueTokenSetInput = {
  client: OAuthClientRecord
  subject: string
  environmentId: string
  scopes: readonly string[]
  grantId: string
  grantsVersion: number
  authTime: Date
  now: Date
  /** Tope absoluto heredado de la familia; en el primer token del grant se calcula desde `now`. */
  absoluteExpiresAt?: Date
}

export const buildAccessTokenClaims = (config: AuthServerOAuthConfig, input: IssueTokenSetInput, jti: string): AccessTokenClaims => {
  const iat = Math.floor(input.now.getTime() / 1000)

  return {
    iss: config.issuer,
    sub: input.subject,
    aud: config.mcpAudience,
    azp: input.client.clientId,
    client_id: input.client.clientId,
    scope: serializeScopes(input.scopes),
    gv: input.grantsVersion,
    iat,
    exp: iat + config.accessTokenTtlSeconds,
    jti,
    auth_time: Math.floor(input.authTime.getTime() / 1000)
  }
}

export const buildRefreshTokenRecord = (
  config: AuthServerOAuthConfig,
  input: IssueTokenSetInput,
  tokenHash: string
): RefreshTokenRecord => ({
  tokenHash,
  grantId: input.grantId,
  clientId: input.client.clientId,
  subject: input.subject,
  environmentId: input.environmentId,
  scopes: [...input.scopes],
  status: 'active',
  rotatedToHash: null,
  expiresAt: secondsFromNow(input.now, config.refreshTokenSlidingTtlSeconds),
  absoluteExpiresAt: input.absoluteExpiresAt ?? secondsFromNow(input.now, config.refreshTokenAbsoluteTtlSeconds),
  createdAt: input.now,
  usedAt: null,
  revokedAt: null,
  revokeReason: null
})

export const buildAccessTokenRecord = (input: IssueTokenSetInput, claims: AccessTokenClaims): AccessTokenRecord => ({
  jti: claims.jti,
  grantId: input.grantId,
  clientId: input.client.clientId,
  subject: input.subject,
  environmentId: input.environmentId,
  scopes: [...input.scopes],
  issuedAt: new Date(claims.iat * 1000),
  expiresAt: new Date(claims.exp * 1000),
  revokedAt: null,
  revokeReason: null
})

/** Prepara el set (firma incluida) sin persistir: el caller decide si inserta o rota atómicamente. */
export const prepareTokenSet = async (
  config: AuthServerOAuthConfig,
  signer: AccessTokenSigner,
  input: IssueTokenSetInput
): Promise<{ tokens: IssuedTokenSet; access: AccessTokenRecord; refresh: RefreshTokenRecord }> => {
  const jti = generateOpaqueId(16)
  const claims = buildAccessTokenClaims(config, input, jti)
  const accessToken = await signer(claims)
  const refreshToken = generateOpaqueToken(REFRESH_TOKEN_PREFIX, 32)

  return {
    tokens: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: config.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: claims.scope,
      jti,
      grantId: input.grantId
    },
    access: buildAccessTokenRecord(input, claims),
    refresh: buildRefreshTokenRecord(config, input, sha256Hex(refreshToken))
  }
}

/** Primer set de un grant (intercambio de code): inserta access + refresh. */
export const issueInitialTokenSet = async (
  deps: { store: OAuthStorePort; config: AuthServerOAuthConfig; signer: AccessTokenSigner },
  input: IssueTokenSetInput
): Promise<IssuedTokenSet> => {
  const prepared = await prepareTokenSet(deps.config, deps.signer, input)

  await deps.store.insertAccessToken(prepared.access)
  await deps.store.insertRefreshToken(prepared.refresh)

  return prepared.tokens
}

/** Sólo la parte pública del set (sin `jti`/`grantId`) para el wire. */
export const toTokenResponseBody = (tokens: IssuedTokenSet) => ({
  access_token: tokens.access_token,
  token_type: tokens.token_type,
  expires_in: tokens.expires_in,
  refresh_token: tokens.refresh_token,
  scope: tokens.scope
})
