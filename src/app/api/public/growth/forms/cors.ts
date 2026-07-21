import { NextResponse } from 'next/server'

import { listActivePublicFormOrigins } from '@/lib/growth/forms/store'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1335 — Resolver CORS gobernado del motor público Growth Forms.
 *
 * El transporte CORS = UNIÓN de `origin_allowlist_json` de las surfaces `active`
 * (SoT único = `greenhouse_growth.form_host_surface`). SIN literal hardcodeado y SIN
 * env var: agregar/quitar un origin permitido = cambio de DATA (una fila en la DB),
 * nunca de código. Mata el drift entre el transporte CORS y la autoridad real del motor.
 *
 * Doble defensa: el transporte permite solo origins gobernados; la autoridad fina
 * por-surface (origin + slug + surface) sigue server-side en el command (`submitForm`).
 * El preflight `OPTIONS /submit` no lleva `surfaceId`, por eso el transporte DEBE ser
 * surface-agnóstico (unión) — una variante "surface-aware por request" rompería el
 * preflight de TODOS los origins (incl. `efeoncepro.com` de `/aeo-2`).
 *
 * Invariante de fallo:
 *  - fail-CLOSED para el origin desconocido (unknown → sin ACAO).
 *  - fail-SAFE para el data source: se sirve del cache in-memory; ante DB caída se
 *    mantiene el last-known-good (stale-on-error). El único hueco es "instancia en frío
 *    + DB no disponible en ese instante", pero ahí el form ya está roto (render/submit
 *    necesitan la DB), así que degradar a sin-ACAO es honesto, no una regresión nueva.
 */

const CACHE_TTL_MS = 90_000

type OriginCache = { origins: Set<string>; expiresAt: number }

let cache: OriginCache | null = null
let inflight: Promise<Set<string>> | null = null

const isProduction = () => process.env.NODE_ENV === 'production'

// `*.local` (p.ej. `shadow.local`) es un pseudo-origin gobernado en la DB para
// desarrollo; en producción un browser real nunca lo tiene como origin, así que no
// emitimos ACAO para él (filtro defensivo e inocuo — Delta 2026-07-04).
const isServeableOrigin = (origin: string): boolean => !(isProduction() && origin.endsWith('.local'))

const loadOrigins = async (): Promise<Set<string>> => {
  const origins = await listActivePublicFormOrigins()

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
      captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_public_cors_resolver' } })

      // stale-on-error: preservar el last-known-good si existe; frío → unión vacía (fail-closed).
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

  // Cache tibio pero expirado → stale-while-revalidate: se sirve el stale AHORA y se
  // refresca en background (el hot path nunca bloquea en la DB tras el primer warm).
  if (cache) {
    void refresh()

    return cache.origins
  }

  // Frío (nunca poblado) → una lectura para calentar. Si la DB falla, unión vacía.
  return refresh()
}

export const publicFormsCorsHeaders = async (request: Request, methods: string): Promise<HeadersInit> => {
  const origin = request.headers.get('origin')

  const headers: Record<string, string> = {
    Vary: 'Origin',
  }

  if (origin) {
    const allowed = await resolveAllowedOrigins()

    if (allowed.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Methods'] = methods
      headers['Access-Control-Allow-Headers'] = 'content-type, accept, idempotency-key'
      headers['Access-Control-Max-Age'] = '86400'
    }
  }

  return headers
}

export const publicFormsOptionsResponse = async (request: Request, methods: string): Promise<NextResponse> =>
  new NextResponse(null, {
    status: 204,
    headers: await publicFormsCorsHeaders(request, methods),
  })

/**
 * Test-only: limpia el cache in-memory del resolver entre casos. NO usar en runtime.
 */
export const resetPublicFormsCorsCacheForTests = (): void => {
  cache = null
  inflight = null
}
