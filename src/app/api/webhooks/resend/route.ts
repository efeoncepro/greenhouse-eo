import { createHmac, timingSafeEqual } from 'crypto'

import { NextResponse } from 'next/server'

import { getResendWebhookSigningSecret } from '@/lib/resend'
import { removeSubscriber } from '@/lib/email/subscriptions'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const dynamic = 'force-dynamic'

// ── Helpers ──

const getWebhookSecret = (): string | null => {
  const secret = getResendWebhookSigningSecret()

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

    // Click-specific
    click?: {
      link?: string
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

  // TASK-631 Fase 4 — Resend webhook deduplication. Resend retries on failure
  // and may send the same event multiple times. We dedupe via the svix-id
  // header (unique per event delivery attempt) by INSERT ON CONFLICT DO NOTHING
  // into a sentinel marker. If dedup hit, return 200 without re-processing.
  if (svixId) {
    try {
      const dedupRows = await runGreenhousePostgresQuery<{ resend_event_id: string } & Record<string, unknown>>(
        `INSERT INTO greenhouse_notifications.email_engagement (resend_event_id, event_type, resend_id)
         VALUES ($1, 'webhook_dedup', $2)
         ON CONFLICT (resend_event_id) WHERE resend_event_id IS NOT NULL
         DO NOTHING
         RETURNING resend_event_id`,
        [svixId, resendId ?? null]
      )

      if (dedupRows.length === 0) {
        return NextResponse.json({ deduplicated: true, eventId: svixId })
      }
    } catch (error) {
      // If dedup fails (constraint not yet deployed?), log and continue
      console.warn('[webhooks/resend] Dedup check failed, proceeding:', error instanceof Error ? error.message : error)
    }
  }

  try {
    switch (event.type) {
      case 'email.bounced': {
        const bounceType = event.data.bounce?.type || 'unknown'
        const reason = event.data.bounce?.message || 'Bounce received'

        if (resendId) {
          await runGreenhousePostgresQuery(
            `UPDATE greenhouse_notifications.email_deliveries
             SET bounced_at = COALESCE(bounced_at, NOW()),
                 updated_at = NOW()
             WHERE resend_id = $1`,
            [resendId]
          )
        }

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

        if (resendId) {
          await runGreenhousePostgresQuery(
            `UPDATE greenhouse_notifications.email_deliveries
             SET complained_at = COALESCE(complained_at, NOW()),
                 updated_at = NOW()
             WHERE resend_id = $1`,
            [resendId]
          )
        }

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
             SET status = 'delivered',
                 delivered_at = COALESCE(delivered_at, NOW()),
                 updated_at = NOW()
             WHERE resend_id = $1 AND status IN ('sent', 'delivered')`,
            [resendId]
          )
        }

        break
      }

      case 'email.opened': {
        if (resendId) {
          // Look up delivery_id for the FK reference
          const deliveryRows = await runGreenhousePostgresQuery<{ delivery_id: string } & Record<string, unknown>>(
            `SELECT delivery_id FROM greenhouse_notifications.email_deliveries WHERE resend_id = $1 LIMIT 1`,
            [resendId]
          )

          const deliveryId = deliveryRows[0]?.delivery_id ?? null

          await runGreenhousePostgresQuery(
            `INSERT INTO greenhouse_notifications.email_engagement (resend_id, delivery_id, event_type)
             VALUES ($1, $2, 'opened')`,
            [resendId, deliveryId]
          )
        }

        break
      }

      case 'email.clicked': {
        if (resendId) {
          const clickData = (event.data as Record<string, unknown>).click as Record<string, unknown> | undefined
          const linkUrl = typeof clickData?.link === 'string' ? clickData.link : null

          const deliveryRows = await runGreenhousePostgresQuery<{ delivery_id: string } & Record<string, unknown>>(
            `SELECT delivery_id FROM greenhouse_notifications.email_deliveries WHERE resend_id = $1 LIMIT 1`,
            [resendId]
          )

          const deliveryId = deliveryRows[0]?.delivery_id ?? null

          await runGreenhousePostgresQuery(
            `INSERT INTO greenhouse_notifications.email_engagement (resend_id, delivery_id, event_type, link_url)
             VALUES ($1, $2, 'clicked', $3)`,
            [resendId, deliveryId, linkUrl]
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
