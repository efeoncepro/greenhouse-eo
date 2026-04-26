import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { parseApiPlatformPagination } from '@/lib/api-platform/core/pagination'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

type WebhookSubscriptionRow = {
  webhook_subscription_id: string
  subscriber_code: string
  target_url: string
  auth_mode: 'hmac_sha256' | 'bearer' | 'none'
  secret_ref: string | null
  event_filters_json: unknown
  active: boolean
  paused_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  sister_platform_consumer_id: string | null
  sister_platform_binding_id: string | null
  greenhouse_scope_type: string | null
  organization_id: string | null
  client_id: string | null
  space_id: string | null
  created_by_control_plane: boolean | null
  control_plane_metadata_json: Record<string, unknown> | null
}

type WebhookDeliveryRow = {
  webhook_delivery_id: string
  event_id: string
  webhook_subscription_id: string
  event_type: string
  status: 'pending' | 'delivering' | 'succeeded' | 'retry_scheduled' | 'dead_letter'
  attempt_count: number
  next_retry_at: string | Date | null
  last_http_status: number | null
  last_error_message: string | null
  created_at: string | Date
  completed_at: string | Date | null
  aggregate_type: string | null
  aggregate_id: string | null
  payload_json: unknown
  occurred_at: string | Date | null
  published_at: string | Date | null
}

type WebhookDeliveryAttemptRow = {
  webhook_delivery_attempt_id: string
  webhook_delivery_id: string
  attempt_number: number
  request_headers_json: Record<string, unknown>
  request_body_json: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  started_at: string | Date
  finished_at: string | Date | null
  error_message: string | null
}

type EventFilter = {
  event_type?: string
  aggregate_type?: string
}

type SubscriptionPayload = {
  targetUrl?: unknown
  authMode?: unknown
  secretRef?: unknown
  eventFilters?: unknown
  active?: unknown
  paused?: unknown
  metadata?: unknown
}

const EVENT_VERSION = 1

const toIsoString = (value: string | Date | null | undefined) => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : String(value)
}

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }

  return typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

const parseEventFilters = (value: unknown): EventFilter[] => {
  let raw = value

  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value) as unknown
    } catch {
      throw new ApiPlatformError('eventFilters must be valid JSON.', {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }
  }

  if (!Array.isArray(raw)) {
    throw new ApiPlatformError('eventFilters must be an array.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return raw.map((filter, index) => {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
      throw new ApiPlatformError(`eventFilters[${index}] must be an object.`, {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    const candidate = filter as Record<string, unknown>

    const eventType = typeof candidate.event_type === 'string'
      ? candidate.event_type.trim()
      : typeof candidate.eventType === 'string'
        ? candidate.eventType.trim()
        : undefined

    const aggregateType = typeof candidate.aggregate_type === 'string'
      ? candidate.aggregate_type.trim()
      : typeof candidate.aggregateType === 'string'
        ? candidate.aggregateType.trim()
        : undefined

    if (!eventType && !aggregateType) {
      throw new ApiPlatformError(`eventFilters[${index}] must include eventType or aggregateType.`, {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    return {
      ...(eventType ? { event_type: eventType } : {}),
      ...(aggregateType ? { aggregate_type: aggregateType } : {})
    }
  })
}

const parseTargetUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiPlatformError('targetUrl is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    throw new ApiPlatformError('targetUrl must be a valid URL.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  if (url.protocol !== 'https:') {
    throw new ApiPlatformError('targetUrl must use https.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return url.toString()
}

const parseAuthMode = (value: unknown, fallback: 'hmac_sha256' | 'bearer' | 'none' = 'hmac_sha256') => {
  if (value === undefined || value === null || value === '') return fallback

  if (value === 'hmac_sha256' || value === 'bearer' || value === 'none') return value

  throw new ApiPlatformError('authMode must be hmac_sha256, bearer, or none.', {
    statusCode: 400,
    errorCode: 'bad_request'
  })
}

const normalizeSubscriptionPayload = (value: unknown): SubscriptionPayload => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiPlatformError('Request body must be a JSON object.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return value as SubscriptionPayload
}

const controlPlaneScopeParams = (context: ApiPlatformRequestContext) => [
  context.consumer.consumerId,
  context.binding.bindingId,
  context.binding.greenhouseScopeType,
  context.binding.organizationId,
  context.binding.clientId,
  context.binding.spaceId
]

const controlPlaneWhereSql = `
  ws.sister_platform_consumer_id = $1
  AND ws.sister_platform_binding_id = $2
  AND ws.greenhouse_scope_type = $3
  AND ws.organization_id IS NOT DISTINCT FROM $4
  AND ws.client_id IS NOT DISTINCT FROM $5
  AND ws.space_id IS NOT DISTINCT FROM $6
`

const mapSubscription = (row: WebhookSubscriptionRow) => ({
  subscriptionId: row.webhook_subscription_id,
  subscriberCode: row.subscriber_code,
  targetUrl: row.target_url,
  authMode: row.auth_mode,
  hasSecret: Boolean(row.secret_ref),
  eventFilters: Array.isArray(row.event_filters_json) ? row.event_filters_json : [],
  active: row.active,
  pausedAt: toIsoString(row.paused_at),
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at),
  scope: {
    scopeType: row.greenhouse_scope_type,
    organizationId: row.organization_id,
    clientId: row.client_id,
    spaceId: row.space_id
  },
  metadata: parseJsonObject(row.control_plane_metadata_json)
})

const mapDelivery = (row: WebhookDeliveryRow) => ({
  deliveryId: row.webhook_delivery_id,
  eventId: row.event_id,
  subscriptionId: row.webhook_subscription_id,
  eventType: row.event_type,
  status: row.status,
  attemptCount: Number(row.attempt_count || 0),
  nextRetryAt: toIsoString(row.next_retry_at),
  lastHttpStatus: row.last_http_status,
  lastErrorMessage: row.last_error_message,
  createdAt: toIsoString(row.created_at),
  completedAt: toIsoString(row.completed_at),
  event: {
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: EVENT_VERSION,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    occurredAt: toIsoString(row.occurred_at),
    publishedAt: toIsoString(row.published_at),
    scope: {},
    data: parseJsonObject(row.payload_json),
    meta: {
      transportEnvelopeVersion: EVENT_VERSION
    }
  }
})

export const listEventTypes = async ({ request }: { request: Request }) => {
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim().toLowerCase()
  const namespace = url.searchParams.get('namespace')?.trim().toLowerCase()
  const aggregateType = url.searchParams.get('aggregateType')?.trim()
  const aggregateValues = Object.values(AGGREGATE_TYPES) as string[]

  const items = Object.entries(EVENT_TYPES)
    .map(([code, eventType]) => {
      const eventNamespace = eventType.split('.')[0] || 'general'

      return {
        code,
        eventType,
        namespace: eventNamespace,
        eventVersion: EVENT_VERSION,
        knownAggregateTypes: aggregateValues.filter(value => eventType.includes(value.replaceAll('_', '.')))
      }
    })
    .filter(item => !namespace || item.namespace === namespace)
    .filter(item => !aggregateType || item.knownAggregateTypes.includes(aggregateType))
    .filter(item => !search || item.code.toLowerCase().includes(search) || item.eventType.toLowerCase().includes(search))

  return {
    count: items.length,
    items
  }
}

export const listWebhookSubscriptions = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}) => {
  const { page, pageSize } = parseApiPlatformPagination(request)
  const offset = (page - 1) * pageSize
  const url = new URL(request.url)
  const active = url.searchParams.get('active')
  const params = controlPlaneScopeParams(context)
  const activeFilter = active === 'true' || active === 'false' ? active === 'true' : null

  const rows = await query<WebhookSubscriptionRow>(
    `
      SELECT ws.*
      FROM greenhouse_sync.webhook_subscriptions ws
      WHERE ${controlPlaneWhereSql}
        AND ($7::boolean IS NULL OR ws.active = $7::boolean)
      ORDER BY ws.created_at DESC
      LIMIT $8 OFFSET $9
    `,
    [...params, activeFilter, pageSize, offset]
  )

  const totalRows = await query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM greenhouse_sync.webhook_subscriptions ws
      WHERE ${controlPlaneWhereSql}
        AND ($7::boolean IS NULL OR ws.active = $7::boolean)
    `,
    [...params, activeFilter]
  )

  return {
    page,
    pageSize,
    total: Number(totalRows[0]?.total || 0),
    count: rows.length,
    items: rows.map(mapSubscription)
  }
}

export const getWebhookSubscription = async ({
  context,
  subscriptionId
}: {
  context: ApiPlatformRequestContext
  subscriptionId: string
}) => {
  const rows = await query<WebhookSubscriptionRow>(
    `
      SELECT ws.*
      FROM greenhouse_sync.webhook_subscriptions ws
      WHERE ${controlPlaneWhereSql}
        AND ws.webhook_subscription_id = $7
      LIMIT 1
    `,
    [...controlPlaneScopeParams(context), subscriptionId]
  )

  const row = rows[0]

  if (!row) {
    throw new ApiPlatformError('Webhook subscription not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  return mapSubscription(row)
}

export const createWebhookSubscription = async ({
  context,
  body
}: {
  context: ApiPlatformRequestContext
  body: unknown
}) => {
  const payload = normalizeSubscriptionPayload(body)
  const targetUrl = parseTargetUrl(payload.targetUrl)
  const authMode = parseAuthMode(payload.authMode)
  const eventFilters = parseEventFilters(payload.eventFilters ?? [])
  const secretRef = typeof payload.secretRef === 'string' && payload.secretRef.trim() ? payload.secretRef.trim() : null
  const metadata = parseJsonObject(payload.metadata)
  const subscriptionId = `wh-sub-${randomUUID()}`
  const subscriberCode = `${context.consumer.sisterPlatformKey}:${context.consumer.publicId}:${subscriptionId.slice(-8)}`
  const active = typeof payload.active === 'boolean' ? payload.active : true

  if ((authMode === 'hmac_sha256' || authMode === 'bearer') && !secretRef) {
    throw new ApiPlatformError('secretRef is required for the selected authMode.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const rows = await query<WebhookSubscriptionRow>(
    `
      INSERT INTO greenhouse_sync.webhook_subscriptions (
        webhook_subscription_id,
        subscriber_code,
        target_url,
        auth_mode,
        secret_ref,
        event_filters_json,
        active,
        paused_at,
        sister_platform_consumer_id,
        sister_platform_binding_id,
        greenhouse_scope_type,
        organization_id,
        client_id,
        space_id,
        created_by_control_plane,
        control_plane_metadata_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, CASE WHEN $7 THEN NULL ELSE CURRENT_TIMESTAMP END,
        $8, $9, $10, $11, $12, $13, TRUE, $14::jsonb
      )
      RETURNING *
    `,
    [
      subscriptionId,
      subscriberCode,
      targetUrl,
      authMode,
      secretRef,
      JSON.stringify(eventFilters),
      active,
      context.consumer.consumerId,
      context.binding.bindingId,
      context.binding.greenhouseScopeType,
      context.binding.organizationId,
      context.binding.clientId,
      context.binding.spaceId,
      JSON.stringify(metadata)
    ]
  )

  return mapSubscription(rows[0]!)
}

export const updateWebhookSubscription = async ({
  context,
  subscriptionId,
  body
}: {
  context: ApiPlatformRequestContext
  subscriptionId: string
  body: unknown
}) => {
  const current = await getWebhookSubscription({ context, subscriptionId })
  const payload = normalizeSubscriptionPayload(body)
  const targetUrl = payload.targetUrl === undefined ? current.targetUrl : parseTargetUrl(payload.targetUrl)
  const authMode = parseAuthMode(payload.authMode, current.authMode)
  const eventFilters = payload.eventFilters === undefined ? current.eventFilters : parseEventFilters(payload.eventFilters)

  const secretRef = payload.secretRef === undefined
    ? null
    : typeof payload.secretRef === 'string' && payload.secretRef.trim()
      ? payload.secretRef.trim()
      : null

  const active = typeof payload.active === 'boolean' ? payload.active : current.active
  const paused = typeof payload.paused === 'boolean' ? payload.paused : Boolean(current.pausedAt)
  const metadata = payload.metadata === undefined ? current.metadata : parseJsonObject(payload.metadata)

  if ((authMode === 'hmac_sha256' || authMode === 'bearer') && payload.secretRef === null) {
    throw new ApiPlatformError('secretRef cannot be cleared for the selected authMode.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const rows = await query<WebhookSubscriptionRow>(
    `
      UPDATE greenhouse_sync.webhook_subscriptions ws
      SET
        target_url = $8,
        auth_mode = $9,
        secret_ref = COALESCE($10, secret_ref),
        event_filters_json = $11::jsonb,
        active = $12,
        paused_at = CASE WHEN $13 THEN COALESCE(paused_at, CURRENT_TIMESTAMP) ELSE NULL END,
        control_plane_metadata_json = $14::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${controlPlaneWhereSql}
        AND ws.webhook_subscription_id = $7
      RETURNING *
    `,
    [
      ...controlPlaneScopeParams(context),
      subscriptionId,
      targetUrl,
      authMode,
      secretRef,
      JSON.stringify(eventFilters),
      active,
      paused,
      JSON.stringify(metadata)
    ]
  )

  if (!rows[0]) {
    throw new ApiPlatformError('Webhook subscription not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  return mapSubscription(rows[0])
}

export const listWebhookDeliveries = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}) => {
  const { page, pageSize } = parseApiPlatformPagination(request)
  const offset = (page - 1) * pageSize
  const url = new URL(request.url)
  const status = url.searchParams.get('status')?.trim()
  const eventType = url.searchParams.get('eventType')?.trim()
  const params = controlPlaneScopeParams(context)

  const rows = await query<WebhookDeliveryRow>(
    `
      SELECT
        wd.*,
        oe.aggregate_type,
        oe.aggregate_id,
        oe.payload_json,
        oe.occurred_at,
        oe.published_at
      FROM greenhouse_sync.webhook_deliveries wd
      JOIN greenhouse_sync.webhook_subscriptions ws
        ON ws.webhook_subscription_id = wd.webhook_subscription_id
      LEFT JOIN greenhouse_sync.outbox_events oe
        ON oe.event_id = wd.event_id
      WHERE ${controlPlaneWhereSql}
        AND ($7::text IS NULL OR wd.status = $7::text)
        AND ($8::text IS NULL OR wd.event_type = $8::text)
      ORDER BY wd.created_at DESC
      LIMIT $9 OFFSET $10
    `,
    [...params, status || null, eventType || null, pageSize, offset]
  )

  const totalRows = await query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM greenhouse_sync.webhook_deliveries wd
      JOIN greenhouse_sync.webhook_subscriptions ws
        ON ws.webhook_subscription_id = wd.webhook_subscription_id
      WHERE ${controlPlaneWhereSql}
        AND ($7::text IS NULL OR wd.status = $7::text)
        AND ($8::text IS NULL OR wd.event_type = $8::text)
    `,
    [...params, status || null, eventType || null]
  )

  return {
    page,
    pageSize,
    total: Number(totalRows[0]?.total || 0),
    count: rows.length,
    items: rows.map(mapDelivery)
  }
}

export const getWebhookDelivery = async ({
  context,
  deliveryId
}: {
  context: ApiPlatformRequestContext
  deliveryId: string
}) => {
  const rows = await query<WebhookDeliveryRow>(
    `
      SELECT
        wd.*,
        oe.aggregate_type,
        oe.aggregate_id,
        oe.payload_json,
        oe.occurred_at,
        oe.published_at
      FROM greenhouse_sync.webhook_deliveries wd
      JOIN greenhouse_sync.webhook_subscriptions ws
        ON ws.webhook_subscription_id = wd.webhook_subscription_id
      LEFT JOIN greenhouse_sync.outbox_events oe
        ON oe.event_id = wd.event_id
      WHERE ${controlPlaneWhereSql}
        AND wd.webhook_delivery_id = $7
      LIMIT 1
    `,
    [...controlPlaneScopeParams(context), deliveryId]
  )

  const row = rows[0]

  if (!row) {
    throw new ApiPlatformError('Webhook delivery not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const attemptRows = await query<WebhookDeliveryAttemptRow>(
    `
      SELECT *
      FROM greenhouse_sync.webhook_delivery_attempts
      WHERE webhook_delivery_id = $1
      ORDER BY attempt_number ASC, started_at ASC
    `,
    [deliveryId]
  )

  return {
    ...mapDelivery(row),
    attempts: attemptRows.map(attempt => ({
      attemptId: attempt.webhook_delivery_attempt_id,
      attemptNumber: attempt.attempt_number,
      responseStatus: attempt.response_status,
      responseBody: attempt.response_body,
      errorMessage: attempt.error_message,
      startedAt: toIsoString(attempt.started_at),
      finishedAt: toIsoString(attempt.finished_at),
      requestHeaders: attempt.request_headers_json,
      requestBody: attempt.request_body_json
    }))
  }
}

export const retryWebhookDelivery = async ({
  context,
  deliveryId
}: {
  context: ApiPlatformRequestContext
  deliveryId: string
}) => {
  await getWebhookDelivery({ context, deliveryId })

  const rows = await query<WebhookDeliveryRow>(
    `
      WITH updated AS (
        UPDATE greenhouse_sync.webhook_deliveries wd
        SET
          status = 'retry_scheduled',
          next_retry_at = CURRENT_TIMESTAMP,
          last_error_message = NULL,
          completed_at = NULL
        FROM greenhouse_sync.webhook_subscriptions ws
        WHERE ws.webhook_subscription_id = wd.webhook_subscription_id
          AND ${controlPlaneWhereSql}
          AND wd.webhook_delivery_id = $7
        RETURNING wd.*
      )
      SELECT
        updated.*,
        oe.aggregate_type,
        oe.aggregate_id,
        oe.payload_json,
        oe.occurred_at,
        oe.published_at
      FROM updated
      LEFT JOIN greenhouse_sync.outbox_events oe
        ON oe.event_id = updated.event_id
    `,
    [...controlPlaneScopeParams(context), deliveryId]
  )

  return mapDelivery(rows[0]!)
}
