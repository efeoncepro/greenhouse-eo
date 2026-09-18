import 'server-only'

/**
 * TASK-1848 — contrato HTTP del reader público por token. Deliberadamente DISTINTO del Grader
 * (`Cache-Control: public, max-age=300`): un grant se revoca, así que cada respuesta es
 * `private, no-store` y se resuelve en cada request. No "unificar" ambos headers.
 */

import type { InsightShareClientHint } from './store'
import type { SharedInsightDenial } from './public'

export const INSIGHT_SHARE_PUBLIC_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
} as const

const DENIAL_STATUS: Record<SharedInsightDenial, number> = { not_found: 404, gone: 410, rate_limited: 429 }

/** Mensajes neutros: jamás nombran cliente, reporte ni motivo interno (anti-oracle). */
const DENIAL_MESSAGE: Record<SharedInsightDenial, string> = {
  not_found: 'Este enlace no existe o ya no está disponible.',
  gone: 'Este enlace fue desactivado.',
  rate_limited: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.'
}

export const sharedInsightDenialResponse = (denial: SharedInsightDenial): Response =>
  Response.json(
    { error: DENIAL_MESSAGE[denial], code: denial },
    {
      status: DENIAL_STATUS[denial],
      headers: { ...INSIGHT_SHARE_PUBLIC_HEADERS, ...(denial === 'rate_limited' ? { 'Retry-After': '60' } : {}) }
    }
  )

export const readInsightShareClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || null

const ROBOT_UA = /bot|crawler|spider|slurp|preview|facebookexternalhit|linkedin|whatsapp|slack|discord|telegram|skype|googleimageproxy|safelinks|proofpoint|mimecast|barracuda/i

/**
 * Pista de robot/prefetch para el access log. Un hit NUNCA prueba lectura humana; esta pista sólo
 * permite no contar escáneres de correo y previsualizadores como visitas.
 */
export const readInsightShareClientHint = (request: Request): InsightShareClientHint => {
  const purpose = `${request.headers.get('sec-purpose') ?? ''} ${request.headers.get('purpose') ?? ''}`.toLowerCase()

  if (purpose.includes('prefetch') || purpose.includes('prerender')) return 'prefetch'
  if (ROBOT_UA.test(request.headers.get('user-agent') ?? '')) return 'robot'

  return 'unknown'
}
