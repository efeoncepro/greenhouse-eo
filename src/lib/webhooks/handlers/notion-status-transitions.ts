import { createHmac, timingSafeEqual } from 'node:crypto'

import { isNotionStatusTransitionsWebhookEnabled } from '@/lib/notion-metrics/status-transitions-flags'
import { isDemoTareasDataSource } from '@/lib/notion-metrics/notion-productive-workspaces'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { registerInboundHandler } from '@/lib/webhooks/inbound'

/**
 * TASK-912 — Notion status-transitions webhook handler PRODUCTIVO (Efeonce + Sky).
 *
 * Sibling físicamente separado del handler demo `notion-tasks-demo.ts`
 * (TASK-910/914). Mismo patrón canonical re-fetch (TASK-914): el webhook es un
 * trigger ligero (NO incluye from/to ni valores, solo IDs de propiedad); el
 * consumer `notion-status-transition-capture` re-fetchea la página (source of
 * truth) y resuelve el workspace por `parent.data_source_id` (autoritativo).
 *
 * **Seguridad / no-interferencia (TASK-912 invariantes)**:
 *
 * 1. **Kill-switch flag `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` default OFF**:
 *    cuando OFF, ACK + drop silencioso (cero re-fetch, cero outbox emit). Al merge
 *    NO afecta ningún flujo. La activación es operador-side deliberada.
 *
 * 2. **Verification handshake SIEMPRE ACK** (pre-flag, pre-HMAC): permite
 *    (re)suscribir aunque el flag esté OFF o el secret no exista todavía.
 *
 * 3. **HMAC-SHA256 separado**: secret productivo
 *    `NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF` → GCP Secret Manager.
 *    Distinto del demo — leak en uno NO compromete el otro.
 *
 * 4. **Demo drop (best-effort)**: la suscripción productiva es amplia (cubre
 *    todos los teamspaces). Si el `parent.id` del webhook resuelve al data source
 *    demo, se descarta (el demo tiene su propio endpoint). Defense in depth: el
 *    consumer productivo igual descarta lo que no sea Efeonce/Sky vía re-fetch.
 *
 * 5. **Echo-loop filter**: drop si el autor es nuestra integración (writebacks).
 *    Opcional vía `GREENHOUSE_NOTION_INTEGRATION_USER_ID` (TASK-912 capture NO
 *    escribe a Notion, así que el echo es inofensivo — el filtro es optimización).
 *
 * 6. **Cero escrituras a Notion**: solo emite outbox events (el consumer re-fetchea
 *    con GET read-only). Imposible mutar contenido de Notion.
 *
 * Cross-refs:
 * - Spec: docs/tasks/in-progress/TASK-912-ico-status-transition-webhook-ingestion-and-bq-formula.md
 * - Demo sibling: src/lib/webhooks/handlers/notion-tasks-demo.ts
 * - Consumer: src/lib/sync/projections/notion-status-transition-capture.ts (Slice 2)
 * - Migration seed: webhook_endpoints row `notion-status-transitions`
 */

const SIGNATURE_HEADER = 'x-notion-signature'

const SIGNING_SECRET_ENV = 'NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF'

/**
 * Detecta el verification handshake de Notion. Al crear/verificar una
 * suscripción webhook, Notion envía `{ verification_token: 'secret_...' }`
 * sin array `events` ni firma HMAC válida. El token ES el futuro signing
 * secret. Returns el token si es un verification request, null si no.
 *
 * Exported para tests anti-regresión.
 */
export const extractVerificationToken = (parsedPayload: unknown): string | null => {
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return null
  }

  const token = (parsedPayload as { verification_token?: unknown }).verification_token

  return typeof token === 'string' && token.length > 0 ? token : null
}

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
  }
  readonly authors?: ReadonlyArray<{ readonly id?: string; readonly type?: string }>
  readonly timestamp?: string
}

/**
 * Validates Notion webhook HMAC signature (canonical V1):
 * - Header `x-notion-signature` con formato `sha256=<hex>`
 * - Body raw bytes (NO parsed JSON)
 * - HMAC-SHA256(rawBody, secret) + timing-safe compare
 */
const validateNotionSignature = (rawBody: string, signature: string, secret: string): boolean => {
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

interface StatusChangeSignal {
  taskSourceId: string
  changedPropertyIds: readonly string[]
  parentId: string | null
  sourceEventId: string
  occurredAt: string
}

/**
 * Normaliza el envelope del webhook a un array de eventos. Notion 2026-03-11
 * entrega un objeto evento único (`{ id, type, entity, data }`), pero
 * versiones/configs pueden mandar `{ events: [...] }`. Soporta ambos (lección
 * TASK-914). Exported para tests anti-regresión.
 */
const normalizeWebhookEvents = (parsedPayload: unknown): readonly NotionWebhookEvent[] => {
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return []
  }

  const obj = parsedPayload as { events?: unknown; type?: unknown; entity?: unknown }

  if (Array.isArray(obj.events)) {
    return obj.events as NotionWebhookEvent[]
  }

  if (typeof obj.type === 'string' && obj.entity && typeof obj.entity === 'object') {
    return [parsedPayload as NotionWebhookEvent]
  }

  return []
}

/**
 * Extrae TRIGGERS de cambio de propiedad desde los webhook events (re-fetch
 * pattern TASK-914 — NO deriva from/to del payload). Filtros:
 *
 * 1. page event con entity id.
 * 2. echo-loop: drop si el autor es nuestra integración.
 * 3. demo drop (best-effort): si `parent.id` resuelve al data source demo, skip
 *    (el demo tiene su propio endpoint). El consumer es autoritativo vía re-fetch.
 * 4. `updated_properties` no vacío (page.created sin props NO es un cambio).
 *
 * NO filtra por Efeonce/Sky acá: el `parent.id` del webhook puede ser DS o DB id
 * (shape no garantizado), así que forward-all (salvo demo) y el consumer resuelve
 * autoritativamente con `parent.data_source_id` del GET de la página.
 *
 * Exported para tests anti-regresión.
 */
const extractStatusChangeSignals = (
  events: readonly NotionWebhookEvent[],
  integrationUserId: string | null
): readonly StatusChangeSignal[] => {
  const signals: StatusChangeSignal[] = []

  for (const event of events) {
    const taskSourceId = event.entity?.id ?? ''

    if (!taskSourceId || event.entity?.type !== 'page') {
      continue
    }

    // Echo-loop: drop our own writebacks (optimización; capture no escribe Notion)
    if (integrationUserId && Array.isArray(event.authors)) {
      const fromIntegration = event.authors.some(author => author?.id === integrationUserId)

      if (fromIntegration) {
        continue
      }
    }

    const parentId = event.data?.parent?.id ?? null

    // Demo drop best-effort — el demo tiene su propio endpoint /notion-tasks-demo.
    if (isDemoTareasDataSource(parentId)) {
      continue
    }

    const updatedProps = event.data?.updated_properties ?? []

    if (updatedProps.length === 0) {
      continue
    }

    signals.push({
      taskSourceId,
      changedPropertyIds: updatedProps,
      parentId,
      sourceEventId: event.id ?? `${taskSourceId}-${event.timestamp ?? Date.now()}`,
      occurredAt: event.timestamp ?? new Date().toISOString()
    })
  }

  return signals
}

registerInboundHandler('notion-status-transitions', async (inboxEvent, rawBody, parsedPayload) => {
  // 0. Verification handshake (canonical, pre-flag, pre-HMAC). Siempre ACK para
  //    permitir (re)suscribir aunque el flag esté OFF o el secret no exista aún.
  if (extractVerificationToken(parsedPayload)) {
    return
  }

  // 1. Kill-switch. Default OFF → ACK + drop (cero re-fetch, cero emit). Al merge
  //    NO afecta los flujos de métricas Notion existentes.
  if (!isNotionStatusTransitionsWebhookEnabled()) {
    return
  }

  // 2. Validate HMAC signature canonical (secret productivo separado del demo).
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''

  const secretRef = process.env[SIGNING_SECRET_ENV]?.trim()
  const secret = secretRef ? await resolveSecretByRef(secretRef) : null

  if (!secret) {
    // Secret no configurado — no podemos validar firma. Throw → inbox marca
    // failed + Notion reintenta. Operador-side pendiente: crear secret + env ref.
    throw new Error(`${SIGNING_SECRET_ENV} not configured (cannot validate notion-status-transitions webhook signature)`)
  }

  const valid = validateNotionSignature(rawBody, signature, secret)

  if (!valid) {
    throw new Error('Notion status-transitions webhook signature validation failed')
  }

  // 3. Normalizar envelope (single event o {events:[]}).
  const events = normalizeWebhookEvents(parsedPayload)

  if (events.length === 0) {
    return
  }

  // 4. Echo-loop filter (opcional — TASK-912 capture NO escribe Notion).
  //    ⚠️ NO reusar el env var genérico del demo: usar uno productivo dedicado.
  const integrationUserId = process.env.NOTION_PRODUCTIVE_INTEGRATION_USER_ID ?? null

  // 5. Extract triggers (re-fetch pattern: consumer re-fetch + compare-to-last).
  const signals = extractStatusChangeSignals(events, integrationUserId)

  if (signals.length === 0) {
    return
  }

  // 6. Emit page_change_signal productivo per trigger. El consumer
  //    `notion-status-transition-capture` re-fetchea + resuelve workspace + persist.
  for (const signal of signals) {
    try {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.notionTask,
        aggregateId: signal.taskSourceId,
        eventType: EVENT_TYPES.notionTaskPageChangeSignal,
        payload: {
          schemaVersion: 1,
          taskSourceId: signal.taskSourceId,
          changedPropertyIds: signal.changedPropertyIds,
          parentId: signal.parentId,
          sourceEventId: signal.sourceEventId,
          occurredAt: signal.occurredAt
        }
      })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: { source: 'notion-status-transitions-webhook', stage: 'outbox_emit' },
        extra: { taskSourceId: signal.taskSourceId }
      })

      throw err
    }
  }
})

// Export for tests
export const __testing__ = {
  extractStatusChangeSignals,
  normalizeWebhookEvents,
  validateNotionSignature,
  extractVerificationToken
}
