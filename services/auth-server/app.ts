/**
 * Efeonce Auth Server — handler HTTP testeable (TASK-1828 llaves · TASK-1829 OAuth).
 *
 * `server.ts` sólo arranca `node:http` con `createAuthServerRequestHandler(deps)`; todo lo que decide
 * una respuesta vive acá para poder ejercitarse in-process con un store en memoria y un firmador local.
 *
 *   GET /healthz                                     → 200 siempre (liveness; no toca KMS ni PG)
 *   GET /readyz                                      → 200 si AUTH_SERVER_ENABLED y KMS + PG responden; 503 en otro caso
 *   GET /.well-known/jwks.json                       → JWKS `active` + `retiring` (404 si el flag está OFF)
 *   GET /.well-known/oauth-authorization-server      ┐
 *   GET /.well-known/openid-configuration            │ TASK-1829 — 404 mientras AUTH_SERVER_OAUTH_ENABLED=false
 *   /oauth/{authorize,token,register,revoke,introspect,consent} ┘
 *   GET  /login · POST /auth/magic-link/{request,consume} · GET /m/<token>   ┐ TASK-1830 — 404 mientras
 *   GET  /i/<token> · POST /auth/invitations/accept · /auth/session[/logout] ┘ AUTH_SERVER_PERSON_AUTH_ENABLED=false
 *
 * Invariantes: cookie/sesión/secretos propios (nunca NEXTAUTH_SECRET); la llave privada vive en
 * Cloud KMS HSM; ningún error interno se devuelve al cliente en prosa; `Host` fuera del allowlist → 421.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'

import type { ConsentContextPort } from '@/lib/auth-server/oauth/consent-context'

import { captureWithDomain } from '@/lib/observability/capture'
import { buildPublishedJwks, type KmsSignerPort, type SigningKeyRecord } from '@/lib/auth-server/keys'
import {
  createOAuthHandler,
  headersFromRecord,
  isOAuthPath,
  MAX_BODY_BYTES,
  type AuthServerOAuthConfig,
  type GrantsVersionPort,
  type OAuthHttpRequest,
  type OAuthStorePort,
  type SubjectSessionPort
} from '@/lib/auth-server/oauth'
import { isInternalLoginPath } from '@/lib/auth-server/internal/login-http'
import type { OAuthHttpResponse } from '@/lib/auth-server/oauth/http'
import type { ClientResolverDeps } from '@/lib/auth-server/oauth/clients'
import type { AccessTokenSigner } from '@/lib/auth-server/oauth/tokens'
import { getAuthFontAsset } from '@/lib/auth-server/oauth/pages/assets'
import { createPersonAuthHandler, isPersonAuthPath, type PersonAuthHandlerDeps } from '@/lib/auth-server/persons'

export const SERVICE_NAME = 'auth-server'

const JWKS_CACHE_TTL_MS = 60_000
const JWKS_HTTP_MAX_AGE_SECONDS = 300

export type AuthServerAppDeps = {
  enabled: boolean
  allowedHosts: readonly string[]
  gitSha: string
  oauthConfig: AuthServerOAuthConfig
  /** `SELECT 1` contra PG. */
  pingPostgres: () => Promise<void>
  getActiveSigningKey: () => Promise<SigningKeyRecord | null>
  getPublishableSigningKeys: () => Promise<readonly SigningKeyRecord[]>
  getSigner: () => KmsSignerPort
  /** Firma un payload con la llave `active` (adapter sobre `signWithActiveKey`). */
  signAccessToken: AccessTokenSigner
  store: OAuthStorePort
  subjectPort: SubjectSessionPort
  consentContextPort: ConsentContextPort
  grantsPort: GrantsVersionPort
  cimd: ClientResolverDeps['cimd']
  /**
   * TASK-1830 — superficie de personas (login sin contraseña). `undefined` = no cableada; con el
   * flag `AUTH_SERVER_PERSON_AUTH_ENABLED=false` el propio router responde 404.
   */
  internal?: (request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null>
  persons?: PersonAuthHandlerDeps
  now?: () => Date
}

export type NodeRequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

const readBody = (req: IncomingMessage): Promise<string | null> =>
  new Promise(resolve => {
    const chunks: Buffer[] = []
    let received = 0

    req.on('data', (chunk: Buffer) => {
      received += chunk.length

      if (received > MAX_BODY_BYTES) {
        req.destroy()
        resolve(null)

        return
      }

      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => resolve(null))
  })

const writeJson = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  const payload = JSON.stringify(body)

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  })
  res.end(payload)
}

export const createAuthServerRequestHandler = (deps: AuthServerAppDeps): NodeRequestHandler => {
  const now = deps.now ?? (() => new Date())
  const allowedHosts = deps.allowedHosts.map(host => host.trim().toLowerCase()).filter(Boolean)
  let jwksCache: { body: ReturnType<typeof buildPublishedJwks>; fetchedAt: number } | null = null

  const loadJwks = async () => {
    if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) return jwksCache.body

    const body = buildPublishedJwks(await deps.getPublishableSigningKeys())

    jwksCache = { body, fetchedAt: Date.now() }

    return body
  }

  const oauth = createOAuthHandler({
    store: deps.store,
    config: deps.oauthConfig,
    signer: deps.signAccessToken,
    subjectPort: deps.subjectPort,
    grantsPort: deps.grantsPort,
    consentContextPort: deps.consentContextPort,
    loadKeys: deps.getPublishableSigningKeys,
    cimd: deps.cimd,
    now
  })

  const persons = deps.persons ? createPersonAuthHandler(deps.persons) : null

  const requestHost = (req: IncomingMessage) => (req.headers.host ?? '').split(':')[0]?.trim().toLowerCase() ?? ''
  const isAllowedHost = (req: IncomingMessage) => allowedHosts.length === 0 || allowedHosts.includes(requestHost(req))

  return async (req, res) => {
    const method = req.method?.toUpperCase() || 'GET'
    const url = new URL(req.url || '/', deps.oauthConfig.issuer)
    const path = url.pathname

    try {
      if (method === 'GET' && path === '/healthz') {
        writeJson(res, 200, { status: 'ok', service: SERVICE_NAME, enabled: deps.enabled, oauth: deps.oauthConfig.oauthEnabled, gitSha: deps.gitSha, timestamp: now().toISOString() })

        return
      }

      if (!isAllowedHost(req)) {
        writeJson(res, 421, { error: 'misdirected_request' })

        return
      }

      if (deps.enabled && path.startsWith('/fonts/')) {
        const asset = getAuthFontAsset(path)

        if (!asset) {
          writeJson(res, 404, { error: 'not_found' })

return
        }

        if (method !== 'GET' && method !== 'HEAD') {
          writeJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD' })

return
        }

        res.writeHead(200, {
          'Content-Type': asset.contentType,
          'Content-Length': asset.body.byteLength,
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'Cross-Origin-Resource-Policy': 'same-origin',
          ETag: `"${asset.sha256}"`
        })
        res.end(method === 'HEAD' ? undefined : asset.body)

return
      }

      if (method === 'GET' && path === '/readyz') {
        if (!deps.enabled) {
          writeJson(res, 503, { status: 'disabled', service: SERVICE_NAME, timestamp: now().toISOString() })

          return
        }

        const checks: Record<string, 'ok' | 'error'> = { postgres: 'error', kms: 'error', activeKey: 'error' }

        try {
          await deps.pingPostgres()
          checks.postgres = 'ok'
        } catch (error) {
          captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, check: 'postgres' } })
        }

        try {
          const active = await deps.getActiveSigningKey()

          if (active) {
            checks.activeKey = 'ok'
            await deps.getSigner().getPublicKeyPem(active.kmsKeyVersion)
            checks.kms = 'ok'
          }
        } catch (error) {
          captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, check: 'kms' } })
        }

        const ready = Object.values(checks).every(value => value === 'ok')

        writeJson(res, ready ? 200 : 503, { status: ready ? 'ready' : 'degraded', service: SERVICE_NAME, oauth: deps.oauthConfig.oauthEnabled, checks, timestamp: now().toISOString() })

        return
      }

      if (method === 'GET' && path === '/.well-known/jwks.json') {
        if (!deps.enabled) {
          writeJson(res, 404, { error: 'not_found' })

          return
        }

        writeJson(res, 200, await loadJwks(), { 'Cache-Control': `public, max-age=${JWKS_HTTP_MAX_AGE_SECONDS}` })

        return
      }

      const isProtocolPath = isOAuthPath(path)
      const isPersonPath = Boolean(persons) && isPersonAuthPath(path)
      const isInternalPath = Boolean(deps.internal) && isInternalLoginPath(path)

      if (deps.enabled && (isProtocolPath || isPersonPath || isInternalPath)) {
        const body = method === 'GET' || method === 'HEAD' ? '' : await readBody(req)

        if (body === null) {
          writeJson(res, 413, { error: 'invalid_request', error_description: 'body too large' })

          return
        }

        // GCP external ALB appends client IP and LB IP after untrusted supplied values.
        // https://docs.cloud.google.com/load-balancing/docs/https#x-forwarded-for_header
        const rawHeaders = headersFromRecord(req.headers)
        const chain = (rawHeaders.get('x-forwarded-for') ?? '').split(',').map(value => value.trim())
        const clientIp = chain.length >= 2 ? chain[chain.length - 2] : ''

        const headers = {get:(name:string) => {
          if (name.toLowerCase() === 'x-real-ip') return null
          if (name.toLowerCase() === 'x-forwarded-for') return isIP(clientIp) ? clientIp : null

          return rawHeaders.get(name)
        }}

        const request: OAuthHttpRequest = { method, url, headers, body }
        const response = isProtocolPath ? await oauth(request) : isInternalPath ? await deps.internal!(request) : await persons!(request)

        if (response) {
          res.writeHead(response.status, { ...response.headers, 'Content-Length': Buffer.byteLength(response.body) })
          res.end(response.body)

          return
        }
      }

      writeJson(res, 404, { error: 'not_found' })
    } catch (error) {
      // Nunca devolver el mensaje interno al cliente: es un servicio de autenticación público.
      captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, path } })
      console.error(`[${SERVICE_NAME}] ${method} ${path} failed:`, error instanceof Error ? error.message : 'unknown')

      if (!res.headersSent) writeJson(res, 500, { error: 'internal_error' })
      else res.end()
    }
  }
}
