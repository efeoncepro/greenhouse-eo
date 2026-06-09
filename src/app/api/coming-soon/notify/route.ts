import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  LaunchNotifyRateLimitError,
  enforceLaunchNotifyRateLimit,
  hashRequestIp,
  isValidLaunchNotifyEmail,
  normalizeLaunchNotifyEmail,
  subscribeLaunchNotification,
  type LaunchNotifySource
} from '@/lib/coming-soon/subscribe'

export const dynamic = 'force-dynamic'

interface NotifyBody {
  email?: unknown
  locale?: unknown
}

const resolveClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip')?.trim() ||
  null

/**
 * Coming Soon launch-notify capture. Public + internal (route /coming-soon).
 *
 * - Authenticated: `email` is OPTIONAL — when omitted we subscribe the session
 *   email (one-click "Notify me"); when provided it's an override (the user
 *   wants a different notification email) and we still link `user_id`.
 * - Anonymous: `email` is REQUIRED.
 *
 * Responses use the canonical contract; the client maps `code` → localized
 * toast (the bilingual copy lives in the dictionary, not the API prose).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    const sessionEmail = session?.user?.email ?? null
    const userId = session?.user?.id ?? null

    let body: NotifyBody = {}

    try {
      body = (await request.json()) as NotifyBody
    } catch {
      body = {}
    }

    const providedEmail = typeof body.email === 'string' ? body.email.trim() : ''
    const locale = typeof body.locale === 'string' && body.locale.trim() ? body.locale.trim() : 'es-CL'

    // Effective notification target: explicit override > session email.
    const rawEmail = providedEmail || sessionEmail || ''

    if (!rawEmail) {
      // Anonymous with no email → must provide one.
      return canonicalErrorResponse('invalid_email')
    }

    const email = normalizeLaunchNotifyEmail(rawEmail)

    if (!isValidLaunchNotifyEmail(email)) {
      return canonicalErrorResponse('invalid_email')
    }

    const source: LaunchNotifySource = userId ? 'internal' : 'public'
    const requestIpHash = hashRequestIp(resolveClientIp(request))

    await enforceLaunchNotifyRateLimit(requestIpHash)

    const result = await subscribeLaunchNotification({
      email,
      locale,
      source,
      userId,
      requestIp: resolveClientIp(request)
    })

    return NextResponse.json({ ok: true, status: result.status }, { status: 200 })
  } catch (error) {
    if (error instanceof LaunchNotifyRateLimitError) {
      return canonicalErrorResponse('rate_limited', {
        extra: { retryAfterSeconds: error.retryAfterSeconds }
      })
    }

    captureWithDomain(error, 'home', { tags: { source: 'coming_soon_notify' } })

    return canonicalErrorResponse('internal_error')
  }
}
