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

function resolveMaintenanceResponse(request: NextRequest): NextResponse | null {
  try {
    if (!isMaintenanceModeEnabled()) return null

    const { pathname, searchParams } = request.nextUrl

    if (isMaintenanceAllowedPath(pathname)) return null

    const secret = getMaintenanceBypassSecret()

    if (secret) {
      if (maintenanceBypassMatches(searchParams.get(MAINTENANCE_BYPASS_QUERY), secret)) {
        const granted = NextResponse.next()

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

  const response = isPageOptionsRequest
    ? new NextResponse(null, { status: 204 })
    : resolveMaintenanceResponse(request) ?? NextResponse.next()

  return applyCrossCuttingHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)']
}
