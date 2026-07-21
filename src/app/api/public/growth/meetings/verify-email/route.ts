import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { allowVerifyRequest } from '@/lib/growth/forms/email-verification/rate-limit'
import { verifyMeetingEmail } from '@/lib/growth/meetings/email-verification'
import { isNativeMeetingSchedulerReadEnabled } from '@/lib/growth/meetings/flags'
import { getMeetingSurfaceAuthority } from '@/lib/growth/meetings/store'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

const METHODS = 'POST, OPTIONS'
const MAX_BODY_BYTES = 2 * 1024

const clientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export const OPTIONS = (request: Request) => publicFormsOptionsResponse(request, METHODS)

export async function POST(request: Request) {
  const headers = await publicFormsCorsHeaders(request, METHODS)

  if (!isNativeMeetingSchedulerReadEnabled()) {
    return NextResponse.json({ outcome: 'unavailable' }, { status: 404, headers })
  }

  if (!allowVerifyRequest(clientIp(request))) {
    return NextResponse.json({ outcome: 'rate_limited' }, { status: 429, headers })
  }

  try {
    const bodyText = await request.text()

    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ outcome: 'invalid' }, { status: 413, headers })
    }

    const body = JSON.parse(bodyText) as Record<string, unknown>
    const surfaceId = typeof body.surfaceId === 'string' ? body.surfaceId : ''
    const schedulerKey = typeof body.schedulerKey === 'string' ? body.schedulerKey : ''
    const email = typeof body.email === 'string' ? body.email : ''
    const surface = await getMeetingSurfaceAuthority(surfaceId, schedulerKey)
    const origin = request.headers.get('origin')

    if (!surface || !origin || !surface.origins.includes(origin)) {
      return NextResponse.json({ outcome: 'unavailable' }, { status: 404, headers })
    }

    const verdict = await verifyMeetingEmail(email)

    return NextResponse.json({ outcome: 'ok', ...verdict }, { status: 200, headers })
  } catch (caught) {
    if (caught instanceof SyntaxError) {
      return NextResponse.json({ outcome: 'invalid' }, { status: 400, headers })
    }

    captureWithDomain(caught, 'growth', { tags: { source: 'growth_meeting_verify_email_route' } })

    return NextResponse.json({ outcome: 'error' }, { status: 502, headers })
  }
}
