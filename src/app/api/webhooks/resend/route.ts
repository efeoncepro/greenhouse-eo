import { createHmac, timingSafeEqual } from 'crypto'

import { NextResponse } from 'next/server'

import { removeSubscriber } from '@/lib/email/subscriptions'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const dynamic = 'force-dynamic'

// ── Helpers ──

const getWebhookSecret = (): string | null => {
  const secret = process.env.RESEND_WEBHOOK_SIGNING_SECRET?.trim()

  return secret || null
}

/**
 * Verify Svix-compatible HMAC-SHA256 signature.
 *
 * - Resend/Svix secrets have a `whsec_` prefix followed by a base64-encoded key.
 * - The signed content is `${svixId}.${svixTimestamp}.${body}`.
 * - The signature header may contain multiple space-separated versioned signatures
 *   (e.g. `v1,<sig1> v1,<sig2>`); any match is accepted.
 */
const verifySignature = (payload: string, signatureHeader: string, rawSecret: string): boolean => {
  try {
    // Strip `whsec_` prefix and base64-decode to get raw key bytes
    const secretBytes = Buffer.from(
      rawSecret.startsWith('whsec_') ? rawSecret.slice(6) : rawSecret,
      'base64'
    )

    const expected = createHmac('sha256', secretBytes)
      .update(payload)
      .digest('base64')

    // Signature header: "v1,<sig1> v1,<sig2> ..." — check any match
    const signatures = signatureHeader.split(' ')

    for (const versionedSig of signatures) {
      const [, sig] = versionedSig.split(',')

      if (!sig) continue

      const sigBuffer = Buffer.from(sig, 'base64')
      const expectedBuffer = Buffer.from(expected, 'base64')

      if (sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

// ── Types ──

interface ResendWebhookEvent {
  type: string
  data: {
    email_id?: string
    from?: string
    to?: string[]
    subject?: string
    created_at?: string

    // Bounce-specific
    bounce?: {
      message?: string
      type?: string // 'hard' | 'soft'
    }

    // Complaint-specific
    complaint?: {
      message?: string
    }
  }
}

// ── Handler ──

export async function POST(request: Request) {
  const secret = getWebhookSecret()

  if (!secret) {
    // Webhook not configured — return 200 to avoid Resend retries
    return NextResponse.json({ ignored: true, reason: 'Webhook secret not configured.' })
  }

  const rawBody = await request.text()

  // Verify Svix signature — signs `${svixId}.${svixTimestamp}.${body}`
  const svixSignature = request.headers.get('svix-signature') || ''
  const svixId = request.headers.get('svix-id') || ''
  const svixTimestamp = request.headers.get('svix-timestamp') || ''

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`

  if (!verifySignature(signedContent, svixSignature, secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let event: ResendWebhookEvent

  try {
    event = JSON.parse(rawBody) as ResendWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const recipientEmail = event.data?.to?.[0]?.trim().toLowerCase()
  const resendId = event.data?.email_id

  if (!recipientEmail) {
    return NextResponse.json({ processed: false, reason: 'No recipient email.' })
  }

  try {
    switch (event.type) {
      case 'email.bounced': {
        const bounceType = event.data.bounce?.type || 'unknown'
        const reason = event.data.bounce?.message || 'Bounce received'

        if (bounceType === 'hard') {
          // Mark recipient as undeliverable in client_users
          await runGreenhousePostgresQuery(
            `UPDATE greenhouse_core.client_users
             SET email_undeliverable = TRUE, updated_at = NOW()
             WHERE LOWER(email) = $1`,
            [recipientEmail]
          )

          await publishOutboxEvent({
            aggregateType: AGGREGATE_TYPES.emailDelivery,
            aggregateId: resendId || recipientEmail,
            eventType: EVENT_TYPES.emailDeliveryUndeliverableMarked,
            payload: { recipientEmail, userId: null, reason: `Hard bounce: ${reason}` }
          })
        }

        await publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.emailDelivery,
          aggregateId: resendId || recipientEmail,
          eventType: EVENT_TYPES.emailDeliveryBounced,
          payload: { recipientEmail, resendId, bounceType, reason }
        })

        break
      }

      case 'email.complained': {
        const reason = event.data.complaint?.message || 'Complaint received'

        // Look up the email type from the delivery record to auto-unsubscribe
        if (resendId) {
          const rows = await runGreenhousePostgresQuery<{ email_type: string } & Record<string, unknown>>(
            `SELECT email_type FROM greenhouse_notifications.email_deliveries
             WHERE resend_id = $1 LIMIT 1`,
            [resendId]
          )

          const emailType = rows[0]?.email_type

          if (emailType) {
            await removeSubscriber({ emailType, recipientEmail })
          }
        }

        await publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.emailDelivery,
          aggregateId: resendId || recipientEmail,
          eventType: EVENT_TYPES.emailDeliveryComplained,
          payload: { recipientEmail, resendId, reason }
        })

        break
      }

      case 'email.delivered': {
        // Update delivery status to 'delivered' if we have the resend_id
        if (resendId) {
          await runGreenhousePostgresQuery(
            `UPDATE greenhouse_notifications.email_deliveries
             SET status = 'delivered', updated_at = NOW()
             WHERE resend_id = $1 AND status = 'sent'`,
            [resendId]
          )
        }

        break
      }

      default:
        // Unhandled event type — acknowledge but don't process
        break
    }
  } catch (error) {
    console.error('[webhooks/resend] Error processing event:', event.type, error)

    // Return 200 to prevent Resend from retrying — log the error for investigation
    return NextResponse.json({ processed: false, error: 'Processing failed.' })
  }

  return NextResponse.json({ processed: true, type: event.type })
}
