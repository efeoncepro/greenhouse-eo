import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import {
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_MAX_AGE_SECONDS,
  MAINTENANCE_BYPASS_QUERY,
  MAINTENANCE_PATH,
  MAINTENANCE_RETRY_AFTER_SECONDS,
  getMaintenanceBypassSecret,
  isMaintenanceAllowedPath,
  isMaintenanceModeEnabled,
  maintenanceBypassMatches
} from '@/config/maintenance'

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'X-DNS-Prefetch-Control': 'on'
} as const

function buildContentSecurityPolicyReportOnly() {
  const frameSources = ["'self'", 'https://login.microsoftonline.com', 'https://accounts.google.com', 'https://vercel.live']

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self' https://login.microsoftonline.com https://accounts.google.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    `frame-src ${frameSources.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' data: blob: https:"
  ].join('; ')
}

const PUBLIC_ASSESSMENT_SESSION_PATHS = new Set([
  '/public/assessment/access',
  '/public/assessment/session',
  '/api/public/assessment/access/exchange',
  '/api/public/assessment/session',
])

const isPublicAssessmentSessionPath = (pathname: string) => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  return PUBLIC_ASSESSMENT_SESSION_PATHS.has(normalized)
}

const buildPublicAssessmentContentSecurityPolicy = (nonce: string) => [
  "default-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'nonce-${nonce}'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "media-src 'none'",
].join('; ')

function applyCrossCuttingHeaders(response: NextResponse): NextResponse {
  for (const [headerName, headerValue] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(headerName, headerValue)
  }

  response.headers.set('Content-Security-Policy-Report-Only', buildContentSecurityPolicyReportOnly())

  if (process.env.VERCEL_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return response
}

function applyPublicAssessmentHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.delete('Content-Security-Policy-Report-Only')
  response.headers.set('Content-Security-Policy', buildPublicAssessmentContentSecurityPolicy(nonce))
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')

  return response
}

function resolveMaintenanceResponse(request: NextRequest, forwardedHeaders?: Headers): NextResponse | null {
  try {
    if (!isMaintenanceModeEnabled()) return null

    const { pathname, searchParams } = request.nextUrl

    // The access fragment must be scrubbed by its bootstrap before any generic rewrite.
    // Keep this bypass scoped to the four assessment session surfaces only.
    if (isPublicAssessmentSessionPath(pathname)) return null

    if (isMaintenanceAllowedPath(pathname)) return null

    const secret = getMaintenanceBypassSecret()

    if (secret) {
      if (maintenanceBypassMatches(searchParams.get(MAINTENANCE_BYPASS_QUERY), secret)) {
        const granted = NextResponse.next(forwardedHeaders ? { request: { headers: forwardedHeaders } } : undefined)

        granted.cookies.set(MAINTENANCE_BYPASS_COOKIE, secret, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: MAINTENANCE_BYPASS_MAX_AGE_SECONDS
        })

        return granted
      }

      if (maintenanceBypassMatches(request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value, secret)) {
        return null
      }
    }

    const rewriteUrl = request.nextUrl.clone()

    rewriteUrl.pathname = MAINTENANCE_PATH
    rewriteUrl.search = ''

    const response = NextResponse.rewrite(rewriteUrl, { status: 503 })

    response.headers.set('Retry-After', String(MAINTENANCE_RETRY_AFTER_SECONDS))
    response.headers.set('Cache-Control', 'no-store')

    return response
  } catch {
    return null
  }
}

export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname
  const isApiRequest = pathname.startsWith('/api')
  const isPageOptionsRequest = request.method === 'OPTIONS' && !isApiRequest
  const isAssessmentSessionPath = isPublicAssessmentSessionPath(pathname)
  const assessmentNonce = isAssessmentSessionPath ? crypto.randomUUID().replaceAll('-', '') : ''
  const forwardedHeaders = new Headers(request.headers)

  if (assessmentNonce) {
    forwardedHeaders.set('x-assessment-csp-nonce', assessmentNonce)
    forwardedHeaders.set('Content-Security-Policy', buildPublicAssessmentContentSecurityPolicy(assessmentNonce))
  }

  const response = isPageOptionsRequest
    ? new NextResponse(null, { status: 204 })
    : resolveMaintenanceResponse(request, forwardedHeaders) ?? NextResponse.next({ request: { headers: forwardedHeaders } })

  const secured = applyCrossCuttingHeaders(response)

  return isAssessmentSessionPath && response.status !== 503
    ? applyPublicAssessmentHeaders(secured, assessmentNonce)
    : secured
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)']
}
