import { NextResponse } from 'next/server'

import { listActiveCtaOrigins } from '@/lib/growth/ctas/store'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1339 — Resolver CORS gobernado del motor público de CTAs.
 *
 * Espejo del resolver de Growth Forms (TASK-1335): el transporte CORS = UNIÓN de
 * `origin_allowlist_json` de las `cta_surface_binding` active (SoT único = la DB;
 * sin literal hardcodeado ni env var). El transporte es surface-agnóstico (unión)
 * porque el preflight OPTIONS no lleva surfaceId; la autoridad fina por-surface
 * (origin + slug + embed key + cross-check) sigue server-side en readers/ingest.
 *
 * Invariante de fallo: fail-CLOSED para origin desconocido; fail-SAFE para el data
 * source (cache in-memory stale-on-error, TTL 90s — también acota el kill-switch
 * window de la §16.3: pausar una surface deja de emitir ACAO en ≤90s + TTL).
 */

const CACHE_TTL_MS = 90_000

type OriginCache = { origins: Set<string>; expiresAt: number }

let cache: OriginCache | null = null
let inflight: Promise<Set<string>> | null = null

const isProduction = () => process.env.NODE_ENV === 'production'

const isServeableOrigin = (origin: string): boolean => !(isProduction() && origin.endsWith('.local'))

const loadOrigins = async (): Promise<Set<string>> => {
  const origins = await listActiveCtaOrigins()

  return new Set(origins.filter(isServeableOrigin))
}

const refresh = async (): Promise<Set<string>> => {
  if (inflight) return inflight

  inflight = loadOrigins()
    .then(origins => {
      cache = { origins, expiresAt: Date.now() + CACHE_TTL_MS }

      return origins
    })
    .catch((error: unknown) => {
      captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_public_cors_resolver' } })

      return cache?.origins ?? new Set<string>()
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

const resolveAllowedOrigins = async (): Promise<Set<string>> => {
  const now = Date.now()

  if (cache && cache.expiresAt > now) return cache.origins

  if (cache) {
    void refresh()

    return cache.origins
  }

  return refresh()
}

export const publicCtasCorsHeaders = async (request: Request, methods: string): Promise<HeadersInit> => {
  const origin = request.headers.get('origin')

  const headers: Record<string, string> = {
    Vary: 'Origin',
  }

  if (origin) {
    const allowed = await resolveAllowedOrigins()

    if (allowed.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Methods'] = methods
      headers['Access-Control-Allow-Headers'] =
        'content-type, accept, x-greenhouse-cta-embed-key, x-greenhouse-cta-visitor, x-greenhouse-cta-session, x-greenhouse-cta-consent, x-greenhouse-cta-consent-source'
      headers['Access-Control-Max-Age'] = '86400'
    }
  }

  return headers
}

export const publicCtasOptionsResponse = async (request: Request, methods: string): Promise<NextResponse> =>
  new NextResponse(null, {
    status: 204,
    headers: await publicCtasCorsHeaders(request, methods),
  })

/** Test-only: limpia el cache in-memory del resolver entre casos. NO usar en runtime. */
export const resetPublicCtasCorsCacheForTests = (): void => {
  cache = null
  inflight = null
}
