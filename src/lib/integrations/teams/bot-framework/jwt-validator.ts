import 'server-only'

import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose'

/**
 * TASK-671 — JWT validator for inbound Bot Framework requests.
 *
 * The Bot Framework signs Activity POSTs with a token issued by
 * `https://api.botframework.com`. The OpenID configuration is published at:
 *   https://login.botframework.com/v1/.well-known/openidconfiguration
 * which references a JWKS endpoint we cache via `jose.createRemoteJWKSet`.
 *
 * This implementation deliberately avoids `botbuilder` SDK to keep the bundle
 * small and the dependency surface minimal. The rules below mirror the official
 * Bot Connector Service auth contract.
 */

const OPENID_CONFIG_URL = 'https://login.botframework.com/v1/.well-known/openidconfiguration'

const EXPECTED_ISSUERS = new Set([
  'https://api.botframework.com',
  'https://sts.windows.net/d6d49420-f39b-4df7-a1dc-d59a935871db/' // legacy single-tenant issuer
])

let jwksPromise: ReturnType<typeof createRemoteJWKSet> | null = null

const loadJwks = async (): Promise<ReturnType<typeof createRemoteJWKSet>> => {
  if (jwksPromise) return jwksPromise

  const response = await fetch(OPENID_CONFIG_URL, {
    signal: AbortSignal.timeout(8_000)
  })

  if (!response.ok) {
    throw new BotFrameworkJwtError(`Could not fetch OpenID config (${response.status})`)
  }

  const json = (await response.json()) as { jwks_uri?: string }

  if (!json.jwks_uri) {
    throw new BotFrameworkJwtError('OpenID config missing jwks_uri')
  }

  jwksPromise = createRemoteJWKSet(new URL(json.jwks_uri))

  return jwksPromise
}

export class BotFrameworkJwtError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BotFrameworkJwtError'
  }
}

export interface ValidatedBotFrameworkJwt {
  payload: JWTPayload
  appId: string
  serviceUrl: string | null
}

interface ValidateParams {
  /** Raw JWT (without "Bearer " prefix). */
  token: string
  /** Expected `aud` / `appid` of the bot app registration. */
  expectedAppId: string
  /**
   * Optional: expected `serviceurl` claim. Bot Framework includes the conversation's
   * service URL in the token; verifying it prevents service URL spoofing.
   */
  expectedServiceUrl?: string
  /**
   * Test-only override of the JWKS resolver. Production code should not pass this.
   */
  jwksOverride?: ReturnType<typeof createRemoteJWKSet>
}

export const validateBotFrameworkJwt = async ({
  token,
  expectedAppId,
  expectedServiceUrl,
  jwksOverride
}: ValidateParams): Promise<ValidatedBotFrameworkJwt> => {
  if (!token) {
    throw new BotFrameworkJwtError('Empty bearer token')
  }

  const jwks = jwksOverride || (await loadJwks())

  const verifyOptions: JWTVerifyOptions = {
    issuer: Array.from(EXPECTED_ISSUERS),
    audience: expectedAppId,
    clockTolerance: '60s'
  }

  let payload: JWTPayload

  try {
    const result = await jwtVerify(token, jwks, verifyOptions)

    payload = result.payload
  } catch (error) {
    throw new BotFrameworkJwtError(
      `JWT verification failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Bot Framework historically uses both `aud` (validated above) and `appid` claim.
  const appIdClaim = (payload as JWTPayload & { appid?: string }).appid

  if (appIdClaim && appIdClaim !== expectedAppId) {
    throw new BotFrameworkJwtError(`appid claim ${appIdClaim} does not match expected ${expectedAppId}`)
  }

  const serviceUrlClaim = (payload as JWTPayload & { serviceurl?: string }).serviceurl || null

  if (expectedServiceUrl && serviceUrlClaim && serviceUrlClaim !== expectedServiceUrl) {
    throw new BotFrameworkJwtError(
      `serviceurl claim ${serviceUrlClaim} does not match expected ${expectedServiceUrl}`
    )
  }

  return {
    payload,
    appId: expectedAppId,
    serviceUrl: serviceUrlClaim
  }
}

/** Test-only: clear the JWKS cache so a new fetch happens next call. */
export const __resetBotFrameworkJwks = () => {
  jwksPromise = null
}
