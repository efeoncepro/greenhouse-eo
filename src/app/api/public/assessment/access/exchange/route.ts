import { NextResponse } from 'next/server'

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
  { status, headers: publicAssessmentResponseHeaders },
)

export async function POST(request: Request) {
  if (!hasExactSameOrigin(request)) return unavailable(403)

  const body = await readBoundedJsonObject(request)

  if (!body || !hasOnlyKeys(body, ['access']) || typeof body.access !== 'string') return unavailable(400)

  const exchanged = await exchangePublicAssessmentAccess(body.access).catch(() => null)

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
