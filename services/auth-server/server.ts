/**
 * Efeonce Auth Server — Cloud Run Service (TASK-1828, EPIC-044)
 *
 * Authorization server propio de Efeonce en `auth.efeonce.org`. Esta primera entrega
 * (Slice 1) publica sólo la infraestructura de llaves:
 *
 *   GET /healthz                 → 200 siempre (liveness; no toca KMS ni PG)
 *   GET /readyz                  → 200 si AUTH_SERVER_ENABLED=true y KMS + PG responden; 503 en otro caso
 *   GET /.well-known/jwks.json   → JWKS con las llaves `active` + `retiring` (404 si el flag está OFF)
 *
 * Los endpoints OAuth (`/.well-known/oauth-authorization-server`, `/oauth/*`) llegan en
 * TASK-1829 y la autenticación de personas en TASK-1830.
 *
 * Auth/ingress: el servicio se despliega con `--ingress=internal-and-cloud-load-balancing`
 * y `--allow-unauthenticated`: sólo el global LB del gateway lo alcanza y el ALB no emite
 * tokens IAM hacia un serverless NEG. La aplicación valida `Host` contra
 * `AUTH_SERVER_ALLOWED_HOSTS`.
 *
 * Invariantes: cookie/sesión/secretos propios (nunca NEXTAUTH_SECRET); la llave privada
 * vive en Cloud KMS HSM; ningún error interno se devuelve al cliente en prosa.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

// TASK-844 — Sentry init must run BEFORE any function from @/lib/** is invoked.
import { initSentryForService } from '../_shared/sentry-init'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  buildPublishedJwks,
  createCloudKmsSigner,
  getActiveSigningKey,
  getAuthServerKmsKeyName,
  getPublishableSigningKeys,
  type KmsSignerPort
} from '@/lib/auth-server/keys'

initSentryForService('auth-server')

// ─── Config ─────────────────────────────────────────────────────────────────

const SERVICE_NAME = 'auth-server'
const PORT = Number(process.env.PORT) || 8080
const AUTH_SERVER_ENABLED = process.env.AUTH_SERVER_ENABLED?.trim().toLowerCase() === 'true'
const ISSUER = process.env.AUTH_SERVER_ISSUER?.trim() || 'https://auth.efeonce.org'

const ALLOWED_HOSTS = (process.env.AUTH_SERVER_ALLOWED_HOSTS ?? '')
  .split(',')
  .map(host => host.trim().toLowerCase())
  .filter(Boolean)

const JWKS_CACHE_TTL_MS = 60_000
const JWKS_HTTP_MAX_AGE_SECONDS = 300
const GIT_SHA = process.env.GIT_SHA ?? 'unknown'

let kmsSigner: KmsSignerPort | null = null

const getSigner = (): KmsSignerPort => {
  if (!kmsSigner) {
    kmsSigner = createCloudKmsSigner()
  }

  return kmsSigner
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
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

const requestHost = (req: IncomingMessage): string => {
  const raw = req.headers.host ?? ''

  return raw.split(':')[0]?.trim().toLowerCase() ?? ''
}

const isAllowedHost = (req: IncomingMessage): boolean => {
  if (ALLOWED_HOSTS.length === 0) return true

  return ALLOWED_HOSTS.includes(requestHost(req))
}

// ─── JWKS cache ─────────────────────────────────────────────────────────────

type JwksCache = { body: ReturnType<typeof buildPublishedJwks>; fetchedAt: number }

let jwksCache: JwksCache | null = null

const loadJwks = async (): Promise<JwksCache['body']> => {
  const cached = jwksCache

  if (cached && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    return cached.body
  }

  const keys = await getPublishableSigningKeys()
  const body = buildPublishedJwks(keys)

  jwksCache = { body, fetchedAt: Date.now() }

  return body
}

// ─── Handlers ───────────────────────────────────────────────────────────────

const handleHealth = (_req: IncomingMessage, res: ServerResponse) => {
  json(res, 200, { status: 'ok', service: SERVICE_NAME, enabled: AUTH_SERVER_ENABLED, gitSha: GIT_SHA, timestamp: now() })
}

const handleReady = async (_req: IncomingMessage, res: ServerResponse) => {
  if (!AUTH_SERVER_ENABLED) {
    json(res, 503, { status: 'disabled', service: SERVICE_NAME, timestamp: now() })

    return
  }

  const checks: Record<string, 'ok' | 'error'> = { postgres: 'error', kms: 'error', activeKey: 'error' }

  try {
    await query('SELECT 1')
    checks.postgres = 'ok'
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, check: 'postgres' } })
  }

  try {
    const active = await getActiveSigningKey()

    if (active) {
      checks.activeKey = 'ok'
      await getSigner().getPublicKeyPem(active.kmsKeyVersion)
      checks.kms = 'ok'
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, check: 'kms' } })
  }

  const ready = Object.values(checks).every(value => value === 'ok')

  json(res, ready ? 200 : 503, { status: ready ? 'ready' : 'degraded', service: SERVICE_NAME, checks, timestamp: now() })
}

const handleJwks = async (_req: IncomingMessage, res: ServerResponse) => {
  if (!AUTH_SERVER_ENABLED) {
    json(res, 404, { error: 'not_found' })

    return
  }

  const body = await loadJwks()

  json(res, 200, body, { 'Cache-Control': `public, max-age=${JWKS_HTTP_MAX_AGE_SECONDS}` })
}

// ─── Router ─────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const method = req.method?.toUpperCase() || 'GET'
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    if (method === 'GET' && path === '/healthz') {
      handleHealth(req, res)

      return
    }

    if (!isAllowedHost(req)) {
      json(res, 421, { error: 'misdirected_request' })

      return
    }

    if (method === 'GET' && path === '/readyz') {
      await handleReady(req, res)

      return
    }

    if (method === 'GET' && path === '/.well-known/jwks.json') {
      await handleJwks(req, res)

      return
    }

    json(res, 404, { error: 'not_found' })
  } catch (error) {
    // Nunca devolver el mensaje interno al cliente: es un servicio de autenticación público.
    captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, path } })
    console.error(`[${SERVICE_NAME}] ${method} ${path} failed:`, error instanceof Error ? error.message : 'unknown')
    json(res, 500, { error: 'internal_error' })
  }
})

server.listen(PORT, () => {
  console.log(
    `[${SERVICE_NAME}] listening on :${PORT} enabled=${AUTH_SERVER_ENABLED} issuer=${ISSUER} hosts=${ALLOWED_HOSTS.join(',') || '*'} gitSha=${GIT_SHA}`
  )

  if (AUTH_SERVER_ENABLED) {
    try {
      getAuthServerKmsKeyName()
    } catch (error) {
      console.error(`[${SERVICE_NAME}] misconfiguration:`, error instanceof Error ? error.message : 'unknown')
    }
  }
})

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`[${SERVICE_NAME}] ${signal} received — closing server`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5_000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
