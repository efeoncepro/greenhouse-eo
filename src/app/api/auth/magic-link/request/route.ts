import { NextResponse, type NextRequest } from 'next/server'

import { requestMagicLink } from '@/lib/auth/magic-link'
import { sendEmail } from '@/lib/email/delivery'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ANTI_ENUMERATION_RESPONSE = NextResponse.json(
  {
    ok: true,
    message:
      'Si el correo está registrado, recibirás un enlace de acceso por email en los próximos minutos. Revisa también tu carpeta de Spam.'
  },
  { status: 200 }
)

const isHttpsUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)

    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const buildMagicLinkUrl = (tokenId: string, rawToken: string): string => {
  const portalUrl = (process.env.NEXTAUTH_URL || 'https://greenhouse.efeoncepro.com').replace(/\/$/u, '')
  const url = new URL('/auth/magic-link/consume', portalUrl)

  url.searchParams.set('tokenId', tokenId)
  url.searchParams.set('token', rawToken)

  return url.toString()
}

const resolveClientIp = (request: NextRequest): string | null => {
  const xff = request.headers.get('x-forwarded-for')

  if (xff) {
    const first = xff.split(',')[0]?.trim()

    if (first) return first
  }

  return request.headers.get('x-real-ip')
}

/**
 * TASK-742 Capa 5 — Request a magic-link login email.
 *
 * Anti-enumeration: ALWAYS returns 200 with a generic message. The actual
 * existence of the user, rate-limit status, and account state are observable
 * only through `auth_attempts` (server-side), not the client response.
 */
export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null
    const email = (body?.email ?? '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return ANTI_ENUMERATION_RESPONSE
    }

    const ip = resolveClientIp(request)
    const result = await requestMagicLink({ email, ip })

    if (!result.ok || !result.rawToken || !result.tokenId) {
      // Always return the same shape to prevent enumeration
      return ANTI_ENUMERATION_RESPONSE
    }

    const magicLinkUrl = buildMagicLinkUrl(result.tokenId, result.rawToken)

    if (!isHttpsUrl(magicLinkUrl)) {
      captureWithDomain(new Error(`magic-link URL is not HTTPS: ${magicLinkUrl}`), 'identity', {
        extra: { source: 'api.auth.magic-link.request' }
      })

      return ANTI_ENUMERATION_RESPONSE
    }

    await sendEmail({
      emailType: 'magic_link',
      domain: 'identity',
      recipients: [{ email }],
      context: {
        magicLinkUrl,
        expiresInMinutes: 15,
        locale: 'es' as const
      }
    }).catch(error => {
      captureWithDomain(error, 'identity', {
        extra: { source: 'api.auth.magic-link.request', stage: 'send_email' }
      })
    })

    return ANTI_ENUMERATION_RESPONSE
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { source: 'api.auth.magic-link.request' }
    })

    // Anti-enumeration even on error
    return ANTI_ENUMERATION_RESPONSE
  }
}
