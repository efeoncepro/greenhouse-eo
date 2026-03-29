import 'server-only'

import type { WebhookSubscription, WebhookDelivery, WebhookEnvelope, EventFilter } from './types'
import { signPayload, resolveSecret } from './signing'
import { updateDeliveryStatus, insertDeliveryAttempt } from './store'
import { getNextRetryAt, isRetryableHttpStatus, shouldDeadLetter } from './retry-policy'

const DELIVERY_TIMEOUT_MS = 10_000

// ── Filter matching ──

/**
 * Match an event type against a filter pattern.
 * Supports trailing wildcard: "finance.*" matches "finance.income.created"
 */
export const matchesFilter = (eventType: string, aggregateType: string, filter: EventFilter): boolean => {
  if (filter.event_type) {
    const pattern = filter.event_type

    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -1) // "finance."

      if (!eventType.startsWith(prefix)) return false
    } else if (pattern !== eventType) {
      return false
    }
  }

  if (filter.aggregate_type && filter.aggregate_type !== aggregateType) {
    return false
  }

  return true
}

/**
 * Check if an event matches any filter in a subscription.
 * Empty filters = match everything.
 */
export const matchesSubscription = (
  eventType: string,
  aggregateType: string,
  subscription: WebhookSubscription
): boolean => {
  const filters = Array.isArray(subscription.event_filters_json)
    ? subscription.event_filters_json
    : []

  if (filters.length === 0) return true

  return filters.some(f => matchesFilter(eventType, aggregateType, f))
}

// ── Delivery execution ──

export const deliverWebhook = async (
  delivery: WebhookDelivery,
  subscription: WebhookSubscription,
  envelope: WebhookEnvelope
): Promise<void> => {
  const attemptNumber = delivery.attempt_count + 1
  const startedAt = new Date()

  // Build signed request
  const body = JSON.stringify(envelope)
  const timestamp = startedAt.toISOString()

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-greenhouse-event-id': envelope.eventId,
    'x-greenhouse-event-type': envelope.eventType,
    'x-greenhouse-delivery-id': delivery.webhook_delivery_id,
    'x-greenhouse-timestamp': timestamp
  }

  if (subscription.auth_mode === 'hmac_sha256' && subscription.secret_ref) {
    const secret = await resolveSecret(subscription.secret_ref)

    if (secret) {
      requestHeaders['x-greenhouse-signature'] = signPayload(secret, timestamp, body)
    }
  }

  if (subscription.auth_mode === 'bearer' && subscription.secret_ref) {
    const secret = await resolveSecret(subscription.secret_ref)

    if (secret) {
      requestHeaders['Authorization'] = `Bearer ${secret}`
    }
  }

  // Mark as delivering
  await updateDeliveryStatus(delivery.webhook_delivery_id, 'delivering')

  let responseStatus: number | null = null
  let responseBody: string | null = null
  let errorMessage: string | null = null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

    const response = await fetch(subscription.target_url, {
      method: 'POST',
      headers: requestHeaders,
      body,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    responseStatus = response.status
    responseBody = await response.text().catch(() => null)

    if (response.ok) {
      // Success
      await insertDeliveryAttempt({
        deliveryId: delivery.webhook_delivery_id,
        attemptNumber,
        requestHeaders,
        requestBody: envelope as unknown as Record<string, unknown>,
        responseStatus,
        responseBody,
        errorMessage: null,
        startedAt,
        finishedAt: new Date()
      })

      await updateDeliveryStatus(delivery.webhook_delivery_id, 'succeeded', {
        httpStatus: responseStatus ?? undefined,
        attemptCount: attemptNumber
      })

      return
    }

    errorMessage = `HTTP ${responseStatus}: ${(responseBody || '').slice(0, 500)}`
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
  }

  // Log the attempt
  await insertDeliveryAttempt({
    deliveryId: delivery.webhook_delivery_id,
    attemptNumber,
    requestHeaders,
    requestBody: envelope as unknown as Record<string, unknown>,
    responseStatus,
    responseBody,
    errorMessage,
    startedAt,
    finishedAt: new Date()
  })

  // Decide: retry or dead-letter
  if (shouldDeadLetter(attemptNumber, responseStatus)) {
    await updateDeliveryStatus(delivery.webhook_delivery_id, 'dead_letter', {
      httpStatus: responseStatus ?? undefined,
      errorMessage,
      attemptCount: attemptNumber
    })
  } else if (isRetryableHttpStatus(responseStatus)) {
    const nextRetryAt = getNextRetryAt(attemptNumber)

    await updateDeliveryStatus(delivery.webhook_delivery_id, 'retry_scheduled', {
      httpStatus: responseStatus ?? undefined,
      errorMessage,
      nextRetryAt: nextRetryAt || undefined,
      attemptCount: attemptNumber
    })
  } else {
    await updateDeliveryStatus(delivery.webhook_delivery_id, 'dead_letter', {
      httpStatus: responseStatus ?? undefined,
      errorMessage,
      attemptCount: attemptNumber
    })
  }
}
