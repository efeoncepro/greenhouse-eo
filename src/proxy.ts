import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isApiRequest = pathname.startsWith('/api')
  const isPageOptionsRequest = request.method === 'OPTIONS' && !isApiRequest

  const response = isPageOptionsRequest
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next()

  for (const [headerName, headerValue] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(headerName, headerValue)
  }

  response.headers.set('Content-Security-Policy-Report-Only', buildContentSecurityPolicyReportOnly())

  if (process.env.VERCEL_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)']
}
