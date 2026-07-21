import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { bookMeeting } from '@/lib/growth/meetings/command'
import { isNativeMeetingSchedulerEnabled } from '@/lib/growth/meetings/flags'
import { IdempotencyKeyError, requireIdempotencyKey } from '@/lib/idempotency/idempotency-key'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

const METHODS = 'POST, OPTIONS'
const MAX_BODY_BYTES = 16 * 1024

const statusByCode = {
  unavailable: 404,
  slot_unavailable: 409,
  validation_failed: 400,
  captcha_failed: 403,
  rate_limited: 429,
  booking_rejected: 422,
  provider_degraded: 503,
} as const

const clientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export const OPTIONS = (request: Request) => publicFormsOptionsResponse(request, METHODS)

export async function POST(request: Request) {
  const headers = await publicFormsCorsHeaders(request, METHODS)

  if (!isNativeMeetingSchedulerEnabled()) {
    return NextResponse.json({ outcome: 'error', error: { code: 'unavailable' } }, { status: 404, headers })
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)

  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ outcome: 'error', error: { code: 'validation_failed' } }, { status: 413, headers })
  }

  try {
    const idempotencyKey = requireIdempotencyKey(request)
    const bodyText = await request.text()

    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ outcome: 'error', error: { code: 'validation_failed' } }, { status: 413, headers })
    }

    const body = JSON.parse(bodyText) as Record<string, unknown>

    if (body.idempotencyKey !== undefined && body.idempotencyKey !== idempotencyKey) {
      return NextResponse.json({ outcome: 'error', error: { code: 'validation_failed' } }, { status: 400, headers })
    }

    const result = await bookMeeting(
      { ...body, idempotencyKey },
      {
        origin: request.headers.get('origin'),
        ip: clientIp(request),
      },
    )

    const status = result.outcome === 'confirmed' ? 201 : statusByCode[result.error.code]

    return NextResponse.json(result, { status, headers })
  } catch (caught) {
    if (caught instanceof IdempotencyKeyError || caught instanceof SyntaxError) {
      return NextResponse.json({ outcome: 'error', error: { code: 'validation_failed' } }, { status: 400, headers })
    }

    captureWithDomain(caught, 'growth', { tags: { source: 'growth_meeting_booking_route' } })

    return NextResponse.json(
      { outcome: 'error', error: { code: 'provider_degraded', recovery: 'check_email', retryable: false } },
      { status: 503, headers },
    )
  }
}
