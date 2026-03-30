import { NextResponse } from 'next/server'

import { dispatchNotificationWebhook } from '@/lib/webhooks/consumers/notification-dispatch'
import { resolveSecret, verifySignature } from '@/lib/webhooks/signing'
import type { WebhookEnvelope } from '@/lib/webhooks/types'

export const dynamic = 'force-dynamic'

const NOTIFICATIONS_SECRET_REF = 'WEBHOOK_NOTIFICATIONS_SECRET'

const parseEnvelope = (body: string): WebhookEnvelope | null => {
  try {
    const parsed = JSON.parse(body) as Partial<WebhookEnvelope>

    if (
      typeof parsed.eventId !== 'string' ||
      typeof parsed.eventType !== 'string' ||
      typeof parsed.aggregateType !== 'string' ||
      typeof parsed.aggregateId !== 'string' ||
      typeof parsed.occurredAt !== 'string' ||
      typeof parsed.version !== 'number' ||
      typeof parsed.source !== 'string' ||
      typeof parsed.data !== 'object' ||
      parsed.data === null ||
      Array.isArray(parsed.data)
    ) {
      return null
    }

    return parsed as WebhookEnvelope
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const timestamp = request.headers.get('x-greenhouse-timestamp') ?? ''
  const signature = request.headers.get('x-greenhouse-signature') ?? ''
  const eventType = request.headers.get('x-greenhouse-event-type') ?? 'unknown'

  const secret = await resolveSecret(NOTIFICATIONS_SECRET_REF)

  if (secret && !signature) {
    console.warn(`[webhook-notifications] missing signature for event=${eventType}`)

    return NextResponse.json({ received: false, reason: 'missing_signature' }, { status: 401 })
  }

  if (secret && signature) {
    const valid = verifySignature(secret, timestamp, body, signature)

    if (!valid) {
      console.warn(`[webhook-notifications] signature mismatch for event=${eventType}`)

      return NextResponse.json({ received: false, reason: 'invalid_signature' }, { status: 401 })
    }
  }

  const envelope = parseEnvelope(body)

  if (!envelope) {
    return NextResponse.json({ received: false, reason: 'invalid_envelope' }, { status: 500 })
  }

  const result = await dispatchNotificationWebhook(envelope)

  return NextResponse.json({
    received: true,
    eventType: result.eventType,
    mapped: result.mapped,
    recipientsResolved: result.recipientsResolved,
    unresolvedRecipients: result.unresolvedRecipients,
    deduped: result.deduped,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed
  })
}
