import { createHmac, timingSafeEqual } from 'node:crypto'

import { isNotionKnowledgeWebhookEnabled } from '@/lib/knowledge/notion/webhook-flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { registerInboundHandler } from '@/lib/webhooks/inbound'

/**
 * TASK-1094 — Notion Knowledge auto-ingest webhook handler.
 *
 * Mantiene `greenhouse_knowledge` al día cuando alguien publica/edita/borra un
 * artículo en una Wiki/página declarada del teamspace de conocimiento. Espeja el
 * patrón canónico TASK-912 (re-fetch): el webhook es un **trigger ligero** (page id
 * + tipo de evento, NO el contenido); el consumer `knowledge-notion-ingest`
 * re-fetchea la página (source of truth), aplica el gate de gobernanza y re-ingiere
 * (idempotente) o deprecia (en borrado).
 *
 * **Seguridad / no-interferencia**:
 * 1. Kill-switch `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` default OFF → ACK + drop. Al
 *    merge cero efecto. Activación operador-side deliberada.
 * 2. Verification handshake SIEMPRE ACK (pre-flag, pre-HMAC) para poder (re)suscribir.
 * 3. HMAC-SHA256 con secret PROPIO de knowledge (`NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF`),
 *    aislado del de delivery (TASK-912) y demo.
 * 4. Cero escrituras a Notion: solo emite outbox (el consumer re-fetchea con GET read-only).
 *
 * Eventos manejados: `page.created`, `page.content_updated`, `page.properties_updated`,
 * `page.deleted`, `page.undeleted`. Los `data_source.*` (DB-level, sin page id) NO se
 * procesan acá — la deriva a nivel DB la cubre el reconcile on-demand (Slice 3).
 */

const SIGNATURE_HEADER = 'x-notion-signature'

const SIGNING_SECRET_ENV = 'NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF'

/** Tipos de evento Notion que representan un borrado (deprecar el doc). */
const DELETION_EVENT_TYPES = new Set(['page.deleted', 'page.moved'])

/**
 * Detecta el verification handshake de Notion (`{ verification_token: '...' }`).
 * El token ES el futuro signing secret. Returns el token o null. Exported para tests.
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
  readonly entity?: { readonly id?: string; readonly type?: string }
  readonly data?: { readonly parent?: { readonly id?: string; readonly type?: string } }
  readonly authors?: ReadonlyArray<{ readonly id?: string; readonly type?: string }>
  readonly timestamp?: string
}

/** HMAC-SHA256(rawBody, secret) + timing-safe compare. Header `sha256=<hex>`. */
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

export interface KnowledgePageChangeSignal {
  pageId: string
  notionEventType: string
  isDeletion: boolean
  parentId: string | null
  sourceEventId: string
  occurredAt: string
}

/** Normaliza el envelope a un array de eventos (single object o `{ events: [] }`). */
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
 * Extrae triggers de cambio de página desde los eventos. Solo eventos de página
 * (`entity.type === 'page'`) con page id. Marca `isDeletion` para borrados.
 * NO confía el payload para el contenido — el consumer re-fetchea. Exported para tests.
 */
const extractKnowledgePageSignals = (
  events: readonly NotionWebhookEvent[],
  integrationUserId: string | null
): readonly KnowledgePageChangeSignal[] => {
  const signals: KnowledgePageChangeSignal[] = []

  for (const event of events) {
    const pageId = event.entity?.id ?? ''

    if (!pageId || event.entity?.type !== 'page') {
      continue
    }

    // Echo-loop: drop nuestros propios writebacks (optimización; knowledge no escribe Notion).
    if (integrationUserId && Array.isArray(event.authors)) {
      if (event.authors.some(author => author?.id === integrationUserId)) {
        continue
      }
    }

    const notionEventType = event.type ?? 'page.unknown'

    signals.push({
      pageId,
      notionEventType,
      isDeletion: DELETION_EVENT_TYPES.has(notionEventType),
      parentId: event.data?.parent?.id ?? null,
      sourceEventId: event.id ?? `${pageId}-${event.timestamp ?? Date.now()}`,
      occurredAt: event.timestamp ?? new Date().toISOString()
    })
  }

  return signals
}

registerInboundHandler('notion-knowledge', async (inboxEvent, rawBody, parsedPayload) => {
  // 0. Verification handshake — siempre ACK (pre-flag, pre-HMAC).
  if (extractVerificationToken(parsedPayload)) {
    return
  }

  // 1. Kill-switch. Default OFF → ACK + drop (cero re-fetch, cero emit).
  if (!isNotionKnowledgeWebhookEnabled()) {
    return
  }

  // 2. HMAC (secret propio de knowledge).
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''

  const secretRef = process.env[SIGNING_SECRET_ENV]?.trim()
  const secret = secretRef ? await resolveSecretByRef(secretRef) : null

  if (!secret) {
    throw new Error(`${SIGNING_SECRET_ENV} not configured (cannot validate notion-knowledge webhook signature)`)
  }

  if (!validateNotionSignature(rawBody, signature, secret)) {
    throw new Error('Notion knowledge webhook signature validation failed')
  }

  // 3. Normalizar + extraer triggers de página.
  const events = normalizeWebhookEvents(parsedPayload)

  if (events.length === 0) {
    return
  }

  const integrationUserId = process.env.NOTION_KNOWLEDGE_INTEGRATION_USER_ID ?? null
  const signals = extractKnowledgePageSignals(events, integrationUserId)

  if (signals.length === 0) {
    return
  }

  // 4. Emit page_change_signal per trigger. El consumer re-fetchea + gate + ingest|deprecate.
  for (const signal of signals) {
    try {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.knowledgeNotionPage,
        aggregateId: signal.pageId,
        eventType: EVENT_TYPES.knowledgeNotionPageChangeSignal,
        payload: {
          schemaVersion: 1,
          pageId: signal.pageId,
          notionEventType: signal.notionEventType,
          isDeletion: signal.isDeletion,
          parentId: signal.parentId,
          sourceEventId: signal.sourceEventId,
          occurredAt: signal.occurredAt
        }
      })
    } catch (err) {
      captureWithDomain(err, 'knowledge', {
        level: 'error',
        tags: { source: 'notion-knowledge-webhook', stage: 'outbox_emit' },
        extra: { pageId: signal.pageId }
      })

      throw err
    }
  }
})

export const __testing__ = {
  extractKnowledgePageSignals,
  normalizeWebhookEvents,
  validateNotionSignature,
  extractVerificationToken
}
