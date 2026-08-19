import { createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { processResendWebhookEvent } from '@/lib/email/resend-webhook'
import { resolveResendWebhookSigningSecret } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

/**
 * Verify Resend's Svix-compatible HMAC without constructing the outbound
 * Resend client. This keeps the inbound observer independent from email send.
 */
export const verifyResendWebhookSignature = (input: {
  body: string
  eventId: string
  timestamp: string
  signature: string
  secret: string
  now?: Date
}) => {
  try {
    const signedAtSeconds = Number(input.timestamp)
    const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)

    if (
      !input.eventId ||
      !input.signature ||
      !Number.isFinite(signedAtSeconds) ||
      Math.abs(nowSeconds - signedAtSeconds) > SIGNATURE_TOLERANCE_SECONDS
    ) {
      return false
    }

    const secretBytes = Buffer.from(
      input.secret.startsWith('whsec_') ? input.secret.slice(6) : input.secret,
      'base64'
    )

    const expected = createHmac('sha256', secretBytes)
      .update(`${input.eventId}.${input.timestamp}.${input.body}`)
      .digest()

    return input.signature.split(' ').some(versionedSignature => {
      const [version, encodedSignature] = versionedSignature.split(',')

      if (version !== 'v1' || !encodedSignature) return false

      const actual = Buffer.from(encodedSignature, 'base64')

      return actual.length === expected.length && timingSafeEqual(actual, expected)
    })
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  let secret: string | null

  try {
    secret = await resolveResendWebhookSigningSecret()
  } catch (error) {
    console.error(
      '[webhooks/resend] Unable to resolve signing secret.',
      error instanceof Error ? error.name : 'unknown_error'
    )

    return NextResponse.json({ error: 'Webhook verification unavailable.' }, { status: 503 })
  }

  if (!secret) {
    return NextResponse.json({ error: 'Webhook verification unavailable.' }, { status: 503 })
  }

  const rawBody = await request.text()
  const eventId = request.headers.get('svix-id')?.trim() ?? ''
  const timestamp = request.headers.get('svix-timestamp')?.trim() ?? ''
  const signature = request.headers.get('svix-signature')?.trim() ?? ''

  if (
    !verifyResendWebhookSignature({
      body: rawBody,
      eventId,
      timestamp,
      signature,
      secret
    })
  ) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let payload: unknown

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  try {
    const result = await processResendWebhookEvent({ providerEventId: eventId, payload })

    if (result.outcome === 'retry') {
      return NextResponse.json(
        { processed: false, retryable: true, reason: result.reason },
        { status: 503 }
      )
    }

    return NextResponse.json({
      processed: result.outcome === 'processed',
      deduplicated: result.outcome === 'deduplicated',
      ignored: result.outcome === 'ignored',
      type: result.eventType
    })
  } catch (error) {
    const errorName = error instanceof Error ? error.message : 'unknown_error'

    if (errorName.startsWith('invalid_resend_webhook_')) {
      return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
    }

    console.error('[webhooks/resend] Processing failed.', error instanceof Error ? error.name : 'unknown_error')

    return NextResponse.json({ error: 'Webhook processing unavailable.' }, { status: 503 })
  }
}
