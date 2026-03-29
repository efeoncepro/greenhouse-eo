import { NextResponse } from 'next/server'

import { verifySignature, resolveSecret } from '@/lib/webhooks/signing'

export const dynamic = 'force-dynamic'

const CANARY_SECRET_REF = 'WEBHOOK_CANARY_SECRET'

/**
 * Webhook Canary — internal endpoint that receives outbound webhook deliveries
 * and validates the full pipeline: outbox → dispatch → delivery → receipt.
 *
 * Returns 200 on valid delivery, 401 on signature mismatch.
 * Used as the first subscription target to prove E2E flow works.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const timestamp = request.headers.get('x-greenhouse-timestamp') ?? ''
  const signature = request.headers.get('x-greenhouse-signature') ?? ''
  const eventType = request.headers.get('x-greenhouse-event-type') ?? 'unknown'
  const deliveryId = request.headers.get('x-greenhouse-delivery-id') ?? 'unknown'

  const secret = resolveSecret(CANARY_SECRET_REF)

  if (secret && signature) {
    const valid = verifySignature(secret, timestamp, body, signature)

    if (!valid) {
      console.warn(`[webhook-canary] Signature mismatch for delivery ${deliveryId}`)

      return NextResponse.json({ received: false, reason: 'invalid_signature' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown> = {}

  try {
    payload = JSON.parse(body)
  } catch {
    // Accept non-JSON payloads silently
  }

  console.log(
    `[webhook-canary] Received event=${eventType} delivery=${deliveryId} aggregate=${String(payload.aggregateType ?? '?')}:${String(payload.aggregateId ?? '?')}`
  )

  return NextResponse.json({
    received: true,
    eventType,
    deliveryId,
    timestamp: new Date().toISOString()
  })
}
