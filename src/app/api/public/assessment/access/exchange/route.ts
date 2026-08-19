import { NextResponse } from 'next/server'

import {
  claimPublicAssessmentIpCeiling,
  PublicAssessmentRequestRateLimitError,
} from '@/lib/hiring/assessment/public-session/abuse-guard'
import {
  PUBLIC_ASSESSMENT_SESSION_COOKIE,
  hasExactSameOrigin,
  hasOnlyKeys,
  publicAssessmentResponseHeaders,
  readBoundedJsonObject,
} from '@/lib/hiring/assessment/public-session/http'
import { exchangePublicAssessmentAccess } from '@/lib/hiring/assessment/public-session/service'

export const dynamic = 'force-dynamic'

const unavailable = (status = 404) => NextResponse.json(
  { ok: false, code: 'assessment_unavailable', message: 'La evaluación no está disponible.' },
  {
    status,
    headers: status === 429
      ? { ...publicAssessmentResponseHeaders, 'Retry-After': '60' }
      : publicAssessmentResponseHeaders,
  },
)

export async function POST(request: Request) {
  if (!hasExactSameOrigin(request)) return unavailable(403)
  if (!(await claimPublicAssessmentIpCeiling(request, 'exchange'))) return unavailable(429)

  const body = await readBoundedJsonObject(request)

  if (!body || !hasOnlyKeys(body, ['access']) || typeof body.access !== 'string') return unavailable(400)

  let exchanged

  try {
    exchanged = await exchangePublicAssessmentAccess(body.access)
  } catch (error) {
    if (error instanceof PublicAssessmentRequestRateLimitError) return unavailable(429)

    exchanged = null
  }

  if (!exchanged) return unavailable()

  const response = NextResponse.json({ ok: true }, { headers: publicAssessmentResponseHeaders })

  response.cookies.set(PUBLIC_ASSESSMENT_SESSION_COOKIE, exchanged.sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
