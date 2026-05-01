import { NextResponse, type NextRequest } from 'next/server'

import { consumeMagicLink } from '@/lib/auth/magic-link'
import { signAgentSessionInProcess } from '@/lib/auth/sign-agent-session-in-process'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const buildErrorRedirect = (origin: string, code: 'invalid' | 'expired' | 'already_used' | 'pg_failure') =>
  NextResponse.redirect(`${origin}/login?error=magic_link_${code}`, { status: 303 })

const resolveClientIp = (request: NextRequest): string | null => {
  const xff = request.headers.get('x-forwarded-for')

  if (xff) {
    const first = xff.split(',')[0]?.trim()

    if (first) return first
  }

  return request.headers.get('x-real-ip')
}

/**
 * TASK-742 Capa 5 — Consume a magic-link and mint a NextAuth session cookie.
 *
 * Flow:
 *   GET /api/auth/magic-link/consume?tokenId=...&token=...
 *   1. Validate token via consumeMagicLink (PG single-use + TTL check)
 *   2. Mint NextAuth session JWT using signAgentSessionInProcess
 *   3. Set the cookie and redirect to portalHomePath
 *
 * On any failure: redirect to /login?error=magic_link_<reason> so the user
 * gets actionable feedback without leaking enumeration data.
 */
export const GET = async (request: NextRequest) => {
  const url = new URL(request.url)
  const tokenId = url.searchParams.get('tokenId') || ''
  const rawToken = url.searchParams.get('token') || ''
  const origin = url.origin

  try {
    const ip = resolveClientIp(request)
    const result = await consumeMagicLink({ tokenId, rawToken, ip })

    if (!result.ok || !result.tenant) {
      return buildErrorRedirect(origin, result.reason ?? 'invalid')
    }

    // Mint a NextAuth session cookie reusing the existing in-process minter.
    const signed = await signAgentSessionInProcess(result.tenant.email)

    if (!signed) {
      captureWithDomain(new Error('magic-link succeeded but session minting failed'), 'identity', {
        extra: { source: 'api.auth.magic-link.consume', userId: result.tenant.userId }
      })

      return buildErrorRedirect(origin, 'pg_failure')
    }

    const portalHomePath = signed.portalHomePath || '/auth/landing'
    const response = NextResponse.redirect(`${origin}${portalHomePath}`, { status: 303 })
    const isSecure = origin.startsWith('https://')

    response.cookies.set({
      name: signed.cookieName,
      value: signed.cookieValue,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      // 8 hours — same as default NextAuth session window for credentials
      maxAge: 60 * 60 * 8
    })

    return response
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { source: 'api.auth.magic-link.consume' }
    })

    return buildErrorRedirect(origin, 'invalid')
  }
}
