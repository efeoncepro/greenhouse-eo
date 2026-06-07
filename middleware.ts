import { NextResponse, type NextRequest } from 'next/server'

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

/**
 * Greenhouse edge middleware.
 *
 * Single responsibility today: the planned-maintenance gate (src/config/maintenance.ts).
 * Default OFF — when `MAINTENANCE_MODE` ≠ 'true' this is a pure pass-through, so
 * merging it changes nothing in production until an operator flips the env.
 *
 * Fail-open by contract: any unexpected error degrades to `NextResponse.next()`.
 * A bug in the gate must never take the portal down — the only acceptable failure
 * mode is "maintenance didn't engage", never "the whole site 500s".
 */
export function middleware(req: NextRequest): NextResponse {
  try {
    if (!isMaintenanceModeEnabled()) return NextResponse.next()

    const { pathname, searchParams } = req.nextUrl

    // Never gate the maintenance page, framework internals, auth/health, or assets.
    if (isMaintenanceAllowedPath(pathname)) return NextResponse.next()

    // Operator bypass: `?gh_bypass=<secret>` grants an httpOnly cookie for the
    // session; a matching cookie keeps access on subsequent requests.
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

      if (maintenanceBypassMatches(req.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value, secret)) {
        return NextResponse.next()
      }
    }

    // Everyone else: serve the maintenance page in place with an honest 503 so
    // monitors/bots treat it as a temporary outage (keeps the original URL).
    const rewriteUrl = req.nextUrl.clone()

    rewriteUrl.pathname = MAINTENANCE_PATH
    rewriteUrl.search = ''

    const response = NextResponse.rewrite(rewriteUrl, { status: 503 })

    response.headers.set('Retry-After', String(MAINTENANCE_RETRY_AFTER_SECONDS))
    response.headers.set('Cache-Control', 'no-store')

    return response
  } catch {
    // Fail-open: never let a gate bug break the portal.
    return NextResponse.next()
  }
}

/**
 * Matcher excludes framework chunks, the image optimizer, the favicon, and any
 * path with a file extension (static assets) — those are never gated. Dot-less
 * routes (pages + API) pass through the middleware, where the maintenance gate +
 * allowlist decide. With maintenance OFF every match is an immediate pass-through.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
}
