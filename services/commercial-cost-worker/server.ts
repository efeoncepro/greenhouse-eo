/**
 * Commercial Cost Worker — Cloud Run Service
 *
 * Standalone HTTP server that runs commercial cost basis materialization
 * outside Vercel's serverless timeout. Reuses src/lib/ modules from the monorepo.
 *
 * Endpoints:
 *   GET  /health
 *   POST /cost-basis/materialize
 *   POST /cost-basis/materialize/people
 *   POST /cost-basis/materialize/roles
 *   POST /cost-basis/materialize/tools
 *   POST /cost-basis/materialize/bundle
 *   POST /quotes/reprice-bulk
 *   POST /margin-feedback/materialize           (TASK-482)
 *
 * Auth: Cloud Run IAM (--no-allow-unauthenticated) + optional CRON_SECRET header
 * Runtime: Node.js 22 via esbuild bundle
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import {
  normalizeQuoteRepriceBulkRequest,
  normalizeCommercialCostBasisRequest,
  type CommercialCostBasisScope
} from '@/lib/commercial-cost-worker/contracts'
import {
  normalizeMarginFeedbackRequest,
  runMarginFeedback
} from '@/lib/commercial-cost-worker/margin-feedback'
import { runCommercialCostBasisMaterialization } from '@/lib/commercial-cost-worker/materialize'
import { runQuoteRepriceBulk } from '@/lib/commercial-cost-worker/quote-reprice-bulk'

import { checkAuthorization } from './auth'

const PORT = Number(process.env.PORT) || 8080
const CRON_SECRET = process.env.CRON_SECRET?.trim() || ''

type JsonObject = Record<string, unknown>

const isAuthorized = (req: IncomingMessage): boolean =>
  checkAuthorization(req.headers.authorization, CRON_SECRET)

const readBody = (req: IncomingMessage): Promise<JsonObject> =>
  new Promise(resolve => {
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim()

        resolve(text ? (JSON.parse(text) as JsonObject) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })

const json = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const now = () => new Date().toISOString()

const methodNotAllowed = (res: ServerResponse, method: string | undefined) => {
  json(res, 405, {
    error: 'METHOD_NOT_ALLOWED',
    method: method || 'UNKNOWN'
  })
}

const notFound = (res: ServerResponse, pathname: string) => {
  json(res, 404, {
    error: 'NOT_FOUND',
    path: pathname
  })
}

const withScopeOverride = (body: JsonObject, scope: CommercialCostBasisScope | null): JsonObject =>
  scope ? { ...body, scope } : body

const handleHealth = (_req: IncomingMessage, res: ServerResponse) => {
  json(res, 200, {
    status: 'ok',
    service: 'commercial-cost-worker',
    timestamp: now()
  })
}

const handleMaterialize = async (
  req: IncomingMessage,
  res: ServerResponse,
  scopeOverride: CommercialCostBasisScope | null
) => {
  const body = await readBody(req)
  const resolvedScope = scopeOverride ?? (typeof body.scope === 'string' ? body.scope : 'bundle')

  try {
    const normalizedRequest = normalizeCommercialCostBasisRequest(withScopeOverride(body, scopeOverride))
    const result = await runCommercialCostBasisMaterialization(normalizedRequest)

    json(res, 200, {
      service: 'commercial-cost-worker',
      scope: resolvedScope,
      timestamp: now(),
      result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error(
      `[commercial-cost-worker] materialization failed for scope=${scopeOverride ?? 'auto'}:`,
      message
    )

    json(res, 502, {
      error: message,
      scope: resolvedScope,
      timestamp: now()
    })
  }
}

const handleQuoteRepriceBulk = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  try {
    const normalizedRequest = normalizeQuoteRepriceBulkRequest(body)
    const result = await runQuoteRepriceBulk(normalizedRequest)

    json(res, 200, {
      service: 'commercial-cost-worker',
      timestamp: now(),
      result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[commercial-cost-worker] quote repricing failed:', message)

    json(res, 502, {
      error: message,
      timestamp: now()
    })
  }
}

const handleMarginFeedback = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  try {
    const normalizedRequest = normalizeMarginFeedbackRequest(body)
    const result = await runMarginFeedback(normalizedRequest)

    json(res, 200, {
      service: 'commercial-cost-worker',
      timestamp: now(),
      result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[commercial-cost-worker] margin feedback failed:', message)

    json(res, 502, {
      error: message,
      timestamp: now()
    })
  }
}

const server = createServer(async (req, res) => {
  const method = req.method || 'GET'
  const url = new URL(req.url || '/', 'http://localhost')
  const { pathname } = url

  if (pathname === '/health') {
    if (method !== 'GET') return methodNotAllowed(res, req.method)

    return handleHealth(req, res)
  }

  if (!isAuthorized(req)) {
    return json(res, 401, {
      error: 'UNAUTHORIZED'
    })
  }

  if (pathname === '/cost-basis/materialize') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleMaterialize(req, res, null)
  }

  if (pathname === '/cost-basis/materialize/people') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleMaterialize(req, res, 'people')
  }

  if (pathname === '/cost-basis/materialize/roles') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleMaterialize(req, res, 'roles')
  }

  if (pathname === '/cost-basis/materialize/tools') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleMaterialize(req, res, 'tools')
  }

  if (pathname === '/cost-basis/materialize/bundle') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleMaterialize(req, res, 'bundle')
  }

  if (pathname === '/quotes/reprice-bulk') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleQuoteRepriceBulk(req, res)
  }

  if (pathname === '/margin-feedback/materialize') {
    if (method !== 'POST') return methodNotAllowed(res, req.method)

    return handleMarginFeedback(req, res)
  }

  return notFound(res, pathname)
})

server.listen(PORT, () => {
  console.log(`[commercial-cost-worker] listening on :${PORT}`)
})
