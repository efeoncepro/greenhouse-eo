import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { decodeJwt, jwtVerify, SignJWT } from 'jose'

import { getNextAuthSecret } from '@/lib/auth-secrets'
import { query } from '@/lib/db'
import { getTenantAccessRecordByEmail, getTenantAccessRecordByUserId, verifyTenantPassword, type TenantAccessRecord } from '@/lib/tenant/access'

import { ApiPlatformError } from './errors'

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_DAYS = 30
const APP_ACCESS_TOKEN_TYPE = 'greenhouse_app_access'

type AppAccessTokenPayload = {
  typ: typeof APP_ACCESS_TOKEN_TYPE
  sid: string
  sub: string
  iat: number
  exp: number
}

type FirstPartyAppSessionRow = {
  app_session_id: string
  user_id: string
  session_status: string
  expires_at: string | Date
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const toIsoString = (value: string | Date) => (value instanceof Date ? value.toISOString() : value)

const buildSessionId = () => `EO-APS-${randomUUID().slice(0, 8).toUpperCase()}`

const buildPublicId = () => `EO-APP-${randomUUID().slice(0, 8).toUpperCase()}`

const buildRefreshToken = () => randomBytes(48).toString('base64url')

const getSigningKey = () => new TextEncoder().encode(getNextAuthSecret())

const buildAccessToken = async ({ sessionId, userId }: { sessionId: string; userId: string }) =>
  new SignJWT({
    typ: APP_ACCESS_TOKEN_TYPE,
    sid: sessionId
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSigningKey())

export const decodeAppAccessToken = async (token: string): Promise<AppAccessTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, getSigningKey())

    if (payload.typ !== APP_ACCESS_TOKEN_TYPE || typeof payload.sid !== 'string' || typeof payload.sub !== 'string') {
      throw new Error('invalid app token payload')
    }

    return payload as AppAccessTokenPayload
  } catch {
    throw new ApiPlatformError('Invalid app session token.', {
      statusCode: 401,
      errorCode: 'invalid_token'
    })
  }
}

export const resolveAppSessionTenant = async ({
  sessionId,
  userId
}: {
  sessionId: string
  userId: string
}) => {
  const rows = await query<FirstPartyAppSessionRow>(
    `
      SELECT app_session_id, user_id, session_status, expires_at
      FROM greenhouse_core.first_party_app_sessions
      WHERE app_session_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [sessionId, userId]
  )

  const session = rows[0]

  if (!session) {
    throw new ApiPlatformError('App session not found.', {
      statusCode: 401,
      errorCode: 'invalid_session'
    })
  }

  if (session.session_status !== 'active') {
    throw new ApiPlatformError('App session is not active.', {
      statusCode: 401,
      errorCode: session.session_status === 'revoked' ? 'session_revoked' : 'invalid_session'
    })
  }

  if (new Date(toIsoString(session.expires_at)).getTime() <= Date.now()) {
    await query(
      `
        UPDATE greenhouse_core.first_party_app_sessions
        SET session_status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE app_session_id = $1 AND session_status = 'active'
      `,
      [sessionId]
    )

    throw new ApiPlatformError('App session has expired.', {
      statusCode: 401,
      errorCode: 'invalid_session'
    })
  }

  const tenant = await getTenantAccessRecordByUserId(userId)

  if (!tenant || !tenant.active || tenant.status !== 'active') {
    throw new ApiPlatformError('User session is no longer active.', {
      statusCode: 401,
      errorCode: 'invalid_session'
    })
  }

  return tenant
}

export const createFirstPartyAppSession = async ({
  email,
  password,
  deviceLabel,
  devicePlatform,
  appVersion,
  ipHash,
  userAgentHash
}: {
  email: string
  password: string
  deviceLabel?: string | null
  devicePlatform?: string | null
  appVersion?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
}) => {
  const normalizedEmail = email.trim().toLowerCase()
  const tenant = await getTenantAccessRecordByEmail(normalizedEmail)

  if (!tenant || !(await verifyTenantPassword(tenant, password))) {
    throw new ApiPlatformError('Invalid credentials.', {
      statusCode: 401,
      errorCode: 'invalid_token'
    })
  }

  const refreshToken = buildRefreshToken()
  const sessionId = buildSessionId()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await query(
    `
      INSERT INTO greenhouse_core.first_party_app_sessions (
        app_session_id,
        public_id,
        user_id,
        client_id,
        space_id,
        organization_id,
        refresh_token_hash,
        device_label,
        device_platform,
        app_version,
        expires_at,
        ip_hash,
        user_agent_hash,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `,
    [
      sessionId,
      buildPublicId(),
      tenant.userId,
      tenant.clientId || null,
      tenant.spaceId,
      tenant.organizationId,
      hashToken(refreshToken),
      deviceLabel || null,
      devicePlatform || null,
      appVersion || null,
      refreshExpiresAt,
      ipHash || null,
      userAgentHash || null
    ]
  )

  return buildTokenPair({ sessionId, tenant, refreshToken, refreshExpiresAt })
}

export const refreshFirstPartyAppSession = async (refreshToken: string) => {
  const refreshTokenHash = hashToken(refreshToken)

  const rows = await query<FirstPartyAppSessionRow>(
    `
      SELECT app_session_id, user_id, session_status, expires_at
      FROM greenhouse_core.first_party_app_sessions
      WHERE refresh_token_hash = $1
      LIMIT 1
    `,
    [refreshTokenHash]
  )

  const session = rows[0]

  if (!session || session.session_status !== 'active' || new Date(toIsoString(session.expires_at)).getTime() <= Date.now()) {
    throw new ApiPlatformError('Invalid refresh token.', {
      statusCode: 401,
      errorCode: 'invalid_refresh_token'
    })
  }

  const tenant = await getTenantAccessRecordByUserId(session.user_id)

  if (!tenant || !tenant.active || tenant.status !== 'active') {
    throw new ApiPlatformError('User session is no longer active.', {
      statusCode: 401,
      errorCode: 'invalid_session'
    })
  }

  const nextRefreshToken = buildRefreshToken()
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await query(
    `
      UPDATE greenhouse_core.first_party_app_sessions
      SET
        refresh_token_hash = $2,
        expires_at = $3,
        last_used_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE app_session_id = $1
    `,
    [session.app_session_id, hashToken(nextRefreshToken), refreshExpiresAt]
  )

  return buildTokenPair({
    sessionId: session.app_session_id,
    tenant,
    refreshToken: nextRefreshToken,
    refreshExpiresAt
  })
}

export const revokeFirstPartyAppSession = async ({
  sessionId,
  userId,
  reason = 'user_requested'
}: {
  sessionId: string
  userId: string
  reason?: string
}) => {
  await query(
    `
      UPDATE greenhouse_core.first_party_app_sessions
      SET
        session_status = 'revoked',
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by_user_id = $2,
        revoked_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE app_session_id = $1 AND user_id = $2 AND session_status = 'active'
    `,
    [sessionId, userId, reason]
  )
}

const buildTokenPair = async ({
  sessionId,
  tenant,
  refreshToken,
  refreshExpiresAt
}: {
  sessionId: string
  tenant: TenantAccessRecord
  refreshToken: string
  refreshExpiresAt: string
}) => {
  const accessToken = await buildAccessToken({ sessionId, userId: tenant.userId })
  const decoded = decodeJwt(accessToken) as { exp?: number } | null

  return {
    tokenType: 'Bearer',
    accessToken,
    accessTokenExpiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt,
    appSessionId: sessionId,
    tenant
  }
}
