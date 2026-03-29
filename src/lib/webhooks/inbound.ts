import 'server-only'

import { createHash } from 'node:crypto'

import type { InboundHandlerFn } from './types'
import { resolveSecret, verifySignature } from './signing'
import { ensureWebhookSchema, getEndpointByKey, insertInboxEvent, updateInboxEventStatus } from './store'

// ── Handler registry ──

const handlerRegistry: Record<string, InboundHandlerFn> = {}

export const registerInboundHandler = (handlerCode: string, handler: InboundHandlerFn) => {
  handlerRegistry[handlerCode] = handler
}

// ── Main orchestration ──

export const processInboundWebhook = async (
  endpointKey: string,
  request: Request
): Promise<{ status: number; body: object }> => {
  await ensureWebhookSchema()

  // 1. Look up endpoint
  const endpoint = await getEndpointByKey(endpointKey)

  if (!endpoint) {
    return { status: 404, body: { error: 'Webhook endpoint not found' } }
  }

  // 2. Read raw body (before JSON parsing for signature verification)
  const rawBody = await request.text()

  // 3. Verify auth/signature
  const signatureVerified = await verifyAuth(endpoint, request, rawBody)

  if (signatureVerified === false) {
    return { status: 401, body: { error: 'Invalid webhook signature' } }
  }

  // 4. Parse payload
  let parsedPayload: unknown = null

  try {
    parsedPayload = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsedPayload = null
  }

  // 5. Compute idempotency key
  const sourceEventId = extractSourceEventId(parsedPayload)

  const idempotencyKey = sourceEventId
    ? computeHash(`${endpointKey}:${sourceEventId}`)
    : computeHash(`${endpointKey}:${rawBody}`)

  // 6. Collect headers
  const headersJson: Record<string, string> = {}

  request.headers.forEach((value, key) => {
    if (!key.startsWith('cookie') && !key.startsWith('authorization')) {
      headersJson[key] = value
    }
  })

  // 7. Insert inbox event (idempotent)
  const { id: inboxEventId, isDuplicate } = await insertInboxEvent({
    endpointId: endpoint.webhook_endpoint_id,
    providerCode: endpoint.provider_code,
    sourceEventId,
    idempotencyKey,
    headersJson,
    payloadJson: (parsedPayload as Record<string, unknown>) || {},
    rawBodyText: rawBody,
    signatureVerified
  })

  if (isDuplicate) {
    return { status: 200, body: { received: true, duplicate: true } }
  }

  // 8. Dispatch to handler
  const handler = handlerRegistry[endpoint.handler_code]

  if (!handler) {
    await updateInboxEventStatus(inboxEventId, 'failed', `No handler registered for: ${endpoint.handler_code}`)

    return { status: 200, body: { received: true, processed: false, reason: 'no handler' } }
  }

  try {
    await updateInboxEventStatus(inboxEventId, 'processing')

    const inboxEvent = {
      webhook_inbox_event_id: inboxEventId,
      webhook_endpoint_id: endpoint.webhook_endpoint_id,
      provider_code: endpoint.provider_code,
      source_event_id: sourceEventId,
      idempotency_key: idempotencyKey,
      headers_json: headersJson,
      payload_json: (parsedPayload as Record<string, unknown>) || {},
      raw_body_text: rawBody,
      signature_verified: signatureVerified,
      status: 'processing' as const,
      error_message: null,
      received_at: new Date().toISOString(),
      processed_at: null
    }

    await handler(inboxEvent, rawBody, parsedPayload)
    await updateInboxEventStatus(inboxEventId, 'processed')

    return { status: 200, body: { received: true, processed: true } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await updateInboxEventStatus(inboxEventId, 'failed', message)

    return { status: 200, body: { received: true, processed: false, error: message } }
  }
}

// ── Helpers ──

const computeHash = (input: string): string => createHash('sha256').update(input).digest('hex')

const extractSourceEventId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const obj = payload as Record<string, unknown>

  // Common provider event ID fields
  return (obj.event_id || obj.eventId || obj.id || obj.messageId) as string | null
}

const verifyAuth = async (
  endpoint: { auth_mode: string; secret_ref: string | null },
  request: Request,
  rawBody: string
): Promise<boolean | null> => {
  if (endpoint.auth_mode === 'none') return null

  const secretRef = endpoint.secret_ref

  if (!secretRef) return null

  const secret = await resolveSecret(secretRef)

  if (!secret) return false

  if (endpoint.auth_mode === 'shared_secret' || endpoint.auth_mode === 'bearer') {
    const authHeader = request.headers.get('authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()

    // Also check custom header for backward compat
    const customHeader = request.headers.get('x-hr-core-webhook-secret')?.trim() || ''
    const token = bearerToken || customHeader

    return token === secret
  }

  if (endpoint.auth_mode === 'hmac_sha256') {
    const signature = request.headers.get('x-greenhouse-signature') || ''
    const timestamp = request.headers.get('x-greenhouse-timestamp') || ''

    return verifySignature(secret, timestamp, rawBody, signature)
  }

  return null
}
