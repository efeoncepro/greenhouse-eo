import { createHmac, timingSafeEqual } from 'node:crypto'

import { normalizeTaskStatus, TASK_STATUS_CANONICAL } from '@/lib/delivery/task-status-canonical'
import { captureWithDomain } from '@/lib/observability/capture'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { registerInboundHandler } from '@/lib/webhooks/inbound'
import { resolveSecret } from '@/lib/webhooks/signing'

/**
 * TASK-910 Slice 2 — Notion tasks-demo webhook handler.
 *
 * Recibe webhooks Notion del teamspace `Demo Greenhouse` (Notion ID
 * 36339c2f-efe7-814c-a0f5-0042863dbb5a). Endpoint canonical separado del
 * productivo `notion-tasks` (TASK-912 futuro) para defense in depth:
 *
 * 1. **HMAC secret separado**: `NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF`
 *    apunta a GCP Secret Manager `notion-webhook-signing-secret-demo`.
 *    Leak en un secret NO compromete el otro.
 *
 * 2. **Event payload marcado `metadata.demo_mode: true`**: reactive consumers
 *    canonical filtran por este flag para discriminar demo vs prod (Slice 3
 *    consumer demo persiste en tabla físicamente separada
 *    `task_status_transitions_demo`).
 *
 * 3. **Echo-loop filter canonical**: si `event.authors[*].id` matches el
 *    Notion integration user de Greenhouse, ACK + drop silenciosamente
 *    (evita procesar nuestros propios writebacks).
 *
 * 4. **Property allowlist filter**: solo procesa events que tocan el
 *    property name canonical de status (`Estado` cross-tenant V1).
 *
 * 5. **Inbox dedup**: `processInboundWebhook` canonical ya hace dedup por
 *    idempotencyKey (hash del sourceEventId o rawBody) en
 *    `greenhouse_sync.webhook_inbox_events`.
 *
 * **HMAC validation**: HMAC-SHA256 sobre raw body con secret resolved.
 * Notion webhook spec V1 envía signature en header `x-notion-signature`
 * con formato `sha256=<hex>`.
 *
 * **Cross-refs**:
 * - Spec: docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md
 * - Pattern fuente: src/lib/webhooks/handlers/hubspot-companies.ts (TASK-706)
 * - Migration Slice 0: webhook_endpoints row `notion-tasks-demo` shipped
 * - Status canonical helper: src/lib/delivery/task-status-canonical.ts
 * - Event canonical: EVENT_TYPES.notionTaskStatusTransitioned
 */

const SIGNATURE_HEADER = 'x-notion-signature'

/**
 * Notion canonical status property names (Greenhouse template).
 * Sky workspace legacy usaba `Estado 1` (typo); post operator cleanup
 * 2026-05-17 todos los teamspaces convergen a `Estado` canonical.
 */
const STATUS_PROPERTY_NAMES = new Set(['Estado', 'Estado 1'])

interface NotionWebhookEvent {
  readonly id?: string
  readonly type?: string
  readonly entity?: {
    readonly id?: string
    readonly type?: string
  }
  readonly data?: {
    readonly updated_properties?: readonly string[]
    readonly parent?: { readonly id?: string; readonly type?: string }
    readonly previous?: { readonly status?: { readonly name?: string } }
    readonly current?: { readonly status?: { readonly name?: string } }
  }
  readonly authors?: ReadonlyArray<{ readonly id?: string; readonly type?: string }>
  readonly timestamp?: string
}

/**
 * Validates Notion webhook HMAC signature. Notion canonical spec V1:
 * - Header `x-notion-signature` con formato `sha256=<hex>`
 * - Body raw bytes (NO parsed JSON)
 * - HMAC-SHA256(rawBody, secret)
 * - Timing-safe compare canonical
 */
const validateNotionSignature = (
  rawBody: string,
  signature: string,
  secret: string
): boolean => {
  if (!signature || !secret) {
    return false
  }

  const prefix = 'sha256='
  const providedHex = signature.startsWith(prefix) ? signature.slice(prefix.length) : signature

  const computedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  const expectedBuf = Buffer.from(computedHex, 'utf8')
  const receivedBuf = Buffer.from(providedHex, 'utf8')

  if (expectedBuf.length !== receivedBuf.length) {
    return false
  }

  try {
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

/**
 * Extract Notion task transitions from webhook events. Canonical:
 * - event.entity.type === 'page'
 * - event.data.updated_properties includes 'Estado' (o 'Estado 1' legacy)
 * - event.data.previous.status.name + current.status.name presentes
 *
 * Returns ONLY events que matchean estos criterios + normaliza statuses
 * via normalizeTaskStatus canonical (TASK-742 helper, accepts legacy aliases).
 */
const extractDemoTransitions = (
  events: readonly NotionWebhookEvent[],
  integrationUserId: string | null
): ReadonlyArray<{
  taskSourceId: string
  fromStatus: string
  toStatus: string
  transitionedAt: string
  transitionedBy: string | null
  sourceEventId: string
}> => {
  const transitions: Array<{
    taskSourceId: string
    fromStatus: string
    toStatus: string
    transitionedAt: string
    transitionedBy: string | null
    sourceEventId: string
  }> = []

  for (const event of events) {
    // Filter 1: must be page event with entity id
    const taskSourceId = event.entity?.id ?? ''

    if (!taskSourceId || event.entity?.type !== 'page') {
      continue
    }

    // Filter 2: echo-loop — if event author is our integration user, drop
    if (integrationUserId && Array.isArray(event.authors)) {
      const fromIntegration = event.authors.some(author => author?.id === integrationUserId)

      if (fromIntegration) {
        continue
      }
    }

    // Filter 3: updated_properties must include status property canonical
    const updatedProps = event.data?.updated_properties ?? []
    const touchesStatus = updatedProps.some(prop => STATUS_PROPERTY_NAMES.has(prop))

    if (!touchesStatus) {
      continue
    }

    // Filter 4: previous + current status present
    const previousRaw = event.data?.previous?.status?.name
    const currentRaw = event.data?.current?.status?.name

    if (!previousRaw || !currentRaw) {
      continue
    }

    // Normalize via canonical helper — accepts legacy aliases + maps to V1
    const fromCanonical = normalizeTaskStatus(previousRaw)
    const toCanonical = normalizeTaskStatus(currentRaw)

    if (!fromCanonical || !toCanonical) {
      // Unknown status (NOT in canonical 11 V1 nor any legacy alias) —
      // skip silently. Reliability signal `demo_teamspace_drift` (Slice 4)
      // detecta drift schema.
      continue
    }

    if (fromCanonical === toCanonical) {
      // Same status (NO transition) — skip
      continue
    }

    transitions.push({
      taskSourceId,
      fromStatus: fromCanonical,
      toStatus: toCanonical,
      transitionedAt: event.timestamp ?? new Date().toISOString(),
      transitionedBy: event.authors?.[0]?.id ?? null,
      sourceEventId: event.id ?? `${taskSourceId}-${event.timestamp ?? Date.now()}`
    })
  }

  return transitions
}

registerInboundHandler('notion-tasks-demo', async (inboxEvent, rawBody, parsedPayload) => {
  // 1. Validate HMAC signature canonical
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''

  const secret = await resolveSecret('NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF')

  if (!secret) {
    // Secret NO configurado — webhook NO puede validar signature.
    // Throw para que inbox marque failed + Notion reintente. Operator-side
    // pendiente: crear secret en GCP Secret Manager + setear env var ref.
    throw new Error(
      'NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF not configured (cannot validate demo webhook signature)'
    )
  }

  const valid = validateNotionSignature(rawBody, signature, secret)

  if (!valid) {
    throw new Error('Notion demo webhook signature validation failed')
  }

  // 2. Parse events array (Notion webhook canonical envelope)
  const envelope = parsedPayload as { events?: readonly NotionWebhookEvent[] } | null
  const events = Array.isArray(envelope?.events) ? envelope.events : []

  if (events.length === 0) {
    // ACK empty payload — Notion sometimes sends keepalive
    return
  }

  // 3. Resolve integration user ID for echo-loop filter (optional env var)
  const integrationUserId = process.env.GREENHOUSE_NOTION_INTEGRATION_USER_ID ?? null

  // 4. Extract canonical demo transitions (after all filters + normalization)
  const transitions = extractDemoTransitions(events, integrationUserId)

  if (transitions.length === 0) {
    // No relevant transitions — webhook ACK'd but nothing to emit
    return
  }

  // 5. Emit outbox event per transition with metadata.demo_mode: true
  //    Reactive consumer canonical `notion-status-transition-capture-demo`
  //    (Slice 3) filtra por metadata.demo_mode === true antes de persistir.
  for (const transition of transitions) {
    try {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.notionTask,
        aggregateId: transition.taskSourceId,
        eventType: EVENT_TYPES.notionTaskStatusTransitioned,
        payload: {
          schemaVersion: 1,
          taskSourceId: transition.taskSourceId,
          workspaceId: 'demo',
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
          transitionedAt: transition.transitionedAt,
          transitionedBy: transition.transitionedBy,
          sourceEventId: transition.sourceEventId,
          metadata: {
            demo_mode: true
          }
        }
      })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: {
          source: 'notion-tasks-demo-webhook',
          stage: 'outbox_emit'
        },
        extra: {
          taskSourceId: transition.taskSourceId,
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus
        }
      })

      throw err
    }
  }
})

// Export for tests
export const __testing__ = {
  extractDemoTransitions,
  validateNotionSignature,
  STATUS_PROPERTY_NAMES,
  TASK_STATUS_CANONICAL
}
