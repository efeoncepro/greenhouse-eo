import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
import { registrationsCountRateLimiter } from '@/lib/growth/forms/public-read-rate-limit'
import { countAcceptedRegistrations, REGISTRATIONS_COUNT_CACHE_TTL_MS } from '@/lib/growth/forms/readers'
import { readVisitorMeasurementRequest } from '@/lib/growth/measurement/visitor-request'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-2053 — `GET /api/public/growth/forms/{formSlug}/registrations-count`.
 *
 * Conteo público y agregado de reservas confirmadas de un formulario de evento («310 personas ya
 * reservaron su lugar»). Respuesta: `{ count, display, shown }`; `count` y `display` van redondeados
 * a la decena y sólo cuando `shown=true` (umbral del evento alcanzado y `showRegistrationsCount`
 * activo). Nunca PII ni identificadores. SIN sesión, CORS de los orígenes gobernados, caché de 10 min
 * (reader en memoria + navegador) y rate limit por IP. `formSlug` acepta slug o form_key. Gateado por
 * `GROWTH_FORMS_PUBLIC_API_ENABLED` igual que el resto de la API pública.
 */
export const dynamic = 'force-dynamic'

const METHODS = 'GET, OPTIONS'
const FORM_REF_RE = /^[A-Za-z0-9-]{1,200}$/
const CACHE_CONTROL = `public, max-age=${REGISTRATIONS_COUNT_CACHE_TTL_MS / 1000}`

const withHeaders = (response: NextResponse, headers: HeadersInit): NextResponse => {
  for (const [key, value] of new Headers(headers).entries()) response.headers.set(key, value)

  return response
}

const errorResponse = (code: CanonicalErrorCode, headers: HeadersInit, extraHeaders: Record<string, string> = {}) =>
  withHeaders(canonicalErrorResponse(code), { ...Object.fromEntries(new Headers(headers).entries()), 'Cache-Control': 'no-store', ...extraHeaders })

export function OPTIONS(request: Request) {
  return publicFormsOptionsResponse(request, METHODS)
}

export async function GET(request: Request, { params }: { params: Promise<{ formSlug: string }> }) {
  const headers = await publicFormsCorsHeaders(request, METHODS)

  if (!isFormsPublicApiEnabled()) return errorResponse('growth_form_not_found', headers)

  const { formSlug } = await params

  if (!FORM_REF_RE.test(formSlug)) return errorResponse('growth_form_not_found', headers)

  const { ip } = readVisitorMeasurementRequest(request.headers)
  const limit = registrationsCountRateLimiter.check(ip)

  if (!limit.allowed) {
    console.info('growth_forms_registrations_count_rate_limited', { formSlug })

    return errorResponse('rate_limited', headers, { 'Retry-After': String(limit.retryAfterSeconds) })
  }

  try {
    const count = await countAcceptedRegistrations(formSlug)

    if (!count) return errorResponse('growth_form_not_found', headers)

    return withHeaders(NextResponse.json(count, { status: 200 }), {
      ...Object.fromEntries(new Headers(headers).entries()),
      'Cache-Control': CACHE_CONTROL
    })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_registrations_count_route' } })

    return errorResponse('internal_error', headers)
  }
}
