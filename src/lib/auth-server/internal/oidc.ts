/** TASK-1836 — tenant-pinned OIDC. Only validates identity; never maps upstream MFA to local step-up.
 * Sources: https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation
 * https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
 */
import { randomBytes } from 'node:crypto'

import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'

import { sha256Hex, safeEquals } from '../oauth/primitives'

export type EntraOidcConfig = { tenantId: string; clientId: string; issuer: string; redirectUri: string }
export type UpstreamIdentity = { issuer: string; tenantId: string; objectId: string; authTime: Date }

export class InternalLoginError extends Error {
  constructor(
    readonly code: 'configuration_invalid' | 'transaction_invalid' | 'upstream_rejected' | 'upstream_unavailable'
  ) {
    super(code)
    this.name = 'InternalLoginError'
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const validateEntraOidcConfig = (config: EntraOidcConfig): void => {
  try {
    const redirect = new URL(config.redirectUri)

    if (
      !UUID.test(config.tenantId) ||
      !UUID.test(config.clientId) ||
      config.issuer !== `https://login.microsoftonline.com/${config.tenantId}/v2.0` ||
      redirect.protocol !== 'https:' ||
      redirect.username ||
      redirect.password ||
      redirect.hash ||
      redirect.search ||
      redirect.pathname !== '/auth/internal/callback'
    )
      throw new Error()
  } catch {
    throw new InternalLoginError('configuration_invalid')
  }
}

export type InternalLoginTransaction = {
  id: string
  browserBindingHash: string
  nonce: string
  codeVerifier: string
  returnTo: string
  createdAt: Date
  expiresAt: Date
}

/** Stored transaction payload must be encrypted by the runtime adapter; never log it. */
export interface InternalLoginTransactionPort {
  insert(transaction: InternalLoginTransaction): Promise<void>
  /** Atomic consume requires the browser-bound hash; mismatch must not consume someone else's login. */
  consume(input: { id: string; browserBindingHash: string; now: Date }): Promise<InternalLoginTransaction | null>
}

export type EntraOidcClient = {
  authorizationUrl(input: { state: string; nonce: string; codeChallenge: string }): string
  exchange(input: { code: string; nonce: string; codeVerifier: string; now: Date }): Promise<UpstreamIdentity>
}

const readTokenResponse = async (response: Response): Promise<unknown> => {
  const reader = response.body?.getReader()

  if (!reader) throw new InternalLoginError('upstream_rejected')
  const chunks: Uint8Array[] = []
  let size = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break
      size += value.byteLength
      if (size > 65536) throw new InternalLoginError('upstream_rejected')
      chunks.push(value)
    }

    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw new InternalLoginError('upstream_rejected')
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

export const createEntraOidcClient = (deps: {
  config: EntraOidcConfig
  getClientSecret: () => Promise<string>
  fetch?: typeof globalThis.fetch
  /** Test seam: runtime omits this and always uses the tenant-pinned JWKS. */
  verificationKey?: JWTVerifyGetKey
}): EntraOidcClient => {
  const { config } = deps

  validateEntraOidcConfig(config)
  const base = `https://login.microsoftonline.com/${config.tenantId}`

  const key =
    deps.verificationKey ?? createRemoteJWKSet(new URL(`${base}/discovery/v2.0/keys`), { timeoutDuration: 10000 })

  return {
    authorizationUrl: ({ state, nonce, codeChallenge }) => {
      const url = new URL(`${base}/oauth2/v2.0/authorize`)

      url.search = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: config.redirectUri,
        response_mode: 'query',
        scope: 'openid',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        // Request a fresh authentication time; no business API scopes or refresh custody upstream.
        max_age: '0'
      }).toString()

      return url.toString()
    },
    exchange: async ({ code, nonce, codeVerifier, now }) => {
      try {
        const secret = await deps.getClientSecret()

        if (!secret) throw new InternalLoginError('configuration_invalid')

        const response = await (deps.fetch ?? globalThis.fetch)(`${base}/oauth2/v2.0/token`, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: secret,
            redirect_uri: config.redirectUri,
            code,
            code_verifier: codeVerifier
          })
        })

        if (!response.ok) throw new InternalLoginError('upstream_rejected')
        const body: unknown = await readTokenResponse(response)
        const token = body && typeof body === 'object' && 'id_token' in body ? body.id_token : null

        if (typeof token !== 'string' || token.length > 32768) throw new InternalLoginError('upstream_rejected')

        const { payload } = await jwtVerify(token, key, {
          issuer: config.issuer,
          audience: config.clientId,
          algorithms: ['RS256'],
          currentDate: now,
          requiredClaims: ['exp', 'iat', 'sub', 'tid', 'oid', 'nonce', 'auth_time']
        })

        if (
          payload.aud !== config.clientId ||
          typeof payload.sub !== 'string' ||
          !payload.sub ||
          typeof payload.iat !== 'number' ||
          payload.iat > Math.floor(now.getTime() / 1000) ||
          payload.tid !== config.tenantId ||
          typeof payload.oid !== 'string' ||
          !UUID.test(payload.oid) ||
          typeof payload.nonce !== 'string' ||
          !safeEquals(payload.nonce, nonce) ||
          (payload.azp !== undefined && payload.azp !== config.clientId) ||
          typeof payload.auth_time !== 'number' ||
          !Number.isSafeInteger(payload.auth_time) ||
          payload.auth_time > payload.iat ||
          payload.auth_time > Math.floor(now.getTime() / 1000) ||
          payload.auth_time < Math.floor(now.getTime() / 1000) - 600
        ) {
          throw new InternalLoginError('upstream_rejected')
        }

        return {
          issuer: config.issuer,
          tenantId: config.tenantId,
          objectId: payload.oid,
          authTime: new Date(payload.auth_time * 1000)
        }
      } catch (error) {
        if (error instanceof InternalLoginError) throw error

        if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) {
          throw new InternalLoginError('upstream_rejected')
        }

        // No upstream body, token, code or low-level message crosses this boundary.
        throw new InternalLoginError('upstream_unavailable')
      }
    }
  }
}

export const createInternalLoginFlow = (deps: {
  enabled: () => boolean
  issuer: string
  store: InternalLoginTransactionPort
  upstream: EntraOidcClient
  now?: () => Date
}) => ({
  start: async (returnTo: string) => {
    if (!deps.enabled()) throw new InternalLoginError('configuration_invalid')
    let url: URL

    try {
      url = new URL(returnTo, deps.issuer)
    } catch {
      throw new InternalLoginError('transaction_invalid')
    }

    if (returnTo.length > 8192) throw new InternalLoginError('transaction_invalid')

    if (
      url.origin !== new URL(deps.issuer).origin ||
      url.pathname !== '/oauth/authorize' ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new InternalLoginError('transaction_invalid')
    }

    const now = (deps.now ?? (() => new Date()))()
    const browserBinding = randomBytes(32).toString('base64url')

    const transaction: InternalLoginTransaction = {
      id: randomBytes(32).toString('base64url'),
      browserBindingHash: sha256Hex(browserBinding),
      nonce: randomBytes(32).toString('base64url'),
      codeVerifier: randomBytes(32).toString('base64url'),
      returnTo: url.pathname + url.search,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 600000)
    }

    await deps.store.insert(transaction)
    const challenge = Buffer.from(sha256Hex(transaction.codeVerifier), 'hex').toString('base64url')

    return {
      location: deps.upstream.authorizationUrl({
        state: transaction.id,
        nonce: transaction.nonce,
        codeChallenge: challenge
      }),
      browserBinding
    }
  },
  complete: async (input: { state: string; browserBinding: string; code: string }) => {
    if (
      !deps.enabled() ||
      !/^[\w-]{43}$/.test(input.state) ||
      !/^[\w-]{43}$/.test(input.browserBinding) ||
      !input.code ||
      input.code.length > 8192
    )
      throw new InternalLoginError('transaction_invalid')
    const now = (deps.now ?? (() => new Date()))()

    const transaction = await deps.store.consume({
      id: input.state,
      browserBindingHash: sha256Hex(input.browserBinding),
      now
    })

    if (
      !transaction ||
      transaction.id !== input.state ||
      !Number.isFinite(transaction.createdAt.getTime()) ||
      !Number.isFinite(transaction.expiresAt.getTime()) ||
      transaction.expiresAt.getTime() - transaction.createdAt.getTime() > 600000 ||
      !/^[\w-]{43}$/.test(transaction.nonce) ||
      !/^[\w-]{43}$/.test(transaction.codeVerifier) ||
      transaction.expiresAt <= now ||
      transaction.createdAt > now ||
      !safeEquals(transaction.browserBindingHash, sha256Hex(input.browserBinding))
    )
      throw new InternalLoginError('transaction_invalid')
    let returnUrl: URL

    try {
      returnUrl = new URL(transaction.returnTo, deps.issuer)
    } catch {
      throw new InternalLoginError('transaction_invalid')
    }

    if (
      returnUrl.origin !== new URL(deps.issuer).origin ||
      returnUrl.pathname !== '/oauth/authorize' ||
      returnUrl.hash ||
      returnUrl.username ||
      returnUrl.password
    )
      throw new InternalLoginError('transaction_invalid')

    const identity = await deps.upstream.exchange({
      code: input.code,
      nonce: transaction.nonce,
      codeVerifier: transaction.codeVerifier,
      now
    })

    // max_age=0 is a fresh-login request. Tolerate only one minute of clock skew relative to start.
    if (
      !Number.isFinite(identity.authTime.getTime()) ||
      identity.authTime.getTime() < transaction.createdAt.getTime() - 60000
    )
      throw new InternalLoginError('upstream_rejected')
    if (!deps.enabled()) throw new InternalLoginError('configuration_invalid')

    return { identity, returnTo: returnUrl.pathname + returnUrl.search }
  }
})
