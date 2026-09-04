/**
 * Port de persistencia del dominio OAuth del emisor (TASK-1829).
 *
 * Las operaciones son ATÓMICAS por diseño (no CRUD genérico): `consumeAuthorizationCode`,
 * `rotateRefreshToken` y `revokeGrant` encapsulan el `SELECT … FOR UPDATE` + escrituras que la
 * implementación PostgreSQL ejecuta en una transacción. La implementación en memoria sirve a los
 * tests del flujo completo contra el handler real.
 */

export type OAuthClientType = 'public' | 'confidential'

export type OAuthClientRegistrationKind = 'cimd' | 'dcr' | 'preregistered'

export type OAuthTokenEndpointAuthMethod = 'none' | 'client_secret_basic' | 'client_secret_post'

export type OAuthClientStatus = 'active' | 'suspended' | 'retired'

export type OAuthClientRecord = {
  clientId: string
  registrationKind: OAuthClientRegistrationKind
  clientType: OAuthClientType
  clientName: string
  redirectUris: string[]
  grantTypes: string[]
  responseTypes: string[]
  tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod
  /** sha256 hex del `client_secret`; sólo confidenciales. */
  clientSecretHash: string | null
  /** `null` = cualquier scope conocido por el emisor. */
  allowedScopes: string[] | null
  status: OAuthClientStatus
  /** Metadata del registro (documento CIMD, request DCR redactado, `software_id`, …). */
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type AuthorizationCodeRecord = {
  codeHash: string
  clientId: string
  /** Sujeto opaco dentro de este issuer. */
  subject: string
  environmentId: string
  /** Familia de tokens que este code va a abrir. */
  grantId: string
  redirectUri: string
  scopes: string[]
  codeChallenge: string
  codeChallengeMethod: 'S256'
  nonce: string | null
  /** `iat` de la autenticación de la persona (`auth_time`). */
  authTime: Date
  /** `gv` resuelto al momento de autorizar (max de memberships bound). */
  grantsVersion: number
  expiresAt: Date
  consumedAt: Date | null
  createdAt: Date
  ipHash: string | null
  correlationId: string | null
}

export type ConsumeAuthorizationCodeResult =
  | { status: 'consumed'; code: AuthorizationCodeRecord }
  | { status: 'already_consumed'; code: AuthorizationCodeRecord }
  | { status: 'expired'; code: AuthorizationCodeRecord }
  | { status: 'not_found' }

export type RefreshTokenStatus = 'active' | 'rotated' | 'revoked'

export type RefreshTokenRecord = {
  tokenHash: string
  grantId: string
  clientId: string
  subject: string
  environmentId: string
  scopes: string[]
  status: RefreshTokenStatus
  rotatedToHash: string | null
  /** Expiración deslizante (30 d desde su emisión). */
  expiresAt: Date
  /** Tope absoluto de la familia (90 d desde el primer token del grant). */
  absoluteExpiresAt: Date
  createdAt: Date
  usedAt: Date | null
  revokedAt: Date | null
  revokeReason: string | null
}

export type AccessTokenRecord = {
  jti: string
  grantId: string
  clientId: string
  subject: string
  environmentId: string
  scopes: string[]
  issuedAt: Date
  expiresAt: Date
  revokedAt: Date | null
  revokeReason: string | null
}

export type RotateRefreshTokenResult =
  | { status: 'rotated'; previous: RefreshTokenRecord }
  | { status: 'reused'; previous: RefreshTokenRecord }
  | { status: 'revoked'; previous: RefreshTokenRecord }
  | { status: 'expired'; previous: RefreshTokenRecord }
  | { status: 'not_found' }

export type ClientConsentRecord = {
  consentId: string
  subject: string
  environmentId: string
  clientId: string
  scope: string
  status: 'active' | 'revoked'
  /** `authorize_screen` | `admin` | `cli` | `nexa` — quién materializó el consentimiento. */
  grantedVia: string
  grantedBy: string
  grantedAt: Date
  revokedAt: Date | null
  revokedBy: string | null
  revokeReason: string | null
}

export type CimdCacheRecord = {
  clientIdUrl: string
  document: Record<string, unknown> | null
  etag: string | null
  status: 'valid' | 'rejected'
  rejectReason: string | null
  fetchedAt: Date
  expiresAt: Date
}

export type OAuthAuditEventType =
  | 'authorize'
  | 'token'
  | 'refresh'
  | 'revoke'
  | 'introspect'
  | 'register'
  | 'cimd_fetch'
  | 'consent_granted'
  | 'consent_revoked'
  | 'code_reuse'
  | 'refresh_reuse'
  | 'rate_limited'

export type OAuthAuditOutcome = 'success' | 'rejected' | 'failure'

export type OAuthAuditEvent = {
  eventType: OAuthAuditEventType
  outcome: OAuthAuditOutcome
  clientId: string | null
  /** sha256 truncado del sujeto: nunca el `sub` crudo en el audit. */
  subjectHash: string | null
  grantId: string | null
  errorCode: string | null
  ipHash: string | null
  userAgentHash: string | null
  correlationId: string | null
  details: Record<string, unknown>
}

export type OAuthAuditEventRecord = OAuthAuditEvent & { eventId: string; occurredAt: Date }

export type CountAuditEventsInput = {
  eventTypes: readonly OAuthAuditEventType[]
  since: Date
  ipHash?: string | null
  clientId?: string | null
  outcome?: OAuthAuditOutcome
}

export type RevokeGrantResult = { refreshRevoked: number; accessRevoked: number }

export interface OAuthStorePort {
  // clients
  getClient(clientId: string): Promise<OAuthClientRecord | null>
  upsertClient(record: OAuthClientRecord): Promise<void>

  // CIMD cache
  getCimdCache(clientIdUrl: string): Promise<CimdCacheRecord | null>
  putCimdCache(record: CimdCacheRecord): Promise<void>

  // authorization codes
  insertAuthorizationCode(record: AuthorizationCodeRecord): Promise<void>
  /** Atómico: un code se consume exactamente una vez; el segundo intento reporta `already_consumed`. */
  consumeAuthorizationCode(input: { codeHash: string; now: Date }): Promise<ConsumeAuthorizationCodeResult>

  // refresh + access tokens
  insertRefreshToken(record: RefreshTokenRecord): Promise<void>
  getRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>
  /**
   * Atómico: si el token está `active` y vigente, lo marca `rotated`, inserta el siguiente refresh y el
   * access token asociado. Si ya fue rotado/revocado, reporta `reused` sin escribir (el caller revoca la familia).
   */
  rotateRefreshToken(input: {
    tokenHash: string
    now: Date
    next: RefreshTokenRecord
    accessToken: AccessTokenRecord
  }): Promise<RotateRefreshTokenResult>
  insertAccessToken(record: AccessTokenRecord): Promise<void>
  getAccessToken(jti: string): Promise<AccessTokenRecord | null>
  /** Revoca toda la familia: refresh activos + access vigentes del grant. */
  revokeGrant(input: { grantId: string; now: Date; reason: string }): Promise<RevokeGrantResult>
  /** Revoca todas las familias de (subject, client) — al revocar consentimiento. */
  revokeGrantsForSubjectClient(input: {
    subject: string
    environmentId: string
    clientId: string
    now: Date
    reason: string
  }): Promise<RevokeGrantResult>

  // consents
  listActiveConsents(input: { subject: string; environmentId: string; clientId: string }): Promise<ClientConsentRecord[]>
  /** Idempotente: los scopes ya activos no se duplican; devuelve todas las filas activas resultantes. */
  grantConsents(input: {
    subject: string
    environmentId: string
    clientId: string
    scopes: readonly string[]
    grantedVia: string
    grantedBy: string
    now: Date
  }): Promise<ClientConsentRecord[]>
  revokeConsents(input: {
    subject: string
    environmentId: string
    clientId: string
    scopes: readonly string[] | null
    revokedBy: string
    reason: string
    now: Date
  }): Promise<number>

  // audit
  recordAuditEvent(event: OAuthAuditEvent): Promise<void>
  countAuditEvents(input: CountAuditEventsInput): Promise<number>
}
